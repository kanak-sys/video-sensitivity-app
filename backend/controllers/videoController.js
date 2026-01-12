const Video = require("../models/Video");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const processVideo = require("../services/videoProcessor");
const { generateStreamToken } = require("../utils/streamToken");

// Upload video
exports.uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: "No file uploaded" 
      });
    }

    // Validate file size
    if (req.file.size > 200 * 1024 * 1024) { // 200MB
      // Delete uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: "File size exceeds 200MB limit"
      });
    }

    const filePath = path.join(__dirname, "..", "uploads", req.file.filename);
    const stat = fs.statSync(filePath);

    // Get video metadata using ffprobe
    const getVideoMetadata = () => {
      return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
          if (err) {
            console.warn("FFprobe warning:", err.message);
            resolve({
              duration: 0,
              width: null,
              height: null,
              bitrate: null,
              codec: null
            });
          } else {
            const format = metadata.format || {};
            const videoStream = (metadata.streams || []).find(s => s.codec_type === "video");
            
            resolve({
              duration: format.duration || 0,
              width: videoStream ? videoStream.width : null,
              height: videoStream ? videoStream.height : null,
              bitrate: format.bit_rate,
              codec: videoStream ? videoStream.codec_name : null
            });
          }
        });
      });
    };

    const metadata = await getVideoMetadata();

    // Create video record
    const video = await Video.create({
      originalName: req.file.originalname,
      storedName: req.file.filename,
      tenantId: req.user.tenantId,
      userId: req.user.userId,
      status: "uploaded",
      duration: metadata.duration,
      size: stat.size,
      width: metadata.width,
      height: metadata.height,
      bitrate: metadata.bitrate,
      codec: metadata.codec
    });

    // Generate thumbnail asynchronously
    const generateThumbnail = () => {
      const thumbsDir = path.join(__dirname, "..", "uploads", "thumbnails");
      fs.mkdirSync(thumbsDir, { recursive: true });
      const thumbPath = path.join(thumbsDir, `${video._id}.jpg`);
      
      ffmpeg(filePath)
        .on('start', () => {
          console.log(`Generating thumbnail for ${video._id}`);
        })
        .screenshots({
          timestamps: [Math.min(1, Math.floor(metadata.duration / 2) || 1)], // Use 1s or half duration
          filename: `${video._id}.jpg`,
          folder: thumbsDir,
          size: '640x?',
          quality: 85
        })
        .on('end', async () => {
          try {
            video.thumbnail = `/uploads/thumbnails/${video._id}.jpg`;
            await video.save();
            console.log(`Thumbnail generated for ${video._id}`);
          } catch (err) {
            console.error("Failed to save thumbnail:", err.message);
          }
        })
        .on('error', (err) => {
          console.error("Thumbnail generation failed:", err.message);
        });
    };

    // Start thumbnail generation
    generateThumbnail();

    // Generate stream token
    const streamToken = generateStreamToken(video._id.toString(), req.user.userId.toString());

    res.status(201).json({
      success: true,
      message: "Video uploaded successfully",
      data: {
        ...video.toObject(),
        streamToken,
        uploadProgress: 100
      }
    });

  } catch (err) {
    console.error("Upload error:", err);
    
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupErr) {
        console.error("Failed to cleanup file:", cleanupErr.message);
      }
    }
    
    res.status(500).json({
      success: false,
      message: "Upload failed",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get all videos for tenant
exports.getVideos = async (req, res) => {
  try {
    console.log("Fetching videos for user:", req.user.userId);
    
    // Build query with tenant isolation
    const query = { tenantId: req.user.tenantId };
    
    // Optional filters
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    if (req.query.sensitivity) {
      query['sensitivity.status'] = req.query.sensitivity;
    }
    
    // Fetch videos
    const videos = await Video.find(query)
      .sort({ createdAt: -1 })
      .lean(); // Use lean for better performance
    
    console.log(`Found ${videos.length} videos for tenant ${req.user.tenantId}`);
    
    // Add stream tokens and format response
    const videosWithTokens = videos.map(video => {
      const streamToken = generateStreamToken(
        video._id.toString(),
        req.user.userId.toString()
      );
      
      return {
        ...video,
        streamToken,
        // Add formatted dates
        createdAtFormatted: new Date(video.createdAt).toLocaleString(),
        updatedAtFormatted: new Date(video.updatedAt).toLocaleString(),
        // Add human readable size
        sizeFormatted: video.size ? formatFileSize(video.size) : 'N/A',
        // Add duration formatted
        durationFormatted: video.duration ? formatDuration(video.duration) : 'N/A'
      };
    });

    // Statistics
    const stats = {
      total: videos.length,
      uploaded: videos.filter(v => v.status === 'uploaded').length,
      processing: videos.filter(v => v.status === 'processing').length,
      processed: videos.filter(v => v.status === 'processed').length,
      safe: videos.filter(v => v.sensitivity?.status === 'safe').length,
      sensitive: videos.filter(v => v.sensitivity?.status === 'sensitive').length,
      pending: videos.filter(v => v.sensitivity?.status === 'pending').length
    };

    res.json({
      success: true,
      count: videos.length,
      stats,
      data: videosWithTokens
    });

  } catch (error) {
    console.error("Get videos error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch videos",
      error: error.message
    });
  }
};

// Get single video
exports.getVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found"
      });
    }

    // Tenant check
    if (String(video.tenantId) !== String(req.user.tenantId)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden"
      });
    }

    // Generate stream token
    const streamToken = generateStreamToken(
      video._id.toString(),
      req.user.userId.toString()
    );

    const videoWithToken = {
      ...video.toObject(),
      streamToken,
      createdAtFormatted: new Date(video.createdAt).toLocaleString(),
      updatedAtFormatted: new Date(video.updatedAt).toLocaleString(),
      sizeFormatted: video.size ? formatFileSize(video.size) : 'N/A',
      durationFormatted: video.duration ? formatDuration(video.duration) : 'N/A'
    };

    res.json({
      success: true,
      data: videoWithToken
    });

  } catch (error) {
    console.error("Get video error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch video"
    });
  }
};

// Delete video
exports.deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found"
      });
    }

    // Tenant check
    if (String(video.tenantId) !== String(req.user.tenantId)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden"
      });
    }

    // Role check (only editors and admins can delete)
    if (!['editor', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions"
      });
    }

    const videoPath = path.join(__dirname, "..", "uploads", video.storedName);
    
    // Delete video file
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }

    // Delete thumbnail
    const thumbPath = path.join(__dirname, "..", "uploads", "thumbnails", `${video._id}.jpg`);
    if (fs.existsSync(thumbPath)) {
      fs.unlinkSync(thumbPath);
    }

    await video.deleteOne();
    
    res.json({
      success: true,
      message: "Video deleted successfully",
      deletedId: video._id
    });

  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({
      success: false,
      message: "Delete failed",
      error: err.message
    });
  }
};

// Trigger analysis
exports.triggerAnalyze = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found"
      });
    }

    // Tenant check
    if (String(video.tenantId) !== String(req.user.tenantId)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden"
      });
    }

    // Check if already analyzed
    if (video.analysisDone) {
      return res.status(400).json({
        success: false,
        message: "Video already analyzed"
      });
    }

    // Check if already processing
    if (video.analysisRequested) {
      return res.status(400).json({
        success: false,
        message: "Analysis already in progress"
      });
    }

    const io = req.app.get("io");
    
    // Start processing
    processVideo(video, io);

    res.json({
      success: true,
      message: "Analysis started in background",
      videoId: video._id
    });

  } catch (err) {
    console.error("Trigger analyze error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to start analysis",
      error: err.message
    });
  }
};

// Helper functions
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}