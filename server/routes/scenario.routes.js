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

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

const router = Router();

router.post("/scenarios/:id/conversations", saveConversation);
router.get("/scenarios/conversations", getAllConversations);
router.get("/scenarios/:scenarioId/conversations", getConversations);
router.get("/scenarios/:id/conversations/:conversationId", getConversation);

router.get("/scenarios", getScenarios);
router.post("/scenarios", upload.array("files"), createScenario);
router.get("/scenarios/:id", getScenarioById);
router.put("/scenarios/:id", upload.array("files"), updateScenario);
router.delete("/scenarios/:id", deleteScenario);
router.get("/scenarios/user/:id", getScenarioByUserId);

// Audio processing route with its own multer config and auth middleware
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});
router.post(
  "/scenarios/:id/process-audio",
  authRequired,
  audioUpload.single("audio"),
  processAudio
);

export default router;
