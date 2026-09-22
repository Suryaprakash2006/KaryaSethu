const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "data.json");

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
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(empty, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function save(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function nextId(db) {
  const id = db.nextId;
  db.nextId += 1;
  return id;
}

module.exports = { load, save, nextId };

