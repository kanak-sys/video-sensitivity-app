# 🎥 Video Sensitivity App

A **full-stack video management system** that allows users to **upload, stream, and delete videos** securely using authentication, with real-time updates and downloadable reports.

---

## 🚀 Features

* 🔐 JWT-based authentication
* ⬆️ Upload videos (Multer)
* ▶️ Video streaming with byte-range support
* 🗑 Delete uploaded videos
* 📡 Real-time updates using Socket.IO
* 📄 Downloadable PDF analysis report
* 🗃 MongoDB for video metadata storage

---

## 🛠 Tech Stack

### Frontend

* React (Vite)
* Axios
* HTML5 Video Player

### Backend

* Node.js
* Express.js
* MongoDB + Mongoose
* Multer (file uploads)
* Socket.IO
* JWT Authentication

---

## 📁 Project Structure

```
video-sensitivity-app/
│
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   ├── middlewares/
│   ├── services/
│   ├── uploads/
│   └── server.js
│
├── frontend/
│   ├── src/
│   ├── pages/
│   └── services/
│
└── README.md
```

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/kanak-sys/video-sensitivity-app.git
cd video-sensitivity-app
```

---

### 2️⃣ Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

Run backend:

```bash
npm run dev
```

---

### 3️⃣ Frontend Setup

```bash
cd ../frontend
npm install
npm run dev
```

Frontend runs on:

```
http://localhost:5173
```

Backend runs on:

```
http://localhost:5000
```

---

## 🎯 Key Functionalities

* Secure video upload & storage
* Smooth video playback via streaming
* User-controlled deletion of videos
* Real-time UI updates
* Report generation support

---

## 👩‍💻 Author

**Kanak Mishra**
