const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth");
const { generateReport, generateVideoReport } = require("../controllers/reportController");

// Get comprehensive report for all videos
router.get("/", auth, generateReport);

// Get single video PDF report
router.get("/video/:id", auth, generateVideoReport);

module.exports = router;