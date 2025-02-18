import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` from the root directory
  const env = loadEnv(mode, path.resolve(__dirname, ".."), "");

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      proxy: {
        "/api": {
          target: env.VITE_BACKEND_URL || "http://localhost:4000",
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
      "process.env.BACKEND_URL": JSON.stringify(env.VITE_BACKEND_URL),
    },
  };
});
