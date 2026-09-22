const { load } = require("../db");

// Prototype-grade auth: the token is just the user's id. This is NOT
// secure and must never be used in production - it's here purely so the
// hackathon demo can log in as multiple people (household / worker /
// federation admin) from different browser tabs.
module.exports = function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  const db = load();
  if (token.startsWith("federation:")) {
    const federationId = Number(token.slice("federation:".length));
    const federation = db.federations.find((f) => f.id === federationId);
    if (!federation) return res.status(401).json({ error: "Invalid session" });
    req.federation = federation;
    req.user = { id: federation.id, name: federation.name, email: federation.loginEmail, role: "federation" };
    req.db = db;
    return next();
  }

  const user = db.users.find((u) => String(u.id) === token);
  if (!user) return res.status(401).json({ error: "Invalid session" });

  req.user = user;
  req.db = db;
  next();
};
