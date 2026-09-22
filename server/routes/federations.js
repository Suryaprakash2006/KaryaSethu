const express = require("express");
const { load, save, nextId } = require("../db");
const { publicUser } = require("../utils");
const requireAuth = require("../middleware/auth");

const router = express.Router();

function summarize(f, db) {
  const memberCount = db.workerProfiles.filter((w) => w.federationId === f.id).length;
  return {
    id: f.id,
    name: f.name,
    adminUserId: f.adminUserId,
    memberCount,
    welfareFund: f.welfareFund,
    maintenanceFund: f.maintenanceFund,
    createdAt: f.createdAt,
  };
}

function isAdminOf(db, userId, fedId) {
  const profile = db.workerProfiles.find((w) => w.userId === userId);
  return !!profile && profile.federationId === fedId && profile.federationRole === "admin";
}

function isFederationAdmin(req, fedId) {
  return req.user.role === "federation" ? req.user.id === fedId : isAdminOf(req.db, req.user.id, fedId);
}

router.get("/", (req, res) => {
  const db = load();
  res.json(db.federations.map((f) => summarize(f, db)));
});

router.post("/", requireAuth, (req, res) => {
  if (req.user.role !== "worker") {
    return res.status(403).json({ error: "Only worker accounts can start a federation" });
  }
  const { name } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: "Federation name is required" });

  const db = req.db;
  const profile = db.workerProfiles.find((w) => w.userId === req.user.id);
  if (profile.federationId) return res.status(409).json({ error: "You already belong to a federation" });

  const federation = {
    id: nextId(db),
    name: name.trim(),
    adminUserId: req.user.id,
    welfareFund: 0,
    maintenanceFund: 0,
    welfareLedger: [],
    announcements: [],
    createdAt: new Date().toISOString(),
  };
  db.federations.push(federation);
  profile.federationId = federation.id;
  profile.federationRole = "admin";

  save(db);
  res.json(summarize(federation, db));
});

router.post("/:id/join", requireAuth, (req, res) => {
  if (req.user.role !== "worker") {
    return res.status(403).json({ error: "Only worker accounts can join a federation" });
  }
  const fedId = Number(req.params.id);
  const db = req.db;
  const federation = db.federations.find((f) => f.id === fedId);
  if (!federation) return res.status(404).json({ error: "Federation not found" });

  const profile = db.workerProfiles.find((w) => w.userId === req.user.id);
  if (profile.federationId) return res.status(409).json({ error: "You already belong to a federation" });

  const existing = db.joinRequests.find(
    (r) => r.userId === req.user.id && r.federationId === fedId && r.status === "pending"
  );
  if (existing) return res.status(409).json({ error: "You already have a pending request for this federation" });

  const request = {
    id: nextId(db),
    userId: req.user.id,
    federationId: fedId,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  db.joinRequests.push(request);
  save(db);
  res.json(request);
});

router.get("/:id", requireAuth, (req, res) => {
  const fedId = Number(req.params.id);
  const db = req.db;
  const federation = db.federations.find((f) => f.id === fedId);
  if (!federation) return res.status(404).json({ error: "Federation not found" });

  const isAdmin = isFederationAdmin(req, fedId);
  const isMember = db.workerProfiles.some((w) => w.userId === req.user.id && w.federationId === fedId);

  const members = db.workerProfiles
    .filter((w) => w.federationId === fedId)
    .map((w) => {
      const u = db.users.find((x) => x.id === w.userId);
      return {
        userId: w.userId,
        name: u ? u.name : "Unknown",
        profession: w.profession,
        role: w.federationRole,
        wallet: w.wallet,
        rating: w.ratingCount ? Number((w.ratingSum / w.ratingCount).toFixed(1)) : null,
        ratingCount: w.ratingCount,
        onDuty: w.onDuty,
      };
    });

  const pendingRequests = isAdmin
    ? db.joinRequests
      .filter((r) => r.federationId === fedId && r.status === "pending")
      .map((r) => ({ ...r, user: publicUser(db.users.find((u) => u.id === r.userId)) }))
    : [];

  const disputes = isAdmin ? db.disputes.filter((d) => d.federationId === fedId) : [];

  res.json({
    ...summarize(federation, db),
    announcements: federation.announcements,
    welfareLedger: isAdmin ? federation.welfareLedger : [],
    members: isAdmin || isMember ? members : [],
    pendingRequests,
    disputes,
  });
});

router.post("/:id/join-requests/:reqId/:decision", requireAuth, (req, res) => {
  const fedId = Number(req.params.id);
  const reqId = Number(req.params.reqId);
  const decision = req.params.decision;
  if (!["approve", "reject"].includes(decision)) {
    return res.status(400).json({ error: "Invalid decision" });
  }

  const db = req.db;
  if (!isFederationAdmin(req, fedId)) {
    return res.status(403).json({ error: "Only the federation admin can do this" });
  }

  const request = db.joinRequests.find((r) => r.id === reqId && r.federationId === fedId);
  if (!request || request.status !== "pending") {
    return res.status(404).json({ error: "Request not found" });
  }

  request.status = decision === "approve" ? "approved" : "rejected";
  if (decision === "approve") {
    const profile = db.workerProfiles.find((w) => w.userId === request.userId);
    profile.federationId = fedId;
    profile.federationRole = "member";
  }

  save(db);
  res.json(request);
});

router.post("/:id/announcements", requireAuth, (req, res) => {
  const fedId = Number(req.params.id);
  const { text } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ error: "Announcement text is required" });

  const db = req.db;
  if (!isFederationAdmin(req, fedId)) {
    return res.status(403).json({ error: "Only the federation admin can post announcements" });
  }

  const federation = db.federations.find((f) => f.id === fedId);
  const announcement = { id: nextId(db), text: text.trim(), createdAt: new Date().toISOString() };
  federation.announcements.unshift(announcement);

  save(db);
  res.json(announcement);
});

router.post("/:id/welfare/disburse", requireAuth, (req, res) => {
  const fedId = Number(req.params.id);
  const { amount, note } = req.body || {};
  const db = req.db;

  if (!isFederationAdmin(req, fedId)) {
    return res.status(403).json({ error: "Only the federation admin can disburse funds" });
  }

  const federation = db.federations.find((f) => f.id === fedId);
  const amt = Number(amount);
  if (!amt || amt <= 0) return res.status(400).json({ error: "Enter a valid amount" });
  if (amt > federation.welfareFund) return res.status(400).json({ error: "Amount exceeds the welfare fund balance" });

  federation.welfareFund -= amt;
  const entry = {
    id: nextId(db),
    amount: amt,
    note: note && note.trim() ? note.trim() : "Welfare disbursement",
    createdAt: new Date().toISOString(),
  };
  federation.welfareLedger.unshift(entry);

  save(db);
  res.json({ welfareFund: federation.welfareFund, entry });
});

router.post("/:id/disputes/:disputeId/resolve", requireAuth, (req, res) => {
  const fedId = Number(req.params.id);
  const disputeId = Number(req.params.disputeId);
  const { resolution } = req.body || {};
  const db = req.db;

  if (!isFederationAdmin(req, fedId)) {
    return res.status(403).json({ error: "Only the federation admin can resolve disputes" });
  }

  const dispute = db.disputes.find((d) => d.id === disputeId && d.federationId === fedId);
  if (!dispute) return res.status(404).json({ error: "Dispute not found" });

  dispute.status = "resolved";
  dispute.resolution = resolution || "Resolved by federation";

  save(db);
  res.json(dispute);
});

module.exports = router;
