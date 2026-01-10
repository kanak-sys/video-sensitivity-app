const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    originalName: String,
    storedName: String,
    tenantId: mongoose.Schema.Types.ObjectId,
    status: {
      type: String,
      enum: ["uploaded", "processing", "processed"],
      default: "uploaded"
    },

    // 🔴 Sensitive content flags
    sensitivity: {
      nudity: { type: Boolean, default: false },
      violence: { type: Boolean, default: false },
      confidence: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Video", videoSchema);
