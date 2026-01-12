import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;

// Helper functions
export const authAPI = {
  login: (email, password) => api.post("/auth/login", { email, password }),
  register: (userData) => api.post("/auth/register", userData),
  getProfile: () => api.get("/auth/profile"),
};

export const videoAPI = {
  upload: (formData) => api.post("/videos/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
  getAll: () => api.get("/videos"),
  getById: (id) => api.get(`/videos/${id}`),
  delete: (id) => api.delete(`/videos/${id}`),
  analyze: (id) => api.post(`/videos/${id}/analyze`),
  streamUrl: (id, token) => `${API_BASE_URL}/videos/stream/${id}?token=${token}`,
};

export const reportAPI = {
  getVideoReport: (id) => api.get(`/report/video/${id}`, {
    responseType: "blob",
  }),
};