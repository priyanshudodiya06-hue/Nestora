require("dotenv").config();
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const seed = require("./seed-data");
const { Product, User, Rental, Maintenance, Business } = require("./models");

const app = express();
const port = Number(process.env.PORT) || 3000;
let databaseReady = false;
let offlineMode = false;
let offlineStore;

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const orderNumber = () => `NSR-${Date.now().toString().slice(-8)}`;
const hashPassword = password => {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
};
const passwordMatches = (password, stored) => {
  const [salt, savedHash] = String(stored || "").split(":");
  if (!salt || !savedHash) return false;
  const suppliedHash = crypto.scryptSync(password, salt, 64);
  const savedBuffer = Buffer.from(savedHash, "hex");
  return savedBuffer.length === suppliedHash.length && crypto.timingSafeEqual(savedBuffer, suppliedHash);
};
const now = () => new Date();
const toPlain = value => JSON.parse(JSON.stringify(value));
const objectId = () => crypto.randomBytes(12).toString("hex");
const fieldValue = (entry, field) => field.split(".").reduce((value, key) => value?.[key], entry);
const matchesQuery = (entry, query = {}) => Object.entries(query).every(([key, value]) => {
  if (key === "$expr" && value?.$gt) {
    const [left, right] = value.$gt.map(field => fieldValue(entry, String(field).replace(/^\$/, "")) || 0);
    return left > right;
  }
  const current = fieldValue(entry, key);
  if (value && typeof value === "object" && !(value instanceof RegExp) && !Array.isArray(value)) {
    if ("$ne" in value && current === value.$ne) return false;
    if ("$in" in value && !value.$in.includes(current)) return false;
    if ("$regex" in value) return new RegExp(value.$regex, value.$options || "").test(String(current || ""));
    return true;
  }
  return current === value;
});
const chain = records => {
  let result = [...records];
  const api = {
    sort(sorter) {
      const [[field, direction]] = Object.entries(sorter || {});
      result.sort((a, b) => (fieldValue(a, field) > fieldValue(b, field) ? 1 : -1) * direction);
      return api;
    },
    select() { return api; },
    lean() { return Promise.resolve(toPlain(result)); },
    then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); }
  };
  return api;
};
const singleChain = records => {
  let result = [...records];
  const api = {
  sort(sorter) {
    const [[field, direction]] = Object.entries(sorter || {});
    result.sort((a, b) => (fieldValue(a, field) > fieldValue(b, field) ? 1 : -1) * direction);
    return api;
  },
  select() { return this; },
  lean() { return Promise.resolve(result[0] ? toPlain(result[0]) : null); },
  then(resolve, reject) { return Promise.resolve(result[0] || null).then(resolve, reject); }
  };
  return api;
};
const withMeta = record => ({ _id: objectId(), createdAt: now(), updatedAt: now(), ...record });
const saveOfflineStore = () => {};
const createOfflineModel = collection => ({
  find(query = {}) {
    return chain(offlineStore[collection].filter(entry => matchesQuery(entry, query)));
  },
  findOne(query = {}) {
    return singleChain(offlineStore[collection].filter(entry => matchesQuery(entry, query)));
  },
  async create(record) {
    if (collection === "users" && offlineStore.users.some(user => user.email === record.email)) {
      throw Object.assign(new Error("Duplicate email"), { code: 11000 });
    }
    const created = withMeta(record);
    offlineStore[collection].push(created);
    saveOfflineStore();
    return toPlain(created);
  },
  async findOneAndUpdate(query, update) {
    const record = offlineStore[collection].find(entry => matchesQuery(entry, query));
    if (!record) return null;
    Object.assign(record, update, { updatedAt: now() });
    saveOfflineStore();
    return toPlain(record);
  },
  async findById(id) {
    const record = offlineStore[collection].find(entry => String(entry._id) === String(id));
    if (!record) return null;
    return {
      ...record,
      async save() {
        record.updatedAt = now();
        saveOfflineStore();
        return toPlain(record);
      }
    };
  },
  async findByIdAndUpdate(id, update) {
    const record = offlineStore[collection].find(entry => String(entry._id) === String(id));
    if (!record) return null;
    Object.assign(record, update, { updatedAt: now() });
    saveOfflineStore();
    return toPlain(record);
  },
  async bulkWrite(operations) {
    operations.forEach(operation => {
      const update = operation.updateOne;
      const existing = offlineStore[collection].find(entry => matchesQuery(entry, update.filter));
      if (!existing && update.upsert) offlineStore[collection].push(withMeta(update.update.$setOnInsert));
    });
  },
  async updateOne(filter, update, options = {}) {
    const existing = offlineStore[collection].find(entry => matchesQuery(entry, filter));
    if (existing) return;
    if (options.upsert) offlineStore[collection].push(withMeta(update.$setOnInsert || update.$set || update));
  }
});
const enableOfflineDatabase = () => {
  offlineMode = true;
  offlineStore = {
    products: seed.products.map(product => withMeta({ active: true, ...product })),
    users: [],
    rentals: [],
    maintenances: [],
    businesses: [withMeta(seed.business)]
  };
  Object.assign(Product, createOfflineModel("products"));
  Object.assign(User, createOfflineModel("users"));
  Object.assign(Rental, createOfflineModel("rentals"));
  Object.assign(Maintenance, createOfflineModel("maintenances"));
  Object.assign(Business, createOfflineModel("businesses"));
};

app.get("/api/health", (req, res) => res.status(databaseReady ? 200 : 503).json({
  ok: databaseReady,
  offlineMode,
  database: databaseReady ? (offlineMode ? "offline-memory" : "connected") : "disconnected"
}));


app.get("/api/products", asyncRoute(async (req, res) => {
  const { category, search, available } = req.query;
  const query = { active: { $ne: false } };
  if (category && category !== "All") query.category = category;
  if (search) query.name = { $regex: String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  if (available === "true") query.$expr = { $gt: ["$inventory", "$rentedUnits"] };
  res.json(await Product.find(query).lean());
}));


app.get("/api/products/:id", asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const product = await Product.findOne({ publicId: id }).lean();
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
}));


app.post("/api/products", asyncRoute(async (req, res) => {
  const required = ["name", "category", "monthlyRent", "securityDeposit"];
  if (required.some(field => req.body[field] === undefined)) return res.status(400).json({ error: "Missing required product fields" });
  const latest = await Product.findOne().sort({ publicId: -1 }).select("publicId").lean();
  const product = await Product.create({ ...req.body, publicId: req.body.publicId || (latest?.publicId || 0) + 1, active: true });
  res.status(201).json(product);
}));


app.patch("/api/products/:id", asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const product = await Product.findOneAndUpdate({ publicId: id }, { ...req.body, publicId: id }, { new: true, runValidators: true });
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
}));


app.post("/api/users", asyncRoute(async (req, res) => {
  if (!req.body.name || !req.body.email || !req.body.password) return res.status(400).json({ error: "Name, email and password are required" });
  const user = await User.create({ ...req.body, email: req.body.email.trim().toLowerCase(), passwordHash: hashPassword(req.body.password) });
  res.status(201).json({ _id: user._id, name: user.name, email: user.email, role: user.role });
}));

app.post("/api/login", asyncRoute(async (req, res) => {
  const user = await User.findOne({ email: String(req.body.email || "").trim().toLowerCase() }).select("+passwordHash");
  if (!user || !passwordMatches(String(req.body.password || ""), user.passwordHash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  res.json({ _id: user._id, name: user.name, email: user.email, role: user.role });
}));


app.post("/api/rentals", asyncRoute(async (req, res) => {
  const { customerName, phone, items, delivery } = req.body;
  if (!customerName || !phone || !items?.length || !delivery?.date || !delivery?.city) return res.status(400).json({ error: "Customer, product and delivery details are required" });
  const productSource = await Product.find({ publicId: { $in: items.map(item => item.productId) } }).lean();

  const normalizedItems = items.map(item => {
    const product = productSource.find(entry => (entry.publicId || entry.id) === item.productId);
    if (!product) throw Object.assign(new Error(`Product ${item.productId} not found`), { status: 400 });
    return { productId: item.productId, name: product.name, quantity: item.quantity, tenure: item.tenure, monthlyRent: product.monthlyRent, securityDeposit: product.securityDeposit };
  });
  const rental = {
    orderNumber: orderNumber(), customerName, phone, userId: req.body.userId,
    items: normalizedItems, delivery, status: "scheduled",
    monthlyRecurringRevenue: normalizedItems.reduce((sum, item) => sum + item.monthlyRent * item.quantity, 0),
    depositTotal: normalizedItems.reduce((sum, item) => sum + item.securityDeposit * item.quantity, 0)
  };
  res.status(201).json(await Rental.create(rental));
}));


app.get("/api/rentals", asyncRoute(async (req, res) => {
  const userId = req.query.userId;
  res.json(await Rental.find(userId ? { userId } : {}).sort({ createdAt: -1 }).lean());
}));


app.post("/api/rentals/:id/pickup", asyncRoute(async (req, res) => {
  if (!req.body.date || !req.body.timeSlot) return res.status(400).json({ error: "Pickup date and time slot are required" });
  const pickup = { ...req.body, status: "scheduled" };
  const rental = await Rental.findById(req.params.id);
  if (!rental) return res.status(404).json({ error: "Rental not found" });
  rental.pickup = pickup;
  rental.status = "pickup-requested";
  await rental.save();
  res.json(rental);
}));


app.post("/api/maintenance", asyncRoute(async (req, res) => {
  if (!req.body.rentalId || !req.body.issue) return res.status(400).json({ error: "Rental and issue details are required" });
  const request = await Maintenance.create({ ...req.body, status: "open" });
  res.status(201).json(request);
}));


app.patch("/api/maintenance/:id", asyncRoute(async (req, res) => {
  if (req.body.status === "resolved" && !req.body.resolvedAt) req.body.resolvedAt = new Date();
  const request = await Maintenance.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!request) return res.status(404).json({ error: "Request not found" });
  res.json(request);
}));


app.get("/api/business", asyncRoute(async (req, res) => res.json(await Business.findOne().lean())));


app.get("/api/admin/kpis", asyncRoute(async (req, res) => {
  const [rentals, products, requests] = await Promise.all([
    Rental.find().lean(), Product.find().lean(), Maintenance.find().lean()
  ]);
  const activeStatuses = new Set(["delivered", "active", "pickup-requested"]);
  const activeRentals = rentals.filter(rental => activeStatuses.has(rental.status));
  const totalUnits = products.reduce((sum, product) => sum + (product.inventory || 0), 0);
  const rentedUnits = products.reduce((sum, product) => sum + (product.rentedUnits || 0), 0);
  const resolved = requests.filter(item => item.status === "resolved" && item.resolvedAt);
  const resolutionHours = resolved.length
    ? resolved.reduce((sum, item) => sum + (new Date(item.resolvedAt) - new Date(item.createdAt)) / 36e5, 0) / resolved.length
    : 0;
  const customerIds = rentals.map(item => item.userId).filter(Boolean);
  const repeatIds = new Set(customerIds.filter((id, index) => customerIds.indexOf(id) !== index));
  res.json({
    activeRentals: activeRentals.length,
    mrr: activeRentals.reduce((sum, rental) => sum + (rental.monthlyRecurringRevenue || 0), 0),
    utilizationRate: totalUnits ? Number((rentedUnits / totalUnits * 100).toFixed(1)) : 0,
    retentionRate: new Set(customerIds).size ? Number((repeatIds.size / new Set(customerIds).size * 100).toFixed(1)) : 0,
    averageMaintenanceResolutionHours: Number(resolutionHours.toFixed(1)),
    openMaintenanceRequests: requests.filter(item => item.status !== "resolved").length
  });
}));


app.use("/api", (req, res) => res.status(404).json({ error: "API route not found" }));
app.use((error, req, res, next) => {
  console.error(error);
  if (error?.code === 11000) return res.status(409).json({ error: "That record already exists" });
  res.status(error.status || 500).json({ error: error.message || "Internal server error" });
});

async function start() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing from .env");
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    databaseReady = true;
    await Promise.all([
      Product.bulkWrite(seed.products.map(product => ({
        updateOne: { filter: { publicId: product.publicId }, update: { $setOnInsert: product }, upsert: true }
      }))),
      Business.updateOne({ name: seed.business.name }, { $setOnInsert: seed.business }, { upsert: true })
    ]);
    app.listen(port, () => console.log(`Nestora running at http://localhost:${port} (MongoDB connected)`));
  } catch (error) {
    enableOfflineDatabase();
    databaseReady = true;
    app.listen(port, () => {
      console.warn(`MongoDB unavailable (${error.message}). Using in-memory data.`);
      console.log(`Nestora running at http://localhost:${port} (offline mode)`);
    });
  }
}

start().catch(error => {
  console.error("Unable to start Nestora:", error.message);
  process.exit(1);
});
