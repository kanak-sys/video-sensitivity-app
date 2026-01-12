const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
    minlength: [2, "Name must be at least 2 characters"],
    maxlength: [100, "Name cannot exceed 100 characters"]
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"]
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters"],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ["viewer", "editor", "admin"],
    default: "viewer"
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tenant",
    required: [true, "Tenant ID is required"]
  },
  profilePicture: {
    type: String,
    default: ""
  },
  lastLogin: {
    type: Date
  },
  loginCount: {
    type: Number,
    default: 0
  },
  settings: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    darkMode: {
      type: Boolean,
      default: false
    },
    language: {
      type: String,
      default: "en"
    }
  },
  status: {
    type: String,
    enum: ["active", "inactive", "suspended"],
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
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password; // Always remove password from JSON output
      return ret;
    },
    virtuals: true
  },
  toObject: {
    transform: function(doc, ret) {
      delete ret.password;
      return ret;
    },
    virtuals: true
  }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update timestamp on save
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ tenantId: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ createdAt: -1 });

// Virtual for video count
UserSchema.virtual('videoCount', {
  ref: 'Video',
  localField: '_id',
  foreignField: 'userId',
  count: true
});

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to update last login
UserSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  this.loginCount += 1;
  return this.save();
};

// Method to get user statistics
UserSchema.methods.getStats = async function() {
  const Video = mongoose.model('Video');
  
  const videoCount = await Video.countDocuments({ userId: this._id });
  const processingCount = await Video.countDocuments({ 
    userId: this._id, 
    status: 'processing' 
  });
  const sensitiveCount = await Video.countDocuments({ 
    userId: this._id, 
    'sensitivity.status': 'sensitive' 
  });
  
  return {
    videoCount,
    processingCount,
    sensitiveCount
  };
};

// Static method to find by email with password (for login)
UserSchema.statics.findByEmailWithPassword = function(email) {
  return this.findOne({ email }).select('+password');
};

const User = mongoose.model("User", UserSchema);

module.exports = User;