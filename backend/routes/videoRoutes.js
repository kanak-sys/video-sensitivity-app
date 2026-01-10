const express = require("express");
const router = express.Router();
const multer = require("multer");

const auth = require("../middlewares/auth");
const videoController = require("../controllers/videoController");
const streamController = require("../controllers/streamController");

const upload = multer({ dest: "uploads/" });

// ✅ UPLOAD (auth only — NO ROLE)
router.post(
  "/upload",
  auth,
  upload.single("video"),
  videoController.uploadVideo
);

// ✅ LIST VIDEOS
router.get("/", auth, videoController.getVideos);

// ✅ STREAM VIDEO (PUBLIC – MUST NOT HAVE AUTH)
router.get("/stream/:id", streamController.streamVideo);

// ✅ DELETE VIDEO
router.delete("/:id", auth, videoController.deleteVideo);

module.exports = router;
