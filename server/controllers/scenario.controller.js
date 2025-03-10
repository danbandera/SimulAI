import { connectSqlDB } from "../db.cjs";
import Conversation from "../models/conversation.model.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { uploadToS3, deleteFromS3 } from "../utils/s3.utils.js";
import OpenAI from "openai";
import ffmpeg from "fluent-ffmpeg";
import { decryptValue } from "../libs/encryption.js";
import MistralClient from "../clients/mistral.client.js";
import LlamaClient from "../clients/llama.client.js";

// Set FFmpeg path based on OS
const ffmpegPath =
  process.platform === "darwin"
    ? "/opt/homebrew/bin/ffmpeg"
    : process.platform === "linux"
    ? "/usr/bin/ffmpeg"
    : "ffmpeg";

console.log("Using FFmpeg path:", ffmpegPath);
ffmpeg.setFfmpegPath(ffmpegPath);

// Initialize OpenAI client with null API key
let openai = null;

// Function to get OpenAI API key from settings
const getOpenAIKey = async () => {
  try {
    const { data: settings, error } = await connectSqlDB
      .from("settings")
      .select("openai_key")
      .single();

    if (error || !settings || !settings.openai_key) {
      console.error("Error fetching OpenAI API key from settings:", error);
      throw new Error("OpenAI API key not found in settings");
    }

    return decryptValue(settings.openai_key);
  } catch (error) {
    console.error("Error getting OpenAI API key:", error);
    throw error;
  }
};

// Function to get Mistral API key from settings
const getMistralKey = async () => {
  try {
    const { data: settings, error } = await connectSqlDB
      .from("settings")
      .select("mistral_key")
      .single();

    if (error || !settings || !settings.mistral_key) {
      console.error("Error fetching Mistral API key from settings:", error);
      throw new Error("Mistral API key not found in settings");
    }

    return decryptValue(settings.mistral_key);
  } catch (error) {
    console.error("Error getting Mistral API key:", error);
    throw error;
  }
};

// Function to get Llama API key from settings
const getLlamaKey = async () => {
  try {
    const { data: settings, error } = await connectSqlDB
      .from("settings")
      .select("llama_key")
      .single();

    if (error || !settings || !settings.llama_key) {
      console.error("Error fetching Llama API key from settings:", error);
      throw new Error("Llama API key not found in settings");
    }

    return decryptValue(settings.llama_key);
  } catch (error) {
    console.error("Error getting Llama API key:", error);
    throw error;
  }
};

// Function to get the appropriate AI client based on the scenario settings
const getAIClient = async (assignedIA) => {
  switch (assignedIA) {
    case "openai":
      const openaiKey = await getOpenAIKey();
      return new OpenAI({ apiKey: openaiKey });
    case "mistral":
      const mistralKey = await getMistralKey();
      // Initialize Mistral client here
      return new MistralClient({ apiKey: mistralKey });
    case "llama":
      const llamaKey = await getOpenAIKey();
      // Initialize Llama client here
      return new LlamaClient({ apiKey: llamaKey });
    default:
      throw new Error(`Unsupported AI provider: ${assignedIA}`);
  }
};

// Function to process text with the appropriate AI model
const processWithAI = async (client, model, systemContext, userContent) => {
  switch (client.constructor.name) {
    case "OpenAI":
      const completion = await client.chat.completions.create({
        model: model,
        messages: [
          { role: "system", content: systemContext },
          { role: "user", content: userContent },
        ],
      });
      return completion.choices[0].message.content;

    case "MistralClient":
      // Add Mistral API call here
      const mistralResponse = await client.chat({
        model: model,
        messages: [
          { role: "system", content: systemContext },
          { role: "user", content: userContent },
        ],
      });
      return mistralResponse.choices[0].message.content;

    case "LlamaClient":
      // Add Llama API call here
      const llamaResponse = await client.complete({
        model: model,
        system: systemContext,
        prompt: userContent,
      });
      return llamaResponse.choices[0].text;

    default:
      throw new Error(`Unsupported AI client type: ${client.constructor.name}`);
  }
};

// Create uploads directory if it doesn't exist
const uploadDir = path.join(process.cwd(), "uploads", "scenarios");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Sanitize filename to remove spaces and special characters
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.]/g, "_");
    cb(null, Date.now() + "-" + sanitizedName);
  },
});

const upload = multer({
  storage: multer.memoryStorage(), // Use memory storage instead of disk
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
}).array("files"); // Configure for multiple files with field name 'files'

export const getScenarios = async (req, res) => {
  try {
    const result = await connectSqlDB.from("scenarios").select(`
        *,
        assigned_user:user_id_assigned (
          id,
          name,
          email
        ),
        created_by (
          id,
          name,
          email
        )
      `);
    res.json(result.data);
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getScenarioById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await connectSqlDB
      .from("scenarios")
      .select(
        `
        *,
        assigned_user:user_id_assigned (
          id,
          name,
          email
        ),
        created_by (
          id,
          name,
          email
        )
      `
      )
      .eq("id", id)
      .single();

    if (!result.data) {
      return res.status(404).json({ message: "Scenario not found" });
    }
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getScenarioByUserId = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await connectSqlDB
      .from("scenarios")
      .select()
      .eq("user_id", id);
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createScenario = async (req, res) => {
  try {
    // Use multer as middleware
    upload(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        return res
          .status(400)
          .json({ message: "File upload error", error: err.message });
      } else if (err) {
        return res
          .status(500)
          .json({ message: "Error uploading files", error: err.message });
      }

      try {
        const {
          title,
          description,
          user_id_assigned,
          created_by,
          parent_scenario,
          status,
          aspects,
          assignedIA,
          assignedIAModel,
        } = req.body;

        // Handle file uploads to S3
        const fileUrls = [];
        if (req.files && req.files.length > 0) {
          for (const file of req.files) {
            try {
              const fileUrl = await uploadToS3(file, "documents");
              fileUrls.push(fileUrl);
            } catch (error) {
              console.error("Error uploading file to S3:", error);
            }
          }
        }

        // Parse aspects from JSON string
        let parsedAspects = [];
        try {
          parsedAspects = aspects ? JSON.parse(aspects) : [];
        } catch (error) {
          console.error("Error parsing aspects:", error);
        }

        const { data: scenario, error: scenarioError } = await connectSqlDB
          .from("scenarios")
          .insert({
            title,
            description,
            status,
            user_id_assigned,
            created_by,
            parent_scenario: parent_scenario || null,
            aspects: parsedAspects,
            files: fileUrls,
            assignedIA,
            assignedIAModel,
          })
          .select(
            `
            *,
            assigned_user:user_id_assigned (
              id,
              name,
              email
            ),
            created_by (
              id,
              name,
              email
            )
          `
          )
          .single();

        if (scenarioError) {
          // Clean up uploaded files if scenario creation fails
          for (const fileUrl of fileUrls) {
            try {
              await deleteFromS3(fileUrl);
            } catch (error) {
              console.error("Error deleting file from S3:", error);
            }
          }
          return res.status(400).json({ message: scenarioError.message });
        }

        res.status(201).json(scenario);
      } catch (error) {
        console.error("Create Scenario Error:", error);
        res.status(500).json({ message: error.message });
      }
    });
  } catch (error) {
    console.error("Create Scenario Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const updateScenario = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      status,
      aspects,
      existingFiles,
      assignedIA,
      assignedIAModel,
    } = req.body;
    console.log("assignedIA", assignedIA);
    console.log("assignedIAModel", assignedIAModel);
    // Upload new files to S3
    const newFileUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const fileUrl = await uploadToS3(file, "documents");
          newFileUrls.push(fileUrl);
        } catch (error) {
          console.error("Error uploading file to S3:", error);
          return res.status(500).json({
            message: "Error uploading files to storage",
            error: error.message,
          });
        }
      }
    }

    // Parse existing files and aspects
    let parsedExistingFiles = [];
    let parsedAspects = [];
    try {
      parsedExistingFiles = existingFiles ? JSON.parse(existingFiles) : [];
      parsedAspects = aspects ? JSON.parse(aspects) : [];
    } catch (error) {
      console.error("Error parsing JSON data:", error);
      return res.status(400).json({
        message: "Invalid JSON data provided",
        error: error.message,
      });
    }

    // Combine existing and new file URLs
    const allFiles = [...parsedExistingFiles, ...newFileUrls];

    const { data: scenario, error: scenarioError } = await connectSqlDB
      .from("scenarios")
      .update({
        title,
        description,
        status,
        aspects: parsedAspects,
        files: allFiles,
        assignedIA,
        assignedIAModel,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    console.log("scenario", scenario);
    if (scenarioError) {
      // Clean up newly uploaded files if update fails
      for (const fileUrl of newFileUrls) {
        try {
          await deleteFromS3(fileUrl);
        } catch (error) {
          console.error("Error deleting file from S3:", error);
        }
      }
      return res.status(400).json({ message: scenarioError.message });
    }

    res.json(scenario);
  } catch (error) {
    console.error("Update Scenario Error:", error);
    res.status(500).json({
      message: "Internal server error while updating scenario",
      error: error.message,
    });
  }
};

export const deleteScenario = async (req, res) => {
  try {
    const { id } = req.params;

    // Get scenario data to access file URLs
    const { data: scenario } = await connectSqlDB
      .from("scenarios")
      .select("files")
      .eq("id", id)
      .single();

    // Delete files from S3
    if (scenario && scenario.files) {
      for (const fileUrl of scenario.files) {
        try {
          await deleteFromS3(fileUrl);
        } catch (error) {
          console.error("Error deleting file from S3:", error);
        }
      }
    }

    const result = await connectSqlDB.from("scenarios").delete().eq("id", id);

    if (result.error) {
      return res.status(400).json({ message: result.error.message });
    }
    res.json({ message: "Scenario deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const saveConversation = async (req, res) => {
  try {
    const { scenarioId, conversation, userId } = req.body;

    const conversationToSave = await Conversation.create({
      scenarioId,
      conversation,
      userId,
    });

    res.status(201).json(conversationToSave);
  } catch (error) {
    console.error("Save Conversation Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getConversations = async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const conversations = await Conversation.find({ scenarioId });

    if (!conversations || conversations.length === 0) {
      return res.status(404).json({
        message: `No conversations found for scenario ${scenarioId}`,
      });
    }

    res.json(conversations);
  } catch (error) {
    console.error("Get Conversations Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getConversation = async (req, res) => {
  try {
    const { scenarioId, conversationId } = req.params;
    const conversation = await Conversation.findById(conversationId);
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find();

    if (!conversations || conversations.length === 0) {
      return res.status(404).json({ message: "No conversations found" });
    }

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const processAudio = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No audio file provided" });
  }

  try {
    console.log("Processing audio file:", req.file);

    // Get the scenario ID from the request parameters
    const { id } = req.params;

    // Get the scenario data from the database
    const { data: scenario, error } = await connectSqlDB
      .from("scenarios")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(`Error fetching scenario: ${error.message}`);
    }

    // Get the appropriate AI client based on the scenario's assigned AI
    const aiClient = await getAIClient(scenario.assignedIA);

    // Build the system context using scenario data
    const systemContext = `You are an AI interviewer conducting an evaluation. Here is your context:
    - Scenario Title: ${scenario.title}
    - Description: ${scenario.description}
    - Aspects to evaluate: ${scenario.aspects
      .map((aspect) => aspect.label)
      .join(
        ", "
      )}. Give a score for each aspect from 0 to 100. Example: Aspect 1: 80, Aspect 2: 70, Aspect 3: 90.
    ${
      scenario.aspects
        ? `- Aspects to evaluate: ${scenario.aspects
            .map((aspect) => aspect.label)
            .join(", ")}`
        : ""
    }
    
    IMPORTANT INSTRUCTIONS:
    1. You MUST ONLY respond in Spanish
    2. You should evaluate the candidate based on the aspects mentioned above
    3. Keep your responses professional and constructive
    4. Focus on the scenario context provided`;

    // Get the correct directory paths
    const uploadsDir = path.join(process.cwd(), "uploads");
    const scenariosDir = path.join(uploadsDir, "scenarios");

    console.log("Current directory:", process.cwd());
    console.log("Uploads directory:", uploadsDir);
    console.log("Scenarios directory:", scenariosDir);

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log("Created uploads directory");
    }
    if (!fs.existsSync(scenariosDir)) {
      fs.mkdirSync(scenariosDir, { recursive: true });
      console.log("Created scenarios directory");
    }

    // List directory contents before processing
    console.log(
      "Initial uploads directory contents:",
      fs.readdirSync(uploadsDir)
    );
    console.log(
      "Initial scenarios directory contents:",
      fs.readdirSync(scenariosDir)
    );

    // Create temporary file path for the uploaded audio
    const tempFile = path.join(scenariosDir, `temp-${Date.now()}.webm`);
    fs.writeFileSync(tempFile, req.file.buffer);
    console.log("Temporary file created:", tempFile);

    // Convert webm to wav
    const wavFile = path.join(scenariosDir, `temp-${Date.now()}.wav`);
    console.log("Converting to WAV:", wavFile);

    await new Promise((resolve, reject) => {
      ffmpeg(tempFile)
        .toFormat("wav")
        .audioCodec("pcm_s16le")
        .on("error", (err) => {
          console.error("FFmpeg error:", err);
          reject(err);
        })
        .on("end", () => {
          console.log("FFmpeg conversion complete");
          resolve();
        })
        .save(wavFile);
    });

    console.log("Starting transcription...");
    // Use OpenAI's Whisper for transcription (as specified)
    const openaiForTranscription = new OpenAI({ apiKey: await getOpenAIKey() });
    const transcript = await openaiForTranscription.audio.transcriptions.create(
      {
        file: fs.createReadStream(wavFile),
        model: "whisper-1",
      }
    );
    console.log("Transcription complete:", transcript.text);

    console.log("Getting AI response...");
    // Process with the appropriate AI model
    const response = await processWithAI(
      aiClient,
      scenario.assignedIAModel,
      systemContext,
      transcript.text
    );
    console.log("AI response:", response);

    console.log("Converting to speech...");
    // Use OpenAI's TTS for speech conversion (as specified)
    const mp3 = await openaiForTranscription.audio.speech.create({
      model: "tts-1",
      voice: "fable",
      input: response,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    const responseFile = path.join(scenariosDir, `response-${Date.now()}.mp3`);
    fs.writeFileSync(responseFile, buffer);
    console.log("Speech file saved:", responseFile);

    // Verify the file was created and log its details
    if (!fs.existsSync(responseFile)) {
      throw new Error("Failed to save audio file");
    }
    console.log("Response file size:", fs.statSync(responseFile).size);

    // List directory contents after saving
    console.log(
      "Final scenarios directory contents:",
      fs.readdirSync(scenariosDir)
    );

    // Clean up temporary files
    try {
      fs.unlinkSync(tempFile);
      fs.unlinkSync(wavFile);
      console.log("Temporary files cleaned up");
    } catch (cleanupError) {
      console.error("Error cleaning up temporary files:", cleanupError);
    }

    // Send the response with the file path relative to the uploads directory
    const audioUrl = `/uploads/scenarios/${path.basename(responseFile)}`;
    console.log("Audio URL:", audioUrl);
    console.log("Full file path:", responseFile);
    console.log("File exists check:", fs.existsSync(responseFile));

    res.json({
      transcription: transcript.text,
      response,
      audioUrl,
    });
  } catch (error) {
    console.error("Detailed error in processAudio:", error);
    if (error.response) {
      console.error("OpenAI API error response:", error.response.data);
    }
    res
      .status(500)
      .json({ error: "Failed to process audio", details: error.message });
  }
};
