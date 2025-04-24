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
  generateImage,
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

// Add a route to process the final evaluation message
router.post(
  "/scenarios/:id/process-final-message",
  authRequired,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { message } = req.body;

      console.log(`Processing final message for scenario ${id}`);

      // Get the scenario data from the database
      const { data: scenario, error } = await connectSqlDB
        .from("scenarios")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching scenario:", error);
        return res.status(400).json({
          error: "Failed to fetch scenario",
          details: error.message,
        });
      }

      if (!scenario) {
        console.error(`Scenario with ID ${id} not found`);
        return res.status(404).json({ error: "Scenario not found" });
      }

      console.log(`Scenario found: ${scenario.title}`);

      // Check if aspects exist and are in the expected format
      if (!scenario.aspects) {
        console.log("No aspects found in scenario, using empty array");
        scenario.aspects = [];
      } else if (typeof scenario.aspects === "string") {
        try {
          console.log("Parsing aspects from string");
          scenario.aspects = JSON.parse(scenario.aspects);
        } catch (parseError) {
          console.error("Error parsing aspects:", parseError);
          scenario.aspects = [];
        }
      }

      // Get OpenAI API key from settings
      const { data: settings, error: settingsError } = await connectSqlDB
        .from("settings")
        .select("openai_key, mistral_key, llama_key")
        .single();

      if (settingsError) {
        console.error("Error fetching API keys:", settingsError);
        return res.status(500).json({
          error: "Failed to fetch API keys",
          details: settingsError.message,
        });
      }

      if (!settings) {
        console.error("No settings found");
        return res.status(500).json({ error: "No API settings found" });
      }

      console.log("API settings found");

      // Initialize the appropriate AI client based on scenario settings
      let aiClient;
      let apiKey;

      try {
        // Import the decryption function if needed
        let decryptValue;
        try {
          const { decryptValue: decrypt } = await import(
            "../libs/encryption.js"
          );
          decryptValue = decrypt;
          console.log("Decryption function imported successfully");
        } catch (importError) {
          console.error("Error importing decryption function:", importError);
          // If we can't import the decryption function, we'll try to use the key as is
          decryptValue = (value) => value;
        }

        switch (scenario.assignedIA) {
          case "openai":
            console.log("Using OpenAI provider");
            const OpenAI = (await import("openai")).default;

            try {
              apiKey = decryptValue(settings.openai_key);
              console.log("OpenAI API key decrypted");
            } catch (decryptError) {
              console.error("Error decrypting OpenAI API key:", decryptError);
              // Try using the key as is
              apiKey = settings.openai_key;
              console.log("Using raw OpenAI API key");
            }

            if (!apiKey) {
              console.error("OpenAI API key is missing");
              return res
                .status(500)
                .json({ error: "OpenAI API key is missing" });
            }

            aiClient = new OpenAI({ apiKey });
            break;
          case "mistral":
            console.log("Using Mistral provider");
            apiKey = settings.mistral_key;
            // You would need to implement Mistral client handling here
            return res
              .status(501)
              .json({ error: "Mistral provider not implemented yet" });
          case "llama":
            console.log("Using Llama provider");
            apiKey = settings.llama_key;
            // You would need to implement Llama client handling here
            return res
              .status(501)
              .json({ error: "Llama provider not implemented yet" });
          default:
            console.error(`Unsupported AI provider: ${scenario.assignedIA}`);
            return res.status(400).json({
              error: `Unsupported AI provider: ${
                scenario.assignedIA || "none"
              }`,
            });
        }
      } catch (clientError) {
        console.error("Error initializing AI client:", clientError);
        return res.status(500).json({
          error: "Failed to initialize AI client",
          details: clientError.message,
        });
      }

      if (!aiClient) {
        console.error("Failed to initialize AI client");
        return res
          .status(500)
          .json({ error: "Failed to initialize AI client" });
      }

      // Build the system context using scenario data
      const aspectsText =
        scenario.aspects && Array.isArray(scenario.aspects)
          ? scenario.aspects
              .map((aspect) => aspect.label || aspect.value || aspect)
              .join(", ")
          : "";

      const systemContext = `You are an AI evaluator reviewing a conversation. 
      Here is your context:
      - Scenario Title: ${scenario.title || "No title"}
      - Description: ${scenario.context || "No context"}
      ${
        aspectsText
          ? `- Aspects to evaluate: ${aspectsText}`
          : "- No specific aspects to evaluate"
      }
      ${
        scenario.pdf_contents
          ? `- Content from PDFs: ${scenario.pdf_contents}`
          : ""
      }
      
      IMPORTANT INSTRUCTIONS:
      1. You MUST ONLY respond in Spanish
      2. You should evaluate the candidate based on the aspects mentioned above
      3. Keep your responses professional and constructive
      4. Provide a numerical score from 0 to 100 for each aspect
      5. Format your response with one aspect score per line`;

      console.log("System context created, sending to AI");

      // Process with the appropriate AI model
      let response;
      try {
        if (scenario.assignedIA === "openai") {
          const model = scenario.assignedIAModel || "gpt-4o";
          console.log(`Using OpenAI model: ${model}`);

          const completion = await aiClient.chat.completions.create({
            model: model,
            messages: [
              { role: "system", content: systemContext },
              { role: "user", content: message },
            ],
            temperature: 0.7,
            max_tokens: 500,
          });

          response = completion.choices[0].message.content;
          console.log("Received response from OpenAI");
        } else {
          // Handle other AI providers here
          response =
            "No se pudo procesar la solicitud con el proveedor de IA seleccionado.";
        }
      } catch (aiError) {
        console.error("Error calling AI service:", aiError);
        if (aiError.response) {
          console.error("AI service response:", aiError.response.data);
        }
        return res.status(500).json({
          error: "Failed to process with AI service",
          details: aiError.message,
        });
      }

      console.log("Successfully processed final message");
      res.json({ response });
    } catch (error) {
      console.error("Unhandled error in process-final-message:", error);
      res.status(500).json({
        error: "Failed to process final message",
        details: error.message,
        stack: error.stack,
      });
    }
  }
);

// router.post("/scenarios/:id/audio", upload.single("audio"), processAudio);
router.post("/scenarios/generate-image", generateImage);

export default router;
