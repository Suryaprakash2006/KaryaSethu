const fs = require("fs");
const path = require("path");

// 1. Set the database path. 
// If deployed on Railway, it points to the permanent volume hard drive folder.
// If running locally on your laptop, it falls back to your local folder.
const DB_PATH = process.env.RAILWAY_VOLUME_MOUNT_PATH 
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, "data.json") 
  : path.join(__dirname, "data.json");

// Default blueprint structure for a completely empty database
const empty = {
  users: [],
  workerProfiles: [],
  federations: [],
  joinRequests: [],
  bookings: [],
  disputes: [],
  nextId: 1,
};

function load() {
  // Check if the file is missing from the permanent volume storage
  if (!fs.existsSync(DB_PATH)) {
    // Look for the pre-existing 60k line data.json file that came bundled from GitHub
    const backupPath = path.join(__dirname, "data.json");
    
    if (fs.existsSync(backupPath)) {
      // SUCCESS: Copy your existing 60k lines into the permanent volume so you lose nothing
      fs.writeFileSync(DB_PATH, fs.readFileSync(backupPath, "utf-8"));
      console.log("🚀 Pre-existing data successfully copied to permanent volume storage!");
    } else {
      // FALLBACK: If absolutely no data file is found anywhere, create a fresh empty structure
      fs.writeFileSync(DB_PATH, JSON.stringify(empty, null, 2));
    }
  }

  // Read and return the data from the secure permanent path
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function save(db) {
  // Writes data safely to the permanent volume path
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function nextId(db) {
  const id = db.nextId;
  db.nextId += 1;
  return id;
}

module.exports = { load, save, nextId };
