import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { videoAPI, reportAPI } from "../services/api";
import socket from "../services/socket";

function Dashboard() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [progressMap, setProgressMap] = useState({});
  const [downloading, setDownloading] = useState({});
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    
    if (!token) {
      navigate("/login");
      return;
    }
    
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, [navigate]);

  // Fetch videos
  useEffect(() => {
    if (!localStorage.getItem("token")) return;

    const fetchVideos = async () => {
      try {
        setLoading(true);
        const response = await videoAPI.getAll();
        setVideos(response.data.data || []);
      } catch (err) {
        console.error("Failed to fetch videos:", err);
        if (err.response?.status === 401) {
          navigate("/login");
        } else {
          setError("Failed to load videos. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();

    // Set up socket listeners
    socket.on("progress", ({ videoId, progress, message }) => {
      setProgressMap(prev => ({
        ...prev,
        [videoId]: { progress, message }
      }));
    });

    socket.on("analysis-complete", ({ videoId, status }) => {
      // Refresh videos list when analysis completes
      fetchVideos();
      // Clear progress for this video
      setProgressMap(prev => {
        const newMap = { ...prev };
        delete newMap[videoId];
        return newMap;
      });
    });

    // Join rooms for all videos
    socket.emit("join-video-room", "all");

    return () => {
      socket.off("progress");
      socket.off("analysis-complete");
    };
  }, [navigate]);

  const handleAnalyze = async (videoId) => {
    try {
      await videoAPI.analyze(videoId);
      // Progress updates will come via socket
    } catch (err) {
      console.error("Analysis failed:", err);
      alert("Failed to start analysis. Please try again.");
    }
  };

  const handleDownloadReport = async (videoId) => {
    try {
      setDownloading(prev => ({ ...prev, [videoId]: true }));
      
      const response = await reportAPI.getVideoReport(videoId);
      
      // Extract filename from headers
      const contentDisposition = response.headers['content-disposition'];
      let filename = `report-${videoId}.pdf`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error("Download failed:", err);
      alert("Failed to download report. Please try again.");
    } finally {
      setDownloading(prev => ({ ...prev, [videoId]: false }));
    }
  };

  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm("Are you sure you want to delete this video?")) {
      return;
    }
    
    try {
      await videoAPI.delete(videoId);
      setVideos(prev => prev.filter(video => video._id !== videoId));
      alert("Video deleted successfully");
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete video. Please try again.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (loading && videos.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading videos...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <div>
            <h1>🎬 Video Sensitivity Dashboard</h1>
            {user && (
              <p className="user-info">
                Logged in as <strong>{user.email}</strong> ({user.role})
              </p>
            )}
          </div>
          
          <div className="header-actions">
            <Link to="/upload" className="upload-button">
              + Upload Video
            </Link>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <main className="dashboard-content">
        <div className="stats-container">
          <div className="stat-card">
            <h3>Total Videos</h3>
            <p className="stat-number">{videos.length}</p>
          </div>
          
          <div className="stat-card">
            <h3>Processed</h3>
            <p className="stat-number">
              {videos.filter(v => v.status === 'processed').length}
            </p>
          </div>
          
          <div className="stat-card">
            <h3>Pending</h3>
            <p className="stat-number">
              {videos.filter(v => v.status !== 'processed').length}
            </p>
          </div>
        </div>

        {videos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📹</div>
            <h2>No videos uploaded yet</h2>
            <p>Upload your first video to start sensitivity analysis</p>
            <Link to="/upload" className="empty-upload-button">
              Upload First Video
            </Link>
          </div>
        ) : (
          <div className="videos-grid">
            {videos.map(video => {
              const progress = progressMap[video._id];
              const isProcessing = progress || video.status === 'processing';
              
              return (
                <div key={video._id} className="video-card">
                  <div className="video-header">
                    <h3 className="video-title">
                      {video.originalName}
                    </h3>
                    <span className={`video-status ${video.status}`}>
                      {video.status}
                    </span>
                  </div>
                  
                  <div className="video-metadata">
                    <div className="metadata-item">
                      <span className="label">Duration:</span>
                      <span className="value">
                        {video.durationFormatted || 'N/A'}
                      </span>
                    </div>
                    
                    <div className="metadata-item">
                      <span className="label">Size:</span>
                      <span className="value">
                        {video.sizeFormatted || 'N/A'}
                      </span>
                    </div>
                    
                    <div className="metadata-item">
                      <span className="label">Uploaded:</span>
                      <span className="value">
                        {new Date(video.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  {video.thumbnail && (
                    <div className="video-thumbnail">
                      <img 
                        src={`http://localhost:5000${video.thumbnail}`} 
                        alt={video.originalName}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = 
                            '<div class="thumbnail-placeholder">🎬</div>';
                        }}
                      />
                    </div>
                  )}
                  
                  <div className="video-player">
                    <video
                      controls
                      onEnded={() => handleAnalyze(video._id)}
                      poster={video.thumbnail ? `http://localhost:5000${video.thumbnail}` : undefined}
                    >
                      <source 
                        src={videoAPI.streamUrl(video._id, video.streamToken)}
                        type="video/mp4"
                      />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  
                  {isProcessing && (
                    <div className="progress-section">
                      <div className="progress-info">
                        <span>Analysis Progress</span>
                        <span>{progress?.progress || 0}%</span>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${progress?.progress || 0}%` }}
                        ></div>
                      </div>
                      {progress?.message && (
                        <p className="progress-message">{progress.message}</p>
                      )}
                    </div>
                  )}
                  
                  <div className="sensitivity-section">
                    <h4>Sensitivity Analysis</h4>
                    <div className={`sensitivity-status ${video.sensitivity?.status}`}>
                      {video.sensitivity?.status === 'pending' && '⏳ Pending'}
                      {video.sensitivity?.status === 'safe' && '✅ Safe'}
                      {video.sensitivity?.status === 'sensitive' && '⚠️ Sensitive'}
                      {video.sensitivity?.status === 'error' && '❌ Error'}
                    </div>
                    
                    {video.sensitivity?.reason && (
                      <p className="sensitivity-reason">
                        {video.sensitivity.reason}
                      </p>
                    )}
                    
                    {video.sensitivity?.confidence > 0 && (
                      <p className="sensitivity-confidence">
                        Confidence: {(video.sensitivity.confidence * 100).toFixed(1)}%
                      </p>
                    )}
                  </div>
                  
                  <div className="video-actions">
                    {video.sensitivity?.status === 'processed' && video.sensitivity.status !== 'pending' && (
                      <button
                        onClick={() => handleDownloadReport(video._id)}
                        disabled={downloading[video._id]}
                        className="action-button download"
                      >
                        {downloading[video._id] ? 'Downloading...' : '📥 Download Report'}
                      </button>
                    )}
                    
                    {video.status === 'uploaded' && !isProcessing && (
                      <button
                        onClick={() => handleAnalyze(video._id)}
                        className="action-button analyze"
                      >
                        🔍 Analyze Now
                      </button>
                    )}
                    
                    {user?.role === 'admin' || user?.role === 'editor' ? (
                      <button
                        onClick={() => handleDeleteVideo(video._id)}
                        className="action-button delete"
                      >
                        🗑️ Delete
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="dashboard-footer">
        <p>Video Sensitivity Analysis System • {new Date().getFullYear()}</p>
        <p>Real-time processing powered by WebSocket</p>
      </footer>

      <style jsx>{`
        .dashboard-container {
          min-height: 100vh;
          background: #f8fafc;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 5px solid #f3f3f3;
          border-top: 5px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .dashboard-header {
          background: white;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          padding: 20px 40px;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1400px;
          margin: 0 auto;
        }

        .dashboard-header h1 {
          margin: 0;
          color: #333;
          font-size: 24px;
        }

        .user-info {
          margin: 5px 0 0 0;
          color: #666;
          font-size: 14px;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .upload-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          transition: transform 0.2s;
        }

        .upload-button:hover {
          transform: translateY(-2px);
        }

        .logout-button {
          background: #e9ecef;
          color: #495057;
          padding: 10px 20px;
          border-radius: 8px;
          border: none;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.3s;
        }

        .logout-button:hover {
          background: #dee2e6;
        }

        .error-message {
          background: #fee;
          color: #c33;
          padding: 12px 40px;
          margin: 20px 40px;
          border-radius: 8px;
          text-align: center;
        }

        .dashboard-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 30px 40px;
        }

        .stats-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }

        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          text-align: center;
        }

        .stat-card h3 {
          margin: 0 0 10px 0;
          color: #666;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .stat-number {
          margin: 0;
          color: #333;
          font-size: 36px;
          font-weight: bold;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .empty-icon {
          font-size: 60px;
          margin-bottom: 20px;
        }

        .empty-state h2 {
          margin: 0 0 10px 0;
          color: #333;
        }

        .empty-state p {
          margin: 0 0 20px 0;
          color: #666;
        }

        .empty-upload-button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          transition: transform 0.2s;
        }

        .empty-upload-button:hover {
          transform: translateY(-2px);
        }

        .videos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
          gap: 30px;
        }

        .video-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          transition: transform 0.3s, box-shadow 0.3s;
        }

        .video-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
        }

        .video-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .video-title {
          margin: 0;
          color: #333;
          font-size: 18px;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .video-status {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .video-status.uploaded {
          background: #e3f2fd;
          color: #1976d2;
        }

        .video-status.processing {
          background: #fff3e0;
          color: #f57c00;
        }

        .video-status.processed {
          background: #e8f5e9;
          color: #388e3c;
        }

        .video-status.failed {
          background: #ffebee;
          color: #d32f2f;
        }

        .video-metadata {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eee;
        }

        .metadata-item {
          display: flex;
          flex-direction: column;
        }

        .label {
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
        }

        .value {
          font-size: 14px;
          color: #333;
          font-weight: 500;
        }

        .video-thumbnail {
          width: 100%;
          height: 200px;
          background: #f8f9fa;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 20px;
        }

        .video-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .thumbnail-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }

        .video-player {
          width: 100%;
          margin-bottom: 20px;
        }

        .video-player video {
          width: 100%;
          border-radius: 8px;
          background: #000;
        }

        .progress-section {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .progress-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 14px;
          color: #333;
        }

        .progress-bar {
          height: 8px;
          background: #e9ecef;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          transition: width 0.3s ease;
        }

        .progress-message {
          margin: 8px 0 0 0;
          font-size: 12px;
          color: #666;
          font-style: italic;
        }

        .sensitivity-section {
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eee;
        }

        .sensitivity-section h4 {
          margin: 0 0 10px 0;
          color: #333;
          font-size: 16px;
        }

        .sensitivity-status {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 6px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .sensitivity-status.pending {
          background: #fff3e0;
          color: #f57c00;
        }

        .sensitivity-status.safe {
          background: #e8f5e9;
          color: #388e3c;
        }

        .sensitivity-status.sensitive {
          background: #ffebee;
          color: #d32f2f;
        }

        .sensitivity-status.error {
          background: #f5f5f5;
          color: #757575;
        }

        .sensitivity-reason {
          margin: 8px 0;
          color: #666;
          font-size: 14px;
          line-height: 1.5;
        }

        .sensitivity-confidence {
          margin: 4px 0 0 0;
          color: #888;
          font-size: 12px;
        }

        .video-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .action-button {
          flex: 1;
          min-width: 120px;
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .action-button:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .action-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .action-button.download {
          background: #e3f2fd;
          color: #1976d2;
        }

        .action-button.analyze {
          background: #fff3e0;
          color: #f57c00;
        }

        .action-button.delete {
          background: #ffebee;
          color: #d32f2f;
        }

        .dashboard-footer {
          text-align: center;
          padding: 20px;
          color: #666;
          font-size: 14px;
          border-top: 1px solid #eee;
          background: white;
        }

        .dashboard-footer p {
          margin: 4px 0;
        }

        @media (max-width: 768px) {
          .header-content {
            flex-direction: column;
            gap: 15px;
            text-align: center;
          }
          
          .videos-grid {
            grid-template-columns: 1fr;
          }
          
          .video-metadata {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 480px) {
          .dashboard-content {
            padding: 20px;
          }
          
          .video-metadata {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default Dashboard;