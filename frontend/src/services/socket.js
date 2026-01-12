import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"],
  withCredentials: true,
  auth: {
    token: localStorage.getItem("token"),
  },
});

socket.on("connect", () => {
  console.log("✅ Connected to WebSocket server");
});

socket.on("connect_error", (error) => {
  console.error("❌ WebSocket connection error:", error.message);
});

socket.on("disconnect", (reason) => {
  console.log("❌ WebSocket disconnected:", reason);
});

export default socket;