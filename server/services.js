// Single source of truth for the service catalog. Keys double as a
// worker's "profession" value, so they must match the client's list exactly.
module.exports = {
  Electrician: { task: "Switchboard Repair", price: 300, icon: "Zap" },
  Plumber: { task: "Pipe Leakage Fix", price: 250, icon: "Droplet" },
  Carpenter: { task: "Furniture Repair", price: 400, icon: "Hammer" },
  Painter: { task: "Wall Touch-up", price: 500, icon: "Paintbrush" },
  Mason: { task: "Minor Masonry Repair", price: 450, icon: "BrickWall" },
  Cleaner: { task: "Home Deep Cleaning", price: 600, icon: "Sparkles" },
  ACMechanic: { task: "AC Service", price: 500, icon: "Wind" },
  ApplianceRepair: { task: "Appliance Repair", price: 350, icon: "Wrench" },
  Welder: { task: "Metal Welding Repair", price: 400, icon: "Flame" },
  Tailor: { task: "Clothing Alteration", price: 200, icon: "Scissors" },
};
