const express = require("express");
const SERVICES = require("../services");

const router = express.Router();

router.get("/", (req, res) => res.json(SERVICES));

module.exports = router;
