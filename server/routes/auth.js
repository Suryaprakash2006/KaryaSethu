const express = require("express");
const crypto = require("crypto");
const { load, save, nextId } = require("../db");
const { publicUser } = require("../utils");
const requireAuth = require("../middleware/auth");

const router = express.Router();

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

router.post("/signup", (req, res) => {
  const { name, phone, email, password, role } = req.body || {};
  if (!name || !phone || !email || !password || !role) {
    return res.status(400).json({ error: "name, phone, email, password and role are required" });
  }
  if (!["household", "worker"].includes(role)) {
    return res.status(400).json({ error: "role must be household or worker" });
  }

  const db = load();
  const exists = db.users.find((u) => u.email === email || u.phone === phone);
  if (exists) {
    return res.status(409).json({ error: "An account with this email or phone already exists" });
  }

  const passwordSalt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, passwordSalt);
  const user = {
    id: nextId(db),
    name,
    phone,
    email,
    role,
    passwordHash,
    passwordSalt,
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);

  if (role === "worker") {
    db.workerProfiles.push({
      userId: user.id,
      profession: null,
      experienceYears: 0,
      aadhaarNumber: null,
      aadhaarVerified: false,
      federationId: null,
      federationRole: null,
      ratingSum: 0,
      ratingCount: 0,
      wallet: 0,
      onDuty: false,
    });
  }

  save(db);
  res.json({ token: String(user.id), user: publicUser(user) });
});

router.post("/login", (req, res) => {
  const { identifier, password } = req.body || {};
  if (!identifier || !password) {
    return res.status(400).json({ error: "identifier and password are required" });
  }
  const db = load();
  const user = db.users.find((u) => u.email === identifier || u.phone === identifier);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const hash = hashPassword(password, user.passwordSalt);
  const a = Buffer.from(hash);
  const b = Buffer.from(user.passwordHash);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  res.json({ token: String(user.id), user: publicUser(user) });
});

router.post("/federation-login", (req, res) => {
  const { identifier, password } = req.body || {};
  if (!identifier || !password) {
    return res.status(400).json({ error: "identifier and password are required" });
  }

  const db = load();
  const user = db.users.find((u) => u.email === identifier || u.phone === identifier);
  if (!user || user.role !== "worker") {
    return res.status(401).json({ error: "Invalid federation credentials" });
  }

  const profile = db.workerProfiles.find((w) => w.userId === user.id);
  const federation = profile && db.federations.find((f) => f.id === profile.federationId);
  if (!federation || profile.federationRole !== "admin") {
    return res.status(403).json({ error: "Only a federation admin can use federation login" });
  }

  const hash = hashPassword(password, user.passwordSalt);
  const a = Buffer.from(hash);
  const b = Buffer.from(user.passwordHash);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: "Invalid federation credentials" });
  }

  res.json({
    token: `federation:${federation.id}`,
    user: { id: federation.id, name: federation.name, role: "federation", federationId: federation.id },
  });
});

router.get("/me", requireAuth, (req, res) => {
  if (req.user.role === "federation") {
    return res.json({
      user: publicUser(req.user),
      workerProfile: null,
      federation: { id: req.federation.id, name: req.federation.name },
    });
  }

  const db = req.db;
  let workerProfile = null;
  let federation = null;

  if (req.user.role === "worker") {
    workerProfile = db.workerProfiles.find((w) => w.userId === req.user.id) || null;
    if (workerProfile && workerProfile.federationId) {
      const fed = db.federations.find((f) => f.id === workerProfile.federationId);
      federation = fed ? { id: fed.id, name: fed.name } : null;
    }
  }

  res.json({ user: publicUser(req.user), workerProfile, federation });
});

module.exports = router;
