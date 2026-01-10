const Video = require("../models/Video");

const processVideo = async (video, io) => {
  setTimeout(async () => {
    // ✅ SAFE PLACEHOLDER ANALYSIS
    const analysisResult = {
      nudity: false,
      violence: false,
      confidence: 0.0,
      note: "Rule-based placeholder (AI model not integrated yet)"
    };

    video.sensitivity = analysisResult;
    video.status = "processed";
    await video.save();

    io.emit("analysis-complete", {
      videoId: video._id,
      sensitivity: analysisResult,
    });

    console.log("Video processed safely:", video.originalName);
  }, 2000);
};

module.exports = processVideo;
