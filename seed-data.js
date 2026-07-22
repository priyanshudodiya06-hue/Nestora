const products = [
  { publicId:1, name:"Cloud Comfort Sofa", category:"Furniture", monthlyRent:1299, securityDeposit:2500, tenureOptions:[3,6,12], image:"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=80", rating:4.9, description:"A deep, three-seater sofa with stain-resistant upholstery and soft, supportive cushions.", inventory:80, rentedUnits:55 },
  { publicId:2, name:"Nordic Queen Bed", category:"Furniture", monthlyRent:999, securityDeposit:2000, tenureOptions:[3,6,12], image:"https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80", rating:4.8, description:"Minimal solid-wood queen bed with an orthopedic mattress option.", inventory:74, rentedUnits:48 },
  { publicId:3, name:"Focus Work Desk", category:"Furniture", monthlyRent:449, securityDeposit:800, tenureOptions:[3,6,12], image:"https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=900&q=80", rating:4.7, description:"Compact work desk with cable management and two storage drawers.", inventory:120, rentedUnits:67 },
  { publicId:4, name:"FrostFree Refrigerator", category:"Appliances", monthlyRent:1099, securityDeposit:2200, tenureOptions:[3,6,12], image:"https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=900&q=80", rating:4.9, description:"Energy-efficient 260L double-door refrigerator, ideal for shared homes.", inventory:65, rentedUnits:51 },
  { publicId:5, name:"Smart Wash 7kg", category:"Appliances", monthlyRent:849, securityDeposit:1700, tenureOptions:[3,6,12], image:"https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=900&q=80", rating:4.8, description:"Fully automatic front-load washing machine with quick wash mode.", inventory:62, rentedUnits:44 },
  { publicId:6, name:"Cinema 43” Smart TV", category:"Appliances", monthlyRent:799, securityDeposit:1600, tenureOptions:[3,6,12], image:"https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=900&q=80", rating:4.6, description:"Crisp 4K streaming TV with popular entertainment apps built in.", inventory:90, rentedUnits:59 }
];

const business = {
  name: "Nestora Services",
  skillType: "Furniture and appliance rental operations",
  servicesOffered: ["Delivery", "Installation", "Maintenance", "Relocation", "Pickup"],
  productList: products.map(product => product.publicId),
  pricing: { delivery: 0, installation: 0, relocation: 499 },
  serviceAreas: ["Delhi NCR", "Mumbai", "Bengaluru", "Hyderabad", "Pune"]
};

module.exports = { products, business };
