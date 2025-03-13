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
import { connectSqlDB } from "../db.cjs";

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

// Add a new route to get PDF contents for a specific scenario
router.get("/scenarios/:id/pdf-contents", async (req, res) => {
  try {
    const { id } = req.params;

    // Check if id is valid
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ message: "Invalid scenario ID" });
    }

    const { data, error } = await connectSqlDB
      .from("scenarios")
      .select("pdf_contents, files")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Database error fetching PDF contents:", error);
      return res.status(400).json({ message: error.message });
    }

    if (!data) {
      return res.status(404).json({ message: "Scenario not found" });
    }

    // If no PDF contents but we have files, return empty array with a message
    if (!data.pdf_contents && data.files && data.files.length > 0) {
      const pdfFiles = data.files.filter((file) =>
        file.toLowerCase().endsWith(".pdf")
      );

      if (pdfFiles.length > 0) {
        return res.json({
          pdf_contents: [],
          message:
            "PDF files exist but content has not been extracted. Try re-uploading the PDFs.",
        });
      }
    }

    // Return empty array if no PDF contents
    if (!data.pdf_contents) {
      return res.json({
        pdf_contents: [],
        message: "No PDF content available for this scenario",
      });
    }

    res.json({
      pdf_contents: data.pdf_contents,
      count: data.pdf_contents.length,
    });
  } catch (error) {
    console.error("Error fetching PDF contents:", error);
    res.status(500).json({
      message: "Server error while fetching PDF contents",
      error: error.message,
    });
  }
});

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
