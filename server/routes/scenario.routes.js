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
import { authRequired } from "../middlewares/validateToken.js";

// Configure multer for file uploads with more robust settings
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    fieldSize: 20 * 1024 * 1024, // Increase field size limit
    fields: 20, // Allow more fields
    files: 10, // Allow up to 10 files
  },
});

const router = Router();

router.post("/scenarios/:id/conversations", saveConversation);
router.get("/scenarios/conversations", getAllConversations);
router.get("/scenarios/:scenarioId/conversations", getConversations);
router.get("/scenarios/:id/conversations/:conversationId", getConversation);

router.get("/scenarios", getScenarios);
// Let the controller handle the file upload middleware
router.post("/scenarios", createScenario);
router.get("/scenarios/:id", getScenarioById);
// Let the controller handle the file upload middleware
router.put("/scenarios/:id", updateScenario);
router.delete("/scenarios/:id", deleteScenario);
router.get("/scenarios/user/:id", getScenarioByUserId);

// Audio processing route with its own multer config and auth middleware
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    fieldSize: 20 * 1024 * 1024, // Increase field size limit
  },
});
router.post(
  "/scenarios/:id/process-audio",
  authRequired,
  audioUpload.single("audio"),
  processAudio
);

export default router;
