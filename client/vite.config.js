import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target:
          process.env.NODE_ENV === "production"
            ? "https://simulai-api.onrender.com"
            : "http://localhost:4000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
        secure: false,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      },
    },
    watch: {
      usePolling: true,
    },
  },
  define: {
    // This ensures environment variables are properly replaced
    "process.env.BACKEND_URL": JSON.stringify(process.env.BACKEND_URL),
  },
});
