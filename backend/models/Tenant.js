const mongoose = require("mongoose");

const TenantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Tenant name is required"],
    trim: true,
    maxlength: [100, "Name cannot exceed 100 characters"]
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, "Description cannot exceed 500 characters"]
  },
  settings: {
    maxVideoSize: {
      type: Number,
      default: 200 * 1024 * 1024, // 200MB
      min: [10 * 1024 * 1024, "Minimum video size is 10MB"]
    },
    allowedVideoTypes: {
      type: [String],
      default: [".mp4", ".mov", ".avi", ".mkv"]
    },
    analysisEnabled: {
      type: Boolean,
      default: true
    },
    autoAnalysis: {
      type: Boolean,
      default: false
    },
    retentionDays: {
      type: Number,
      default: 30,
      min: [1, "Minimum retention is 1 day"],
      max: [365, "Maximum retention is 365 days"]
    }
  },
  status: {
    type: String,
    enum: ["active", "suspended", "deleted"],
    default: "active"
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update the updatedAt timestamp on save
TenantSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes
TenantSchema.index({ name: 1 }, { unique: true });
TenantSchema.index({ status: 1 });
TenantSchema.index({ createdAt: -1 });

// Virtual for video count
TenantSchema.virtual('videoCount', {
  ref: 'Video',
  localField: '_id',
  foreignField: 'tenantId',
  count: true
});

// Virtual for user count
TenantSchema.virtual('userCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'tenantId',
  count: true
});

// Method to get tenant statistics
TenantSchema.methods.getStats = async function() {
  const Video = mongoose.model('Video');
  const User = mongoose.model('User');
  
  const [videoCount, userCount] = await Promise.all([
    Video.countDocuments({ tenantId: this._id }),
    User.countDocuments({ tenantId: this._id })
  ]);
  
  return {
    videoCount,
    userCount,
    storageUsed: await Video.aggregate([
      { $match: { tenantId: this._id } },
      { $group: { _id: null, totalSize: { $sum: "$size" } } }
    ]).then(result => result[0]?.totalSize || 0)
  };
};

const Tenant = mongoose.model("Tenant", TenantSchema);

module.exports = Tenant;