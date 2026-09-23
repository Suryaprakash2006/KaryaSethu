const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

const DB_PATH = path.join(__dirname, "data.json");
const COLLECTIONS = ["users", "workerProfiles", "federations", "joinRequests", "bookings", "disputes"];
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || "karya_sethu";

const empty = {
  users: [],
  workerProfiles: [],
  federations: [],
  joinRequests: [],
  bookings: [],
  disputes: [],
  nextId: 1,
};

let clientPromise;
let migrationPromise;

function localSnapshot() {
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify(empty, null, 2));
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

async function getDatabase() {
  if (!clientPromise) {
    const client = new MongoClient(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    clientPromise = client.connect().then(() => client.db(MONGO_DB_NAME));
  }
  return clientPromise;
}

async function migrateLegacyData(db) {
  const settings = db.collection("settings");
  const migrated = await settings.findOne({ _id: "legacy-json-migration" });
  if (migrated) return;

  const legacy = localSnapshot();
  for (const name of COLLECTIONS) {
    const collection = db.collection(name);
    const existing = await collection.countDocuments();
    if (existing === 0 && legacy[name]?.length) await collection.insertMany(legacy[name]);
  }
  await settings.updateOne(
    { _id: "counter" },
    { $set: { nextId: legacy.nextId || 1 } },
    { upsert: true }
  );
  await settings.insertOne({ _id: "legacy-json-migration", migratedAt: new Date() });
}

async function initialize() {
  const db = await getDatabase();
  if (!migrationPromise) migrationPromise = migrateLegacyData(db);
  await migrationPromise;
  return db;
}

async function load() {
  const db = await initialize();
  const documents = await Promise.all(COLLECTIONS.map((name) => db.collection(name).find({}).toArray()));
  const settings = await db.collection("settings").findOne({ _id: "counter" });
  return Object.fromEntries([
    ...COLLECTIONS.map((name, index) => [name, documents[index]]),
    ["nextId", settings?.nextId || 1],
  ]);
}

async function save(snapshot) {
  const db = await initialize();
  await Promise.all(
    COLLECTIONS.map(async (name) => {
      const collection = db.collection(name);
      await collection.deleteMany({});
      if (snapshot[name]?.length) await collection.insertMany(snapshot[name]);
    })
  );
  await db.collection("settings").updateOne(
    { _id: "counter" },
    { $set: { nextId: snapshot.nextId } },
    { upsert: true }
  );
}

function nextId(snapshot) {
  const id = snapshot.nextId;
  snapshot.nextId += 1;
  return id;
}

module.exports = { initialize, load, save, nextId };

