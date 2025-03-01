import { Router } from "express";
import {
  getScenarios,
  createScenario,
  getScenarioById,
  updateScenario,
  deleteScenario,
  getScenarioByUserId,
  saveConversation,
  getConversations,
  getConversation,
  getAllConversations,
  processAudio,
} from "../controllers/scenario.controller.js";
import multer from "multer";
import path from "path";

// Configure multer for audio uploads
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Configure multer for scenario file uploads
const scenarioUpload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "uploads/scenarios");
    },
    filename: function (req, file, cb) {
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.]/g, "_");
      cb(null, Date.now() + "-" + sanitizedName);
    },
  }),
});

const router = Router();

router.post(
  "/scenarios/:id/process-audio",
  audioUpload.single("audio"),
  processAudio
);
router.post("/scenarios/:id/conversations", saveConversation);
router.get("/scenarios/conversations", getAllConversations);
router.get("/scenarios/:scenarioId/conversations", getConversations);
router.get("/scenarios/:id/conversations/:conversationId", getConversation);

router.get("/scenarios", getScenarios);
router.post("/scenarios", scenarioUpload.array("files"), createScenario);
router.get("/scenarios/:id", getScenarioById);
router.put("/scenarios/:id", scenarioUpload.array("files"), updateScenario);
router.delete("/scenarios/:id", deleteScenario);
router.get("/scenarios/user/:id", getScenarioByUserId);

export default router;
