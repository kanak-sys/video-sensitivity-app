const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      required: [true, "Original name is required"],
      trim: true
    },
    storedName: {
      type: String,
      required: [true, "Stored name is required"],
      unique: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"]
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: [true, "Tenant ID is required"]
    },
    status: {
      type: String,
      enum: ["uploaded", "processing", "processed", "failed"],
      default: "uploaded"
    },
    // File metadata
    duration: {
      type: Number, // seconds
      default: 0,
      min: [0, "Duration cannot be negative"]
    },
    size: {
      type: Number, // bytes
      default: 0,
      min: [0, "Size cannot be negative"]
    },
    width: {
      type: Number,
      min: [1, "Width must be positive"]
    },
    height: {
      type: Number,
      min: [1, "Height must be positive"]
    },
    bitrate: {
      type: Number // bits per second
    },
    codec: {
      type: String
    },
    frameRate: {
      type: Number
    },
    thumbnail: {
      type: String,
      default: ""
    },
    // Sensitivity analysis results
    sensitivity: {
      status: {
        type: String,
        enum: ["pending", "safe", "sensitive", "error"],
        default: "pending"
      },
      reason: {
        type: String,
        default: ""
      },
      confidence: {
        type: Number,
        default: 0,
        min: [0, "Confidence cannot be negative"],
        max: [1, "Confidence cannot exceed 1"]
      },
      checkedAt: {
        type: Date
      },
      details: {
        skinRatio: {
          type: Number,
          min: 0,
          max: 1
        },
        frameCount: {
          type: Number,
          default: 0
        },
        analysisTime: {
          type: Number // milliseconds
        },
        flags: [{
          type: String,
          enum: ["high_skin_exposure", "potential_content", "unusual_pattern"]
        }]
      }
    },
    // Processing metadata
    analysisDone: {
      type: Boolean,
      default: false
    },
    analysisRequested: {
      type: Boolean,
      default: false
    },
    analysisRetries: {
      type: Number,
      default: 0,
      min: [0, "Retries cannot be negative"]
    },
    lastAnalysisAttempt: {
      type: Date
    },
    processingStartTime: {
      type: Date
    },
    processingEndTime: {
      type: Date
    },
    error: {
      message: String,
      stack: String,
      timestamp: Date
    },
    tags: [{
      type: String,
      trim: true
    }],
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"]
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function(doc, ret) {
        // Add human-readable fields
        ret.sizeFormatted = ret.size ? formatFileSize(ret.size) : 'N/A';
        ret.durationFormatted = ret.duration ? formatDuration(ret.duration) : 'N/A';
        ret.processingTime = ret.processingStartTime && ret.processingEndTime 
          ? ret.processingEndTime - ret.processingStartTime 
          : null;
        return ret;
      }
    },
    toObject: {
      virtuals: true
    }
  }
);

// Indexes for performance
videoSchema.index({ tenantId: 1 });
videoSchema.index({ userId: 1 });
videoSchema.index({ status: 1 });
videoSchema.index({ 'sensitivity.status': 1 });
videoSchema.index({ createdAt: -1 });
videoSchema.index({ tenantId: 1, createdAt: -1 });
videoSchema.index({ tenantId: 1, 'sensitivity.status': 1 });

// Virtual for video URL
videoSchema.virtual('videoUrl').get(function() {
  return `/api/videos/stream/${this._id}`;
});

// Virtual for thumbnail URL
videoSchema.virtual('thumbnailUrl').get(function() {
  return this.thumbnail || `/uploads/thumbnails/${this._id}.jpg`;
});

// Virtual for processing time
videoSchema.virtual('processingTime').get(function() {
  if (this.processingStartTime && this.processingEndTime) {
    return this.processingEndTime - this.processingStartTime;
  }
  return null;
});

// Method to mark as processing
videoSchema.methods.markAsProcessing = function() {
  this.status = 'processing';
  this.analysisRequested = true;
  this.processingStartTime = new Date();
  return this.save();
};

// Method to mark as processed
videoSchema.methods.markAsProcessed = function(sensitivityData) {
  this.status = 'processed';
  this.analysisDone = true;
  this.analysisRequested = false;
  this.processingEndTime = new Date();
  this.sensitivity = {
    ...sensitivityData,
    checkedAt: new Date()
  };
  return this.save();
};

// Method to mark as failed
videoSchema.methods.markAsFailed = function(error) {
  this.status = 'failed';
  this.analysisRequested = false;
  this.analysisRetries += 1;
  this.lastAnalysisAttempt = new Date();
  this.error = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date()
  };
  return this.save();
};

// Method to reset for retry
videoSchema.methods.resetForRetry = function() {
  this.status = 'uploaded';
  this.analysisRequested = false;
  this.sensitivity = {
    status: 'pending',
    reason: '',
    confidence: 0
  };
  return this.save();
};

// Static method to get statistics
videoSchema.statics.getStats = async function(tenantId) {
  const stats = await this.aggregate([
    { $match: { tenantId: mongoose.Types.ObjectId(tenantId) } },
    {
      $group: {
        _id: null,
        totalVideos: { $sum: 1 },
        totalSize: { $sum: "$size" },
        totalDuration: { $sum: "$duration" },
        safeCount: {
          $sum: { $cond: [{ $eq: ["$sensitivity.status", "safe"] }, 1, 0] }
        },
        sensitiveCount: {
          $sum: { $cond: [{ $eq: ["$sensitivity.status", "sensitive"] }, 1, 0] }
        },
        pendingCount: {
          $sum: { $cond: [{ $eq: ["$sensitivity.status", "pending"] }, 1, 0] }
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalVideos: 0,
    totalSize: 0,
    totalDuration: 0,
    safeCount: 0,
    sensitiveCount: 0,
    pendingCount: 0
  };
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

const Video = mongoose.model("Video", videoSchema);

module.exports = Video;