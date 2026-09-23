const { getDatabase, load } = require("../db");

// Prototype-grade auth: the token is just the user's id. This is NOT
// secure and must never be used in production - it's here purely so the
// hackathon demo can log in as multiple people (household / worker /
// federation admin) from different browser tabs.
module.exports = async function requireAuth(req, res, next) {
  const startedAt = process.hrtime.bigint();
  const logTiming = (label, detail) => {
    if (process.env.PERF_LOG === "1") {
      const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      console.log(`[perf] auth ${label} ${elapsedMs.toFixed(1)}ms${detail ? ` ${detail}` : ""}`);
    }
  };
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    if (req.baseUrl.includes("/auth")) {
      const database = await getDatabase();
      logTiming("database-ready");
      if (token.startsWith("federation:")) {
        const federationId = Number(token.slice("federation:".length));
        const federation = await database.collection("federations").findOne(
          { id: federationId },
          { projection: { _id: 0 } }
        );
        logTiming("federation-query");
        if (!federation) return res.status(401).json({ error: "Invalid session" });
        req.federation = federation;
        req.user = { id: federation.id, name: federation.name, email: federation.loginEmail, role: "federation" };
        req.db = { users: [], workerProfiles: [], federations: [federation], nextId: 1 };
        return next();
      }

      const user = await database.collection("users").findOne(
        { id: Number(token) },
        { projection: { _id: 0 } }
      );
      logTiming("user-query");
      if (!user) return res.status(401).json({ error: "Invalid session" });
      const profile = await database.collection("workerProfiles").findOne(
        { userId: user.id },
        { projection: { _id: 0 } }
      );
      const federation = profile?.federationId
        ? await database.collection("federations").findOne(
          { id: profile.federationId },
          { projection: { _id: 0 } }
        )
        : null;
      logTiming("profile-federation-query");
      req.user = user;
      req.db = {
        users: [user],
        workerProfiles: profile ? [profile] : [],
        federations: federation ? [federation] : [],
        nextId: 1,
      };
      return next();
    }

    const scope = req.baseUrl.includes("/bookings")
      ? ["users", "workerProfiles", "federations", "bookings", "disputes"]
      : req.baseUrl.includes("/worker")
        ? ["users", "workerProfiles", "federations", "bookings"]
        : ["users", "workerProfiles", "federations", "joinRequests", "disputes"];
    const db = await load(scope);
    req.db = db;

    if (token.startsWith("federation:")) {
      const federationId = Number(token.slice("federation:".length));
      const federation = db.federations.find((f) => f.id === federationId);
      if (!federation) return res.status(401).json({ error: "Invalid session" });
      req.federation = federation;
      req.user = { id: federation.id, name: federation.name, email: federation.loginEmail, role: "federation" };
      return next();
    }

    const user = db.users.find((u) => String(u.id) === token);
    if (!user) return res.status(401).json({ error: "Invalid session" });

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};
