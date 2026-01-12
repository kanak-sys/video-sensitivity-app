const fs = require("fs");
const path = require("path");
const Video = require("../models/Video");
const { verifyStreamToken } = require("../utils/streamToken");

const streamVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.query.token;
    
    // Validate input
    if (!id || !token) {
      return res.status(400).json({
        success: false,
        message: "Video ID and stream token are required"
      });
    }

    // Verify the stream token
    const tokenData = verifyStreamToken(token);
    if (!tokenData) {
      return res.status(403).json({
        success: false,
        message: "Invalid or expired stream token"
      });
    }

    // Check if token matches requested video
    if (tokenData.videoId !== id) {
      return res.status(403).json({
        success: false,
        message: "Token does not match requested video"
      });
    }

    // Find video
    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found"
      });
    }

    // Check if video file exists
    const videoPath = path.join(__dirname, "..", "uploads", video.storedName);
    if (!fs.existsSync(videoPath)) {
      console.error(`Video file not found: ${videoPath}`);
      return res.status(404).json({
        success: false,
        message: "Video file not found on server"
      });
    }

    // Get file stats
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // Handle range requests (for video seeking)
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      
      // Validate range
      if (start >= fileSize || end >= fileSize || start > end) {
        return res.status(416).json({
          success: false,
          message: "Requested range not satisfiable"
        });
      }
      
      const chunkSize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": "video/mp4",
        "Cache-Control": "no-cache"
      });

      file.pipe(res);
    } else {
      // Full video request
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": "video/mp4",
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache"
      });

      fs.createReadStream(videoPath).pipe(res);
    }
    
  } catch (err) {
    console.error("Streaming error:", err);
    
    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: "Invalid video ID format"
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get video metadata (for preloading)
const getVideoMetadata = async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.query.token;
    
    if (!id || !token) {
      return res.status(400).json({
        success: false,
        message: "Video ID and token required"
      });
    }

    // Verify token
    const tokenData = verifyStreamToken(token);
    if (!tokenData || tokenData.videoId !== id) {
      return res.status(403).json({
        success: false,
        message: "Invalid token"
      });
    }

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found"
      });
    }

    res.json({
      success: true,
      data: {
        duration: video.duration,
        size: video.size,
        width: video.width,
        height: video.height,
        mimeType: "video/mp4"
      }
    });
    
  } catch (err) {
    console.error("Metadata error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to get video metadata"
    });
  }
};

module.exports = { streamVideo, getVideoMetadata };