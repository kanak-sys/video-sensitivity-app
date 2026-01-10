const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const { generateReport } = require("../controllers/reportController");

router.get("/download", auth, generateReport);

module.exports = router;
