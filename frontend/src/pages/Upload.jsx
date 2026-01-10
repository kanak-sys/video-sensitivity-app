import { useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

function Upload() {
  const [file, setFile] = useState(null);
  const navigate = useNavigate();

  const handleUpload = async e => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("video", file);

    try {
      await api.post("/videos/upload", formData);
      navigate("/dashboard");
    } catch {
      alert("Upload failed");
    }
  };

  return (
    <form onSubmit={handleUpload}>
      <h2>Upload Video</h2>

      <input
        type="file"
        accept="video/mp4"
        onChange={e => setFile(e.target.files[0])}
      />

      <button type="submit">Upload</button>
    </form>
  );
}

export default Upload;
