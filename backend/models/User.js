const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: {
    type: String,
    enum: ["viewer", "editor", "admin"],
    default: "viewer"
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tenant"
  }
});

module.exports = mongoose.model("User", UserSchema);
