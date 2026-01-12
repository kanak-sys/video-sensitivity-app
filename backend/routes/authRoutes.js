const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const auth = require("../middlewares/auth");

router.post("/register", authController.register);
router.post("/login", authController.login);

// Get current user profile (protected)
router.get("/profile", auth, authController.getProfile);

module.exports = router;