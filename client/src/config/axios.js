import axios from "axios";
import Cookies from "js-cookie";

// In production, the API is served from the same origin
const baseURL =
  process.env.NODE_ENV === "production"
    ? "/api" // Use relative path in production
    : import.meta.env.VITE_BACKEND_URL; // Use full URL in development

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  // Add default timeout and max content length
  timeout: 30000, // 30 seconds
  maxContentLength: 20 * 1024 * 1024, // 20MB
  maxBodyLength: 20 * 1024 * 1024, // 20MB
});

// Add request interceptor to log requests
api.interceptors.request.use((request) => {
  const token = Cookies.get("accessToken");
  if (token) {
    request.headers.Authorization = `Bearer ${token}`;
  }

  // For multipart/form-data requests, don't set Content-Type
  if (request.data instanceof FormData) {
    delete request.headers["Content-Type"];
  }

  return request;
});

// Add response interceptor to log responses
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error("Error:", error);
    return Promise.reject(error);
  },
);

export default api;
