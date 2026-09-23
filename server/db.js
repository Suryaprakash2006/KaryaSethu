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
let indexesPromise;

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
  if (!indexesPromise) indexesPromise = createIndexes(db);
  await indexesPromise;
  return db;
}

async function createIndexes(db) {
  await Promise.all([
    db.collection("users").createIndex({ id: 1 }, { unique: true }),
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("users").createIndex({ phone: 1 }, { unique: true }),
    db.collection("workerProfiles").createIndex({ userId: 1 }, { unique: true }),
    db.collection("workerProfiles").createIndex({ federationId: 1 }),
    db.collection("bookings").createIndex({ id: 1 }, { unique: true }),
    db.collection("bookings").createIndex({ householdUserId: 1, createdAt: -1 }),
    db.collection("bookings").createIndex({ assignedWorkerId: 1, status: 1 }),
    db.collection("federations").createIndex({ id: 1 }, { unique: true }),
    db.collection("joinRequests").createIndex({ federationId: 1, status: 1 }),
    db.collection("disputes").createIndex({ federationId: 1, status: 1 }),
  ]);
}

async function load(collectionNames = COLLECTIONS) {
  const db = await initialize();
  const documents = await Promise.all(
    collectionNames.map((name) => db.collection(name).find({}, { projection: { _id: 0 } }).toArray())
  );
  const settings = await db.collection("settings").findOne({ _id: "counter" });
  return Object.fromEntries([
    ...collectionNames.map((name, index) => [name, documents[index]]),
    ["nextId", settings?.nextId || 1],
  ]);
}

async function save(snapshot) {
  const db = await initialize();
  await Promise.all(
    COLLECTIONS.filter((name) => Object.prototype.hasOwnProperty.call(snapshot, name)).map(async (name) => {
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

module.exports = { initialize, load, save, nextId, getDatabase };

