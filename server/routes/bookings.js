const express = require("express");
const { save, nextId } = require("../db");
const { assignCandidate } = require("../matching");
const SERVICES = require("../services");
const requireAuth = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

function canView(db, user, booking) {
  if (booking.householdUserId === user.id) return true;
  if (booking.assignedWorkerId === user.id) return true;
  const profile = db.workerProfiles.find((w) => w.userId === user.id);
  if (profile && profile.federationRole === "admin") {
    const assignedProfile = db.workerProfiles.find((w) => w.userId === booking.assignedWorkerId);
    if (assignedProfile && assignedProfile.federationId === profile.federationId) return true;
  }
  return false;
}

router.post("/", async (req, res, next) => {
  try {
    if (req.user.role !== "household") {
      return res.status(403).json({ error: "Only household accounts can book services" });
    }
    const { service, description, imageDataUrl } = req.body || {};
    if (!service || !SERVICES[service]) return res.status(400).json({ error: "Select a valid service" });
    if (!description || !description.trim()) return res.status(400).json({ error: "Describe the problem before booking" });

    const db = req.db;
    const booking = {
      id: nextId(db),
      householdUserId: req.user.id,
      service,
      task: SERVICES[service].task,
      description: description.trim(),
      imageDataUrl: imageDataUrl || null,
      status: "requested",
      baseServicePrice: SERVICES[service].price,
      extraExpenses: [],
      estimatedCost: SERVICES[service].price,
      assignedWorkerId: null,
      distanceKm: null,
      review: null,
      paymentSplit: null,
      createdAt: new Date().toISOString(),
    };
    assignCandidate(db, booking, null);
    db.bookings.push(booking);

    await save(db);
    res.json(booking);
  } catch (error) {
    next(error);
  }
});

router.get("/mine", async (req, res, next) => {
  try {
    const db = req.db;
    const bookings = db.bookings
      .filter((b) => b.householdUserId === req.user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(bookings);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const db = req.db;
    const booking = db.bookings.find((b) => b.id === Number(req.params.id));
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (!canView(db, req.user, booking)) return res.status(403).json({ error: "Not authorized to view this booking" });

    const worker = booking.assignedWorkerId ? db.users.find((u) => u.id === booking.assignedWorkerId) : null;
    res.json({ ...booking, workerName: worker ? worker.name : null });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/approve-estimate", async (req, res, next) => {
  try {
    const db = req.db;
    const booking = db.bookings.find((b) => b.id === Number(req.params.id) && b.householdUserId === req.user.id);
    if (!booking || booking.status !== "awaiting_approval") {
      return res.status(400).json({ error: "No estimate to approve" });
    }
    booking.status = "in_progress";
    await save(db);
    res.json(booking);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/pay", async (req, res, next) => {
  try {
    const db = req.db;
    const booking = db.bookings.find((b) => b.id === Number(req.params.id) && b.householdUserId === req.user.id);
    if (!booking || booking.status !== "completed") {
      return res.status(400).json({ error: "This job is not ready for payment" });
    }

    const total = booking.estimatedCost;
    const workerShare = Math.round(total * 0.85);
    const welfareShare = Math.round(total * 0.1);
    const maintenanceShare = total - workerShare - welfareShare;

    const workerProfile = db.workerProfiles.find((w) => w.userId === booking.assignedWorkerId);
    workerProfile.wallet += workerShare;

    const federation = db.federations.find((f) => f.id === workerProfile.federationId);
    if (federation) {
      federation.welfareFund += welfareShare;
      federation.maintenanceFund += maintenanceShare;
    }

    booking.status = "paid";
    booking.paidAt = new Date().toISOString();
    booking.paymentSplit = { workerShare, welfareShare, maintenanceShare, total };

    await save(db);
    res.json(booking);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/review", async (req, res, next) => {
  try {
    const { rating, comment } = req.body || {};
    const r = Number(rating);
    if (!r || r < 1 || r > 5) return res.status(400).json({ error: "Rating must be between 1 and 5" });

    const db = req.db;
    const booking = db.bookings.find((b) => b.id === Number(req.params.id) && b.householdUserId === req.user.id);
    if (!booking || booking.status !== "paid") {
      return res.status(400).json({ error: "This job cannot be reviewed yet" });
    }

    booking.review = { rating: r, comment: comment || "", createdAt: new Date().toISOString() };
    booking.status = "reviewed";

    const workerProfile = db.workerProfiles.find((w) => w.userId === booking.assignedWorkerId);
    workerProfile.ratingSum += r;
    workerProfile.ratingCount += 1;

    await save(db);
    res.json(booking);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/dispute", async (req, res, next) => {
  try {
    const { description } = req.body || {};
    if (!description || !description.trim()) return res.status(400).json({ error: "Describe the dispute" });

    const db = req.db;
    const booking = db.bookings.find((b) => b.id === Number(req.params.id));
    if (!booking || !canView(db, req.user, booking)) return res.status(404).json({ error: "Booking not found" });

    const workerProfile = db.workerProfiles.find((w) => w.userId === booking.assignedWorkerId);
    const dispute = {
      id: nextId(db),
      bookingId: booking.id,
      raisedBy: req.user.id,
      federationId: workerProfile ? workerProfile.federationId : null,
      description: description.trim(),
      status: "open",
      createdAt: new Date().toISOString(),
    };
    db.disputes.push(dispute);

    await save(db);
    res.json(dispute);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
