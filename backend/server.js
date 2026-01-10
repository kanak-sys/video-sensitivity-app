const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const videoRoutes = require("./routes/videoRoutes");
const reportRoutes = require("./routes/reportRoutes");

const app = express();
const server = http.createServer(app);

// middleware
app.use(cors());
app.use(express.json());

// socket.io
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// make io accessible in controllers
app.set("io", io);

// routes
app.use("/api/auth", authRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/report", reportRoutes);

const PORT = process.env.PORT || 5000;

// ✅ CONNECT DB FIRST, THEN START SERVER
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log("MongoDB connected");
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  });
