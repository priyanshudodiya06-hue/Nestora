const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  publicId: { type: Number, unique: true, index: true },
  name: { type: String, required: true, trim: true },
  category: { type: String, enum: ["Furniture", "Appliances"], required: true },
  monthlyRent: { type: Number, required: true, min: 0 },
  securityDeposit: { type: Number, required: true, min: 0 },
  tenureOptions: [{ type: Number, min: 1 }],
  image: String,
  rating: { type: Number, default: 0 },
  description: String,
  inventory: { type: Number, default: 0, min: 0 },
  rentedUnits: { type: Number, default: 0, min: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true, select: false },
  phone: String,
  role: { type: String, enum: ["customer", "vendor", "admin"], default: "customer" },
  serviceArea: String
}, { timestamps: true });

const rentalItemSchema = new mongoose.Schema({
  productId: Number,
  name: String,
  quantity: { type: Number, min: 1 },
  monthlyRent: Number,
  securityDeposit: Number,
  tenure: Number
}, { _id: false });

const rentalSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  userId: String,
  customerName: String,
  phone: String,
  items: [rentalItemSchema],
  delivery: {
    address: String,
    city: String,
    pinCode: String,
    date: Date,
    timeSlot: String
  },
  pickup: { date: Date, timeSlot: String, status: String },
  status: {
    type: String,
    enum: ["confirmed", "scheduled", "delivered", "active", "pickup-requested", "returned", "cancelled"],
    default: "confirmed"
  },
  monthlyRecurringRevenue: Number,
  depositTotal: Number,
  startedAt: Date,
  endedAt: Date
}, { timestamps: true });

const maintenanceSchema = new mongoose.Schema({
  rentalId: String,
  userId: String,
  productId: Number,
  issue: { type: String, required: true },
  priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  status: { type: String, enum: ["open", "assigned", "resolved"], default: "open" },
  assignedTo: String,
  resolvedAt: Date
}, { timestamps: true });

const businessSchema = new mongoose.Schema({
  name: String,
  skillType: String,
  servicesOffered: [String],
  productList: [Number],
  pricing: { type: Map, of: Number },
  serviceAreas: [String]
}, { timestamps: true });

module.exports = {
  Product: mongoose.model("Product", productSchema),
  User: mongoose.model("User", userSchema),
  Rental: mongoose.model("Rental", rentalSchema),
  Maintenance: mongoose.model("Maintenance", maintenanceSchema),
  Business: mongoose.model("Business", businessSchema)
};
