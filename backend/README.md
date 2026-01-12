# 🎬 Video Sensitivity Analysis Backend

A powerful Node.js backend for analyzing video content sensitivity using AI-powered detection algorithms.

## ✨ Features

- **🎥 Video Upload & Management**: Upload, store, and manage videos with metadata extraction
- **🔍 AI-Powered Analysis**: Detect sensitive content using skin tone analysis algorithms
- **📊 Real-time Processing**: Live progress updates via Socket.IO
- **🏢 Multi-tenancy**: Complete tenant isolation for data security
- **👥 Role-based Access**: Viewer, Editor, and Admin roles with granular permissions
- **📄 Report Generation**: Generate detailed PDF reports of analysis results
- **🔐 Secure Streaming**: Token-based video streaming with expiration
- **📱 RESTful API**: Fully documented API endpoints
- **🐳 Docker Support**: Easy deployment with Docker and Docker Compose

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- MongoDB 5.0+
- FFmpeg 4.0+
- GraphicsMagick or ImageMagick

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd backend
   npm install