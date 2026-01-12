const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("../models/User");
const Tenant = require("../models/Tenant");

/**
 * Create a demo tenant and user for testing
 */
async function createDemoUser() {
  try {
    console.log("🔧 Setting up demo user and tenant...");

    // Connect to MongoDB
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in .env file");
    }

    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });

    console.log("✅ MongoDB connected");

    // Check if demo tenant exists
    let tenant = await Tenant.findOne({ name: "Demo Organization" });
    
    if (!tenant) {
      // Create demo tenant
      tenant = await Tenant.create({
        name: "Demo Organization",
        description: "Demo tenant for testing video sensitivity analysis",
        settings: {
          maxVideoSize: 500 * 1024 * 1024, // 500MB
          allowedVideoTypes: [".mp4", ".mov", ".avi", ".mkv", ".webm"],
          analysisEnabled: true,
          autoAnalysis: true,
          retentionDays: 90
        },
        status: "active"
      });
      console.log(`✅ Created demo tenant: ${tenant._id}`);
    } else {
      console.log(`✅ Using existing tenant: ${tenant._id}`);
    }

    // Check if demo user exists
    const existingUser = await User.findOne({ email: "demo@example.com" });
    
    if (existingUser) {
      console.log("⚠️ Demo user already exists:");
      console.log({
        id: existingUser._id,
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
        tenantId: existingUser.tenantId
      });
      
      // Update password if needed
      const needsPasswordUpdate = process.argv.includes('--update-password');
      if (needsPasswordUpdate) {
        const newPassword = "demo123";
        const salt = await bcrypt.genSalt(10);
        existingUser.password = await bcrypt.hash(newPassword, salt);
        await existingUser.save();
        console.log(`✅ Updated password to: ${newPassword}`);
      }
      
      await mongoose.disconnect();
      return;
    }

    // Create demo users with different roles
    const demoUsers = [
      {
        name: "Demo Admin",
        email: "admin@example.com",
        password: "admin123",
        role: "admin",
        tenantId: tenant._id
      },
      {
        name: "Demo Editor",
        email: "editor@example.com",
        password: "editor123",
        role: "editor",
        tenantId: tenant._id
      },
      {
        name: "Demo Viewer",
        email: "viewer@example.com",
        password: "viewer123",
        role: "viewer",
        tenantId: tenant._id
      }
    ];

    const createdUsers = [];
    
    for (const userData of demoUsers) {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Create user
      const user = await User.create({
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        tenantId: userData.tenantId,
        profilePicture: "",
        settings: {
          emailNotifications: true,
          darkMode: false,
          language: "en"
        },
        status: "active"
      });

      createdUsers.push({
        name: user.name,
        email: user.email,
        password: userData.password, // Show plain password for demo
        role: user.role,
        userId: user._id
      });

      console.log(`✅ Created ${user.role} user: ${user.email}`);
    }

    // Summary
    console.log("\n📋 Demo Setup Complete:");
    console.log("========================");
    console.log(`Tenant ID: ${tenant._id}`);
    console.log("Users created:");
    
    createdUsers.forEach(user => {
      console.log(`\n👤 ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${user.password}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   User ID: ${user.userId}`);
    });

    console.log("\n🔑 Login Credentials:");
    console.log("--------------------");
    console.log("Admin: admin@example.com / admin123");
    console.log("Editor: editor@example.com / editor123");
    console.log("Viewer: viewer@example.com / viewer123");

    console.log("\n🚀 You can now start the server and login with these credentials.");

    // Disconnect
    await mongoose.disconnect();
    console.log("\n✅ MongoDB disconnected");
    
  } catch (err) {
    console.error("❌ Error creating demo user:", err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

/**
 * Create a specific user (for production)
 */
async function createSpecificUser(name, email, password, role = "viewer", tenantName = "Default Tenant") {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // Find or create tenant
    let tenant = await Tenant.findOne({ name: tenantName });
    if (!tenant) {
      tenant = await Tenant.create({
        name: tenantName,
        description: `Tenant for ${name}`,
        status: "active"
      });
      console.log(`✅ Created tenant: ${tenant._id}`);
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(`⚠️ User ${email} already exists`);
      console.log(existingUser);
      await mongoose.disconnect();
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      tenantId: tenant._id,
      status: "active"
    });

    console.log("✅ User created successfully:");
    console.log({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      tenantName: tenant.name
    });

    await mongoose.disconnect();
    
  } catch (err) {
    console.error("❌ Error creating user:", err.message);
    process.exit(1);
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--demo')) {
    createDemoUser();
  } else if (args.length >= 3) {
    // Usage: node createUser.js "John Doe" "john@example.com" "password123" [role] [tenant]
    const [name, email, password] = args;
    const role = args[3] || "viewer";
    const tenant = args[4] || "Default Tenant";
    
    createSpecificUser(name, email, password, role, tenant);
  } else {
    console.log(`
🚀 User Creation Utility
=======================

Usage:
1. Create demo users (admin, editor, viewer):
   node createUser.js --demo

2. Create specific user:
   node createUser.js "Name" "email@example.com" "password" [role] [tenant]
   
   Example:
   node createUser.js "John Doe" "john@example.com" "password123" editor "Acme Corp"

3. Update existing demo user password:
   node createUser.js --demo --update-password

Roles: viewer, editor, admin
    `);
    process.exit(0);
  }
}

module.exports = { createDemoUser, createSpecificUser };