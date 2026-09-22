const express = require("express");
const { save } = require("../db");
const { assignCandidate } = require("../matching");
const requireAuth = require("../middleware/auth");

const router = express.Router();

function requireWorker(req, res, next) {
  if (req.user.role !== "worker") return res.status(403).json({ error: "Worker account required" });
  next();
}
router.use(requireAuth, requireWorker);

function getProfile(db, userId) {
  return db.workerProfiles.find((w) => w.userId === userId);
}

function findBooking(db, id, workerId) {
  return db.bookings.find((b) => b.id === id && b.assignedWorkerId === workerId);
}

router.put("/profile", (req, res) => {
  const { profession, experienceYears } = req.body || {};
  const db = req.db;
  const profile = getProfile(db, req.user.id);
  if (profession) profile.profession = profession;
  if (experienceYears !== undefined) profile.experienceYears = Number(experienceYears) || 0;
  save(db);
  res.json(profile);
});

router.post("/aadhaar-verify", (req, res) => {
  const { aadhaarNumber } = req.body || {};
  const digits = (aadhaarNumber || "").replace(/\s/g, "");
  if (digits.length !== 12 || !/^\d+$/.test(digits)) {
    return res.status(400).json({ error: "Enter a valid 12-digit Aadhaar number" });
  }
  const db = req.db;
  const profile = getProfile(db, req.user.id);
  profile.aadhaarNumber = `XXXX XXXX ${digits.slice(-4)}`;
  profile.aadhaarVerified = true;
  save(db);
  res.json(profile);
});

router.patch("/duty", (req, res) => {
  const { onDuty } = req.body || {};
  const db = req.db;
  const profile = getProfile(db, req.user.id);
  if (onDuty) {
    if (!profile.aadhaarVerified) return res.status(400).json({ error: "Complete Aadhaar verification first" });
    if (!profile.profession) return res.status(400).json({ error: "Complete your profession details first" });
    if (!profile.federationId) return res.status(400).json({ error: "Join a federation before going on duty" });
  }
  profile.onDuty = !!onDuty;
  save(db);
  res.json(profile);
});

router.get("/incoming", (req, res) => {
  const db = req.db;
  res.json(db.bookings.filter((b) => b.assignedWorkerId === req.user.id && b.status === "assigned"));
});

router.get("/active", (req, res) => {
  const db = req.db;
  res.json(
    db.bookings.filter(
      (b) => b.assignedWorkerId === req.user.id && ["accepted", "awaiting_approval", "in_progress"].includes(b.status)
    )
  );
});

router.get("/history", (req, res) => {
  const db = req.db;
  res.json(
    db.bookings
      .filter((b) => b.assignedWorkerId === req.user.id && ["completed", "paid", "reviewed"].includes(b.status))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  );
});

router.post("/bookings/:id/accept", (req, res) => {
  const db = req.db;
  const booking = findBooking(db, Number(req.params.id), req.user.id);
  if (!booking || booking.status !== "assigned") return res.status(400).json({ error: "Job not available to accept" });
  booking.status = "accepted";
  save(db);
  res.json(booking);
});

router.post("/bookings/:id/decline", (req, res) => {
  const db = req.db;
  const booking = findBooking(db, Number(req.params.id), req.user.id);
  if (!booking || booking.status !== "assigned") return res.status(400).json({ error: "Job not available to decline" });
  assignCandidate(db, booking, req.user.id);
  save(db);
  res.json(booking);
});

router.post("/bookings/:id/expenses", (req, res) => {
  const { label, amount } = req.body || {};
  const db = req.db;
  const booking = findBooking(db, Number(req.params.id), req.user.id);
  if (!booking || !["accepted", "awaiting_approval"].includes(booking.status)) {
    return res.status(400).json({ error: "Cannot add expenses at this stage" });
  }
  const amt = Number(amount);
  if (!label || !amt || amt <= 0) return res.status(400).json({ error: "Enter a valid expense label and amount" });

  booking.extraExpenses.push({ label, amount: amt });
  booking.estimatedCost = booking.baseServicePrice + booking.extraExpenses.reduce((s, e) => s + e.amount, 0);
  save(db);
  res.json(booking);
});

router.post("/bookings/:id/send-estimate", (req, res) => {
  const db = req.db;
  const booking = findBooking(db, Number(req.params.id), req.user.id);
  if (!booking || booking.status !== "accepted") return res.status(400).json({ error: "Cannot send estimate at this stage" });
  if (booking.extraExpenses.length === 0) return res.status(400).json({ error: "Add at least one expense before sending an estimate" });
  booking.status = "awaiting_approval";
  save(db);
  res.json(booking);
});

router.post("/bookings/:id/start", (req, res) => {
  const db = req.db;
  const booking = findBooking(db, Number(req.params.id), req.user.id);
  if (!booking || booking.status !== "accepted") return res.status(400).json({ error: "Cannot start work at this stage" });
  booking.status = "in_progress";
  save(db);
  res.json(booking);
});

router.post("/bookings/:id/complete", (req, res) => {
  const db = req.db;
  const booking = findBooking(db, Number(req.params.id), req.user.id);
  if (!booking || booking.status !== "in_progress") return res.status(400).json({ error: "Cannot complete at this stage" });
  booking.status = "completed";
  save(db);
  res.json(booking);
});

module.exports = router;
