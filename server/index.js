import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import userRoutes from "./routes/user.routes.js";
import scenarioRoutes from "./routes/scenario.routes.js";
import authRoutes from "./routes/auth.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import cookieParser from "cookie-parser";
import emailRoutes from "./routes/email.routes.js";
import morgan from "morgan";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir =
  process.env.NODE_ENV === "production"
    ? "/app/uploads"
    : path.join(process.cwd(), "uploads");
const scenariosDir = path.join(uploadsDir, "scenarios");

// Ensure directories exist
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log("Created uploads directory:", uploadsDir);
  }
  if (!fs.existsSync(scenariosDir)) {
    fs.mkdirSync(scenariosDir, { recursive: true });
    console.log("Created scenarios directory:", scenariosDir);
  }

  // Verify directories are writable
  fs.accessSync(uploadsDir, fs.constants.W_OK);
  fs.accessSync(scenariosDir, fs.constants.W_OK);
} catch (error) {
  console.error("Directory setup error:", error);
}

dotenv.config();
const app = express();

// Middlewares
// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Range"],
  exposedHeaders: [
    "Content-Type",
    "Content-Length",
    "Content-Range",
    "Accept-Ranges",
  ],
};

app.use(cors(corsOptions));
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

// Configure static file serving with proper headers
app.use(
  "/uploads",
  (req, res, next) => {
    console.log("Static file request:", req.path);
    console.log("Full request URL:", req.url);
    console.log("Looking in directory:", uploadsDir);

    // Set CORS headers for audio files
    res.set({
      "Access-Control-Allow-Origin":
        process.env.FRONTEND_URL || "http://localhost:5173",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type",
      "Access-Control-Expose-Headers":
        "Content-Range, Content-Length, Accept-Ranges",
      "Accept-Ranges": "bytes",
    });

    if (req.path.endsWith(".mp3")) {
      res.type("audio/mpeg");
      const fullPath = path.join(uploadsDir, req.path);

      try {
        if (fs.existsSync(fullPath)) {
          const stats = fs.statSync(fullPath);
          res.set("Content-Length", stats.size);
        } else {
          return res.status(404).send("File not found");
        }
      } catch (error) {
        console.error("Error accessing file:", error);
        return res.status(500).send("Error accessing file");
      }
    }
    next();
  },
  express.static(uploadsDir, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".mp3")) {
        res.set("Content-Type", "audio/mpeg");
      }
    },
  })
);

// API routes
app.use("/api", userRoutes);
app.use("/api", scenarioRoutes);
app.use("/api", authRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/settings", settingsRoutes);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "../client/dist")));

// The "catchall" handler: for any request that doesn't
// match one above, send back the index.html file.
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// export default app;
