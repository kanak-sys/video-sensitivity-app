const Video = require("../models/Video");
const processVideo = require("../services/videoProcessor");
const fs = require("fs");
const path = require("path");

const uploadVideo = async (req, res) => {
  try {
    const io = req.app.get("io");

    const video = await Video.create({
      originalName: req.file.originalname,
      storedName: req.file.filename,
      tenantId: req.user.tenantId,
      status: "processing"
    });

    io.emit("progress", {
      videoId: video._id,
      message: "Processing started"
    });

    processVideo(video, io);

    res.status(201).json(video);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getVideos = async (req, res) => {
  const videos = await Video.find({ tenantId: req.user.tenantId });
  res.json(videos);
};

const deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found" });

    // delete file from uploads
    const videoPath = path.join(__dirname, "..", "uploads", video.storedName);
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }

    // delete DB record
    await video.deleteOne();

    res.json({ message: "Video deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Delete failed" });
  }
};

module.exports = { uploadVideo, getVideos, deleteVideo, };
