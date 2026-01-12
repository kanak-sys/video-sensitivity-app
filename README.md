# Video Sensitivity Analysis Application

A full-stack web application for uploading, streaming, and analyzing video content for sensitivity detection using AI/ML models.

## 🚀 Features

### Backend Features
- ✅ JWT-based authentication & authorization
- ✅ Video upload with metadata extraction
- ✅ Intelligent frame rate parsing (handles fractional formats like "60/1")
- ✅ Video streaming with secure token-based access
- ✅ Content sensitivity analysis using skin detection
- ✅ Automatic thumbnail generation
- ✅ MongoDB integration with multi-tenant support
- ✅ Real-time processing with Socket.IO
- ✅ Secure file handling and cleanup

### Frontend Features
- 📹 Video upload with drag & drop support
- 📊 Real-time analysis progress tracking
- 🎬 Video player with streaming capabilities
- 📋 Dashboard with video listing
- 🔒 Role-based access control (editor/admin)
- 📱 Responsive design

## 🛠 Technology Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **Socket.IO** for real-time communication
- **FFmpeg** for video processing
- **JWT** for authentication
- **Multer** for file uploads

### Frontend
- **React** with Vite
- **Socket.IO Client** for real-time updates
- **Axios** for API calls
- **Tailwind CSS** for styling
- **React Router** for navigation

## 📋 Prerequisites

- Node.js (v18 or higher)
- MongoDB (v6 or higher)
- FFmpeg installed on system
- npm or yarn package manager

## 🔧 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd video-sensitivity-app
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create `.env` file in backend directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/video-sensitivity
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
UPLOAD_DIR=./uploads
TEMP_DIR=./temp
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

Create `.env` file in frontend directory:
```env
VITE_API_URL=http://localhost:5000
```

### 4. Install FFmpeg
**Windows:**
```bash
choco install ffmpeg
```
**macOS:**
```bash
brew install ffmpeg
```
**Linux:**
```bash
sudo apt-get install ffmpeg
```

## 🏃‍♂️ Running the Application

### Start MongoDB
```bash
mongod
```

### Start Backend Server
```bash
cd backend
npm run dev
```

### Start Frontend Development Server
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## 📁 Project Structure

```
video-sensitivity-app/
├── backend/
│   ├── controllers/     # API controllers
│   ├── models/         # MongoDB models
│   ├── routes/         # Express routes
│   ├── services/       # Business logic
│   ├── middleware/     # Custom middleware
│   ├── uploads/        # Video storage
│   ├── temp/           # Temporary files
│   └── server.js       # Main server file
├── frontend/
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── pages/      # Page components
│   │   ├── services/   # API services
│   │   ├── context/    # React context
│   │   └── utils/      # Utility functions
│   └── public/         # Static files
└── README.md
```

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Video Management
- `GET /api/videos` - List all videos
- `POST /api/videos/upload` - Upload video
- `GET /api/videos/stream/:id` - Stream video
- `POST /api/videos/:id/analyze` - Analyze video
- `DELETE /api/videos/:id` - Delete video

## 🐛 Troubleshooting

### Common Issues

1. **FFmpeg not found**
   ```
   Error: FFmpeg not found in system PATH
   ```
   **Solution:** Install FFmpeg and ensure it's in system PATH

2. **Frame rate parsing error**
   ```
   Cast to Number failed for value "60/1"
   ```
   **Solution:** Already fixed - system now handles fractional frame rates

3. **MongoDB connection failed**
   ```
   MongoDB connection error
   ```
   **Solution:** Ensure MongoDB is running and connection string is correct

4. **JWT token expired**
   ```
   Token has expired
   ```
   **Solution:** Re-login to get new token

5. **File upload size limit**
   ```
   Payload too large
   ```
   **Solution:** Check server file size limits in middleware

## 🧪 Testing

Run backend tests:
```bash
cd backend
npm test
```

Run frontend tests:
```bash
cd frontend
npm test
```

## 📊 Analysis Results

The system analyzes videos and returns:
- **Status**: `safe` or `sensitive`
- **Confidence**: Probability score (0-1)
- **Duration**: Video length
- **Processing Time**: Time taken for analysis
- **Skin Ratio**: Percentage of skin content detected

## 🔒 Security Features

- JWT token authentication
- Secure video streaming with token validation
- Role-based access control
- File upload validation
- Secure file deletion
- CORS protection
- Environment-based configuration

## 📈 Performance

- Frame extraction optimized with FFmpeg
- Parallel processing for multiple frames
- Efficient memory management
- Automatic cleanup of temporary files
- Database indexing for faster queries

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- FFmpeg team for video processing capabilities
- MongoDB for database solution
- React team for frontend framework
- All contributors and testers

---

**✨ Happy Coding!** If you encounter any issues, please check the troubleshooting section or open an issue in the repository.
