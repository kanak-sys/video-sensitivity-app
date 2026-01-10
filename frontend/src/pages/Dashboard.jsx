import { useEffect, useState } from "react";
import api from "../services/api";

function Dashboard() {
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    api.get("/videos").then(res => setVideos(res.data));
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this video?")) return;
    await api.delete(`/videos/${id}`);
    setVideos(videos.filter(v => v._id !== id));
  };

  return (
    <div>
      <h2>Dashboard</h2>
      <a href="/upload">Upload Video</a>

      {videos.map(video => (
        <div key={video._id} style={{ marginTop: 20 }}>
          <p>{video.originalName}</p>

          <video width="400" controls>
            <source
              src={`http://localhost:5000/api/videos/stream/${video._id}`}
              type="video/mp4"
            />
          </video>

          <button
            onClick={() => handleDelete(video._id)}
            style={{
              background: "#ff4d4d",
              color: "white",
              border: "none",
              padding: "6px 12px",
              marginTop: "6px",
              cursor: "pointer"
            }}
          >
            🗑 Delete
          </button>
        </div>
      ))}
    </div>
  );
}

export default Dashboard;
