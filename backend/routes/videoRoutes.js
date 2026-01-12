const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

const auth = require("../middlewares/auth");
const roles = require("../middlewares/role");
const videoController = require("../controllers/videoController");
const streamController = require("../controllers/streamController");

// Multer configuration
const uploadFolder = path.join(__dirname, "..", "uploads");

// Ensure upload folder exists
const fs = require("fs");
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadFolder);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + "-" + crypto.randomBytes(6).toString("hex") + ext;
    cb(null, name);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept common video formats
  const allowedMimeTypes = [
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-matroska",
    "video/webm"
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only video files are allowed (mp4, mov, avi, mkv, webm)"), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
  fileFilter
});

// Error handler for multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File size exceeds 200MB limit"
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

// Video routes
router.post(
  "/upload",
  auth,
  roles(["editor", "admin"]),
  upload.single("video"),
  handleUploadError,
  videoController.uploadVideo
);

router.get("/", auth, videoController.getVideos);

// Get single video
router.get("/:id", auth, videoController.getVideo);

// Stream video (no auth required, uses token)
router.get("/stream/:id", streamController.streamVideo);

// Delete video
router.delete("/:id", auth, roles(["editor", "admin"]), videoController.deleteVideo);

// Trigger analysis
router.post("/:id/analyze", auth, videoController.triggerAnalyze);

module.exports = router;