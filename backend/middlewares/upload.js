const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "..", "uploads");
const thumbnailsDir = path.join(uploadDir, "thumbnails");

[uploadDir, thumbnailsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const fileExt = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(4).toString('hex');
    const filename = `${uniqueSuffix}${fileExt}`;
    cb(null, filename);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
    'video/x-matroska'
  ];

  const allowedExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
  const fileExt = path.extname(file.originalname).toLowerCase();

  // Check both MIME type and file extension
  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error(
      `Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`
    ), false);
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB
    files: 1 // Only one file per request
  }
});

// Error handling middleware for multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: "File size exceeds 200MB limit"
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: "Only one file can be uploaded at a time"
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

module.exports = {
  upload,
  handleUploadError
};