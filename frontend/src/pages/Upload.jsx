import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { videoAPI } from "../services/api";

function Upload() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Validate file type
    const allowedTypes = [
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
      'video/webm'
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Please select a valid video file (MP4, MOV, AVI, MKV, WEBM)');
      setFile(null);
      return;
    }

    // Validate file size (200MB)
    if (selectedFile.size > 200 * 1024 * 1024) {
      setError('File size exceeds 200MB limit');
      setFile(null);
      return;
    }

    setError('');
    setFile(selectedFile);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a video file');
      return;
    }

    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('video', file);

    try {
      // Simulate progress for better UX
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      const response = await videoAPI.upload(formData);
      
      clearInterval(interval);
      setProgress(100);

      // Wait a moment to show completion
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);

    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
      console.error('Upload error:', err);
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setError('');
    setProgress(0);
  };

  return (
    <div className="upload-container">
      <div className="upload-card">
        <div className="upload-header">
          <h2>Upload Video</h2>
          <p>Upload a video file for sensitivity analysis</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleUpload}>
          <div className="file-upload-area">
            <div className="upload-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            
            <input
              type="file"
              id="video-upload"
              accept="video/*"
              onChange={handleFileChange}
              disabled={loading}
              className="file-input"
            />
            
            <label htmlFor="video-upload" className="file-label">
              {file ? file.name : 'Choose a video file'}
            </label>
            
            <p className="file-hint">
              Supported formats: MP4, MOV, AVI, MKV, WEBM • Max size: 200MB
            </p>
          </div>

          {file && (
            <div className="file-preview">
              <div className="file-info">
                <strong>Selected File:</strong> {file.name}
                <br />
                <small>Size: {(file.size / (1024 * 1024)).toFixed(2)} MB</small>
              </div>
              
              {progress > 0 && (
                <div className="progress-container">
                  <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                  <span className="progress-text">{progress}%</span>
                </div>
              )}
            </div>
          )}

          <div className="button-group">
            <button
              type="button"
              onClick={handleCancel}
              className="cancel-button"
              disabled={loading}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              className="upload-button"
              disabled={!file || loading}
            >
              {loading ? 'Uploading...' : 'Upload Video'}
            </button>
          </div>
        </form>

        <div className="upload-tips">
          <h4>📝 Tips:</h4>
          <ul>
            <li>Ensure good lighting and clear video quality for accurate analysis</li>
            <li>Shorter videos (under 5 minutes) process faster</li>
            <li>After upload, watch the video completely to trigger analysis</li>
            <li>Analysis results will appear in the dashboard</li>
          </ul>
        </div>
      </div>

      <style jsx>{`
        .upload-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          padding: 40px 20px;
        }

        .upload-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          padding: 40px;
          max-width: 600px;
          margin: 0 auto;
        }

        .upload-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .upload-header h2 {
          margin: 0 0 10px 0;
          color: #333;
          font-size: 32px;
        }

        .upload-header p {
          margin: 0;
          color: #666;
          font-size: 14px;
        }

        .error-message {
          background: #fee;
          color: #c33;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .file-upload-area {
          border: 2px dashed #ddd;
          border-radius: 12px;
          padding: 40px 20px;
          text-align: center;
          margin-bottom: 20px;
          transition: border-color 0.3s;
          position: relative;
        }

        .file-upload-area:hover {
          border-color: #667eea;
        }

        .upload-icon {
          color: #667eea;
          margin-bottom: 20px;
        }

        .file-input {
          display: none;
        }

        .file-label {
          display: inline-block;
          background: #667eea;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.3s;
        }

        .file-label:hover {
          background: #5a67d8;
        }

        .file-hint {
          margin-top: 10px;
          color: #888;
          font-size: 12px;
        }

        .file-preview {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .file-info {
          margin-bottom: 10px;
          color: #333;
        }

        .progress-container {
          height: 20px;
          background: #e9ecef;
          border-radius: 10px;
          overflow: hidden;
          position: relative;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          transition: width 0.3s ease;
        }

        .progress-text {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #333;
          font-size: 12px;
          font-weight: bold;
        }

        .button-group {
          display: flex;
          gap: 12px;
          margin-bottom: 30px;
        }

        .cancel-button {
          flex: 1;
          padding: 14px;
          background: #e9ecef;
          color: #495057;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.3s;
        }

        .cancel-button:hover:not(:disabled) {
          background: #dee2e6;
        }

        .cancel-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .upload-button {
          flex: 2;
          padding: 14px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .upload-button:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .upload-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .upload-tips {
          background: #f0f4ff;
          border-radius: 8px;
          padding: 20px;
        }

        .upload-tips h4 {
          margin: 0 0 10px 0;
          color: #333;
        }

        .upload-tips ul {
          margin: 0;
          padding-left: 20px;
          color: #555;
        }

        .upload-tips li {
          margin-bottom: 8px;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}

export default Upload;