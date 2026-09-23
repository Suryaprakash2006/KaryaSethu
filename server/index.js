require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { initialize } = require("./db");

const app = express();
app.use(cors());
app.use(express.json({ limit: "6mb" })); // 6mb to comfortably fit a base64 photo

app.use("/api/auth", require("./routes/auth"));
app.use("/api/services", require("./routes/services"));
app.use("/api/federations", require("./routes/federations"));
app.use("/api/bookings", require("./routes/bookings"));
app.use("/api/worker", require("./routes/worker"));

app.get("/api/health", (req, res) => res.json({ ok: true }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server" });
});

const PORT = process.env.PORT || 4000;
initialize()
  .then(() => app.listen(PORT, () => console.log(`Karya Sethu API running on http://localhost:${PORT}`)))
  .catch((error) => {
    console.error("Unable to connect to MongoDB", error);
    process.exit(1);
  });
