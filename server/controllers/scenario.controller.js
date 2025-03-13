import { connectSqlDB } from "../db.cjs";
import Conversation from "../models/conversation.model.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { uploadToS3, deleteFromS3 } from "../utils/s3.utils.js";
import { processPDFFiles } from "../utils/pdf.utils.js";
import OpenAI from "openai";
import ffmpeg from "fluent-ffmpeg";
import { decryptValue } from "../libs/encryption.js";
import MistralClient from "../clients/mistral.client.js";
import LlamaClient from "../clients/llama.client.js";
import OpenAIClient from "../clients/openai.client.js";

// Set FFmpeg path based on OS
const ffmpegPath =
  process.platform === "darwin"
    ? "/opt/homebrew/bin/ffmpeg"
    : process.platform === "linux"
    ? "/usr/bin/ffmpeg"
    : "ffmpeg";

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
      return new OpenAIClient({ apiKey: openaiKey });
    case "mistral":
      const mistralKey = await getMistralKey();
      return new MistralClient({ apiKey: mistralKey });
    case "llama":
      const llamaKey = await getLlamaKey();
      return new LlamaClient({ apiKey: llamaKey });
    default:
      throw new Error(`Unsupported AI provider: ${assignedIA}`);
  }
};

// Function to process text with the appropriate AI model
const processWithAI = async (client, model, systemContext, userContent) => {
  const messages = [
    { role: "system", content: systemContext },
    { role: "user", content: userContent },
  ];

  switch (client.constructor.name) {
    case "OpenAIClient":
    case "MistralClient":
      const response = await client.chat({
        model: model,
        messages: messages,
      });
      return response.choices[0].message.content;

    case "LlamaClient":
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

// Create a more robust multer instance with error handling
const upload = multer({
  storage: multer.memoryStorage(), // Use memory storage instead of disk
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    fieldSize: 20 * 1024 * 1024, // Increase field size limit
    fields: 20, // Allow more fields
    files: 10, // Allow up to 10 files
  },
  fileFilter: (req, file, cb) => {
    // Accept all file types, but flag PDFs for special processing
    if (file.mimetype === "application/pdf") {
      file.isPdf = true;
    }
    cb(null, true);
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
        console.error("Multer error:", err);
        return res
          .status(400)
          .json({ message: "File upload error", error: err.message });
      } else if (err) {
        console.error("Upload error:", err);
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

        // Validate required fields
        if (!title) {
          return res.status(400).json({ message: "Title is required" });
        }
        if (!user_id_assigned) {
          return res
            .status(400)
            .json({ message: "User assignment is required" });
        }
        if (!created_by) {
          return res
            .status(400)
            .json({ message: "Creator information is required" });
        }

        // Handle file uploads to S3
        const fileUrls = [];
        let pdfContents = "";

        if (req.files && req.files.length > 0) {
          // Process PDF files to extract content
          try {
            pdfContents = await processPDFFiles(req.files);
            console.log(`Processed PDF files`);
          } catch (pdfError) {
            console.error("Error processing PDF files:", pdfError);
            // Continue with the scenario creation even if PDF processing fails
          }

          // Upload all files to S3
          for (const file of req.files) {
            try {
              const fileUrl = await uploadToS3(file, "documents");
              fileUrls.push(fileUrl);
            } catch (error) {
              console.error("Error uploading file to S3:", error);
              console.error("Error stack:", error.stack);
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

        // Create scenario with PDF contents
        const scenarioData = {
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
        };

        // Only add pdf_contents if we have any
        if (pdfContents) {
          scenarioData.pdf_contents = pdfContents;
        }

        const { data: scenario, error: scenarioError } = await connectSqlDB
          .from("scenarios")
          .insert(scenarioData)
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
        console.error("Error stack:", error.stack);
        res.status(500).json({
          message: error.message,
          stack: error.stack,
          details: "Error occurred while processing scenario creation",
        });
      }
    });
  } catch (error) {
    console.error("Create Scenario Error (outer):", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      message: error.message,
      stack: error.stack,
      details: "Error occurred in the outer try-catch block",
    });
  }
};

export const updateScenario = async (req, res) => {
  try {
    // Use multer as middleware
    upload(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        console.error("Multer error during update:", err);
        return res
          .status(400)
          .json({ message: "File upload error", error: err.message });
      } else if (err) {
        console.error("Upload error during update:", err);
        return res
          .status(500)
          .json({ message: "Error uploading files", error: err.message });
      }

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

        // Get existing scenario data to access current PDF contents and files
        const { data: existingScenario } = await connectSqlDB
          .from("scenarios")
          .select("pdf_contents, files")
          .eq("id", id)
          .single();

        let existingPdfContents = existingScenario?.pdf_contents || "";
        const currentStoredFiles = existingScenario?.files || [];

        // Upload new files to S3
        const newFileUrls = [];
        let newPdfContents = "";

        if (req.files && req.files.length > 0) {
          // Process new PDF files
          try {
            newPdfContents = await processPDFFiles(req.files);
            console.log(`Processed new PDF files`);
          } catch (pdfError) {
            console.error("Error processing new PDF files:", pdfError);
            // Continue with the scenario update even if PDF processing fails
          }

          // Upload all new files to S3
          for (const file of req.files) {
            try {
              const fileUrl = await uploadToS3(file, "documents");
              newFileUrls.push(fileUrl);
            } catch (error) {
              console.error("Error uploading update file to S3:", error);
              console.error("Error stack:", error.stack);
              return res.status(500).json({
                message: "Error uploading files to storage",
                error: error.message,
              });
            }
          }
        }

        // Parse existing files from request body
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

        // Determine if we need to regenerate PDF contents
        const filesChanged =
          JSON.stringify(currentStoredFiles) !==
          JSON.stringify(parsedExistingFiles);

        // Always regenerate PDF contents if files have changed
        let finalPdfContents = existingPdfContents;

        if (filesChanged) {
          // Process new PDF files to extract content
          try {
            finalPdfContents = await processPDFFiles(req.files);
            console.log(`Processed new PDF files`);
          } catch (pdfError) {
            console.error("Error processing new PDF files:", pdfError);
            // Continue with the scenario update even if PDF processing fails
          }
        } else if (newPdfContents) {
          // No files were removed, but new ones were added
          finalPdfContents = existingPdfContents
            ? `${existingPdfContents}

--- NEW CONTENT ---

${newPdfContents}`
            : newPdfContents;
        }

        // Combine existing and new file URLs
        const allFiles = [...parsedExistingFiles, ...newFileUrls];

        // Prepare update data
        const updateData = {
          title,
          description,
          status,
          aspects: parsedAspects,
          files: allFiles,
          assignedIA,
          assignedIAModel,
          updated_at: new Date().toISOString(),
          pdf_contents: finalPdfContents,
        };

        const { data: scenario, error: scenarioError } = await connectSqlDB
          .from("scenarios")
          .update(updateData)
          .eq("id", id)
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
          console.error("Database error updating scenario:", scenarioError);
          // Clean up uploaded files if update fails
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
        console.error("Error stack:", error.stack);
        res.status(500).json({
          message: "Internal server error while updating scenario",
          error: error.message,
          stack: error.stack,
        });
      }
    });
  } catch (error) {
    console.error("Update Scenario Error (outer):", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      message: "Internal server error while updating scenario",
      error: error.message,
      stack: error.stack,
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

    const conversations = await Conversation.find({
      scenarioId: Number(scenarioId),
    });

    // Return empty array if no conversations found instead of 404
    res.json(conversations || []);
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

    // Get OpenAI client specifically for audio processing
    const openaiKey = await getOpenAIKey();
    const openaiClient = new OpenAIClient({ apiKey: openaiKey });

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
    - PDF contents: ${scenario.pdf_contents}
    
    IMPORTANT INSTRUCTIONS:
    1. You MUST ONLY respond in Spanish
    2. You should evaluate the candidate based on the aspects mentioned above
    3. Keep your responses professional and constructive
    4. Focus on the scenario context provided`;

    // Get the correct directory paths
    const uploadsDir = path.join(process.cwd(), "uploads");
    const scenariosDir = path.join(uploadsDir, "scenarios");

    // Ensure directories exist
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(scenariosDir)) {
      fs.mkdirSync(scenariosDir, { recursive: true });
    }

    // Create temporary file path for the uploaded audio
    const tempFile = path.join(scenariosDir, `temp-${Date.now()}.webm`);
    fs.writeFileSync(tempFile, req.file.buffer);

    // Upload user's audio to S3 first
    const userAudioUrl = await uploadToS3(
      {
        buffer: req.file.buffer,
        originalname: `user-audio-${Date.now()}.webm`,
        mimetype: req.file.mimetype,
      },
      "audio-responses"
    );

    // Convert webm to wav
    const wavFile = path.join(scenariosDir, `temp-${Date.now()}.wav`);

    await new Promise((resolve, reject) => {
      ffmpeg(tempFile)
        .toFormat("wav")
        .audioCodec("pcm_s16le")
        .on("error", (err) => {
          console.error("FFmpeg error:", err);
          reject(err);
        })
        .on("end", () => {
          resolve();
        })
        .save(wavFile);
    });

    // Use OpenAI's Whisper for transcription
    const transcript = await openaiClient.createTranscription(
      fs.createReadStream(wavFile)
    );

    // Process with the appropriate AI model
    const response = await processWithAI(
      aiClient,
      scenario.assignedIAModel,
      systemContext,
      transcript.text
    );

    // Generate speech from response
    const mp3 = await openaiClient.createSpeech(response);

    const buffer = Buffer.from(await mp3.arrayBuffer());
    const tempResponseFile = path.join(
      scenariosDir,
      `response-${Date.now()}.mp3`
    );
    fs.writeFileSync(tempResponseFile, buffer);

    // Upload the AI response audio to S3
    const s3AudioUrl = await uploadToS3(
      {
        buffer: buffer,
        originalname: `ai-response-${Date.now()}.mp3`,
        mimetype: "audio/mpeg",
      },
      "audio-responses"
    );

    // Clean up all temporary files
    try {
      fs.unlinkSync(tempFile);
      fs.unlinkSync(wavFile);
      fs.unlinkSync(tempResponseFile);
    } catch (cleanupError) {
      console.error("Error cleaning up temporary files:", cleanupError);
    }

    // Save the conversation with both audio URLs
    const conversationToSave = await Conversation.create({
      scenarioId: Number(id),
      userId: req.user.id,
      conversation: [
        {
          role: "user",
          message: transcript.text,
          audioUrl: userAudioUrl,
        },
        {
          role: "assistant",
          message: response,
          audioUrl: s3AudioUrl,
        },
      ],
    });

    res.json({
      transcription: transcript.text,
      response,
      userAudioUrl: userAudioUrl,
      aiAudioUrl: s3AudioUrl,
      conversation: conversationToSave,
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
