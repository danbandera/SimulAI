import axios from "axios";

console.log("Current API URL:", import.meta.env.VITE_BACKEND_URL);

if (!import.meta.env.VITE_BACKEND_URL) {
  throw new Error("VITE_BACKEND_URL is not set");
}

const baseURL = import.meta.env.VITE_BACKEND_URL;

const api = axios.create({
  baseURL,
  withCredentials: true,
});

export default api;
