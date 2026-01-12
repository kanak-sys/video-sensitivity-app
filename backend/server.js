const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();
const path = require("path");
const fs = require("fs");

const connectDB = require("./config/db");

// Routes
const authRoutes = require("./routes/authRoutes");
const videoRoutes = require("./routes/videoRoutes");
const reportRoutes = require("./routes/reportRoutes");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// ===============================
// 📂 Ensure required directories
// ===============================
const directories = [
  path.join(__dirname, "uploads"),
  path.join(__dirname, "uploads", "thumbnails"),
  path.join(__dirname, "temp")
];

directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// ===============================
// 🌐 CORS Configuration (EXPRESS v5 SAFE)
// ===============================
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8080"
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

console.log("🌐 Allowed CORS origins:", allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (Postman, curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS not allowed"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);


// ===============================
// 📦 Middleware
// ===============================
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve uploaded videos/thumbnails
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Simple request logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

// ===============================
// 🔌 Socket.IO
// ===============================
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

io.on("connection", socket => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  socket.on("join-video-room", videoId => {
    socket.join(`video-${videoId}`);
  });

  socket.on("disconnect", () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });
});

app.set("io", io);

// ===============================
// 📍 Routes
// ===============================
app.use("/api/auth", authRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/report", reportRoutes);

// ===============================
// 🩺 Health Check
// ===============================
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "Video Sensitivity Analysis API",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ===============================
// ❌ 404 Handler
// ===============================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// ===============================
// 🚨 Global Error Handler
// ===============================
app.use((err, req, res, next) => {
  console.error("🚨 Error:", err.message);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

// ===============================
// 🚀 Start Server
// ===============================
const startServer = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI missing in .env");
    }
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET missing in .env");
    }

    console.log("💾 Connecting to MongoDB...");
    await connectDB();
    console.log("✅ MongoDB connected");

    server.listen(PORT, () => {
      console.log(`
🚀 Server running successfully
--------------------------------
📍 http://localhost:${PORT}
📡 Socket.IO enabled
🎬 Video streaming ready
--------------------------------
`);
    });
  } catch (err) {
    console.error("❌ Startup failed:", err.message);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, server };
