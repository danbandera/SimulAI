import { connectSqlDB } from "../db.cjs";
import multer from "multer";
import { uploadToS3, deleteFromS3 } from "../utils/s3.utils.js";
import { processPDFFiles } from "../utils/pdf.utils.js";
import OpenAI from "openai";
import ffmpeg from "fluent-ffmpeg";
import { decryptValue } from "../libs/encryption.js";
import PDFDocument from "pdfkit";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ImageRun,
} from "docx";

// Set FFmpeg path based on OS
const ffmpegPath =
  process.platform === "darwin"
    ? "/opt/homebrew/bin/ffmpeg"
    : process.platform === "linux"
    ? "/usr/bin/ffmpeg"
    : "ffmpeg";

ffmpeg.setFfmpegPath(ffmpegPath);

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
        created_by (
          id,
          name,
          email
        )
      `);

    if (result.data && Array.isArray(result.data)) {
      result.data.forEach((scenario) => {
        if (scenario.time_limit !== undefined) {
          scenario.timeLimit = scenario.time_limit;
        }

        if (!scenario.users) {
          scenario.users = [];
        }
      });
    }

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

    // Rename time_limit to timeLimit for client-side consistency
    if (result.data.time_limit !== undefined) {
      result.data.timeLimit = result.data.time_limit;
    }

    // Ensure users is always an array
    if (!result.data.users) {
      result.data.users = [];
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
          context,
          created_by,
          parent_scenario,
          status,
          aspects,
          categories,
          assignedIA,
          assignedIAModel,
          generatedImageUrl,
          show_image_prompt,
        } = req.body;

        // Get users_assigned as an array
        const users_assigned = req.body.users_assigned
          ? Array.isArray(req.body.users_assigned)
            ? req.body.users_assigned
            : [req.body.users_assigned]
          : [];

        // Validate required fields
        if (!title) {
          return res.status(400).json({ message: "Title is required" });
        }
        if (users_assigned.length === 0) {
          return res
            .status(400)
            .json({ message: "At least one user assignment is required" });
        }
        if (!created_by) {
          return res
            .status(400)
            .json({ message: "Creator information is required" });
        }

        // Handle file uploads to S3
        const fileUrls = [];
        let pdfContents = "";

        // Handle generated image URL if present
        let generatedImageS3Url = null;
        if (generatedImageUrl) {
          try {
            // Download the image from OpenAI URL
            const imageFetchResponse = await fetch(generatedImageUrl);
            const imageBuffer = await imageFetchResponse.arrayBuffer();

            // Upload to S3
            generatedImageS3Url = await uploadToS3(
              {
                buffer: Buffer.from(imageBuffer),
                originalname: `generated-${Date.now()}.png`,
                mimetype: "image/png",
              },
              "generated-images"
            );
            console.log("Generated image uploaded to S3:", generatedImageS3Url);
          } catch (imageError) {
            console.error("Error processing generated image:", imageError);
            // Continue with scenario creation even if image processing fails
          }
        }

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

        // Create scenario with PDF contents and users array
        const scenarioData = {
          title,
          context,
          status,
          users: users_assigned.map((id) => Number(id)), // Store as array of numbers
          created_by,
          parent_scenario: parent_scenario || null,
          aspects: aspects,
          categories: categories,
          files: fileUrls,
          assignedIA,
          assignedIAModel,
          generated_image_url: generatedImageS3Url,
          show_image_prompt: show_image_prompt,
          interactive_avatar: req.body.interactive_avatar,
          avatar_language: req.body.avatar_language,
          time_limit: req.body.timeLimit ? parseInt(req.body.timeLimit) : 30,
        };

        // Only add pdf_contents if we have any
        if (pdfContents) {
          scenarioData.pdf_contents = pdfContents;
        }

        const { data: scenario, error: scenarioError } = await connectSqlDB
          .from("scenarios")
          .insert(scenarioData)
          .select()
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
          // Also clean up the generated image if it was uploaded
          if (generatedImageS3Url) {
            try {
              await deleteFromS3(generatedImageS3Url);
            } catch (error) {
              console.error("Error deleting generated image from S3:", error);
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
          context,
          status,
          aspects,
          categories,
          existingFiles,
          assignedIA,
          assignedIAModel,
          generatedImageUrl,
          show_image_prompt,
        } = req.body;

        // Get users_assigned as an array
        const users_assigned = req.body.users_assigned
          ? Array.isArray(req.body.users_assigned)
            ? req.body.users_assigned
            : [req.body.users_assigned]
          : [];

        // Get existing scenario data to access current PDF contents and files
        const { data: existingScenario } = await connectSqlDB
          .from("scenarios")
          .select("pdf_contents, files, generated_image_url")
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
        try {
          parsedExistingFiles = existingFiles ? JSON.parse(existingFiles) : [];
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

        // Handle generated image URL if present
        let generatedImageS3Url = null;
        if (generatedImageUrl && !existingScenario?.generated_image_url) {
          try {
            // Download the image from OpenAI URL
            const imageFetchResponse = await fetch(generatedImageUrl);
            const imageBuffer = await imageFetchResponse.arrayBuffer();

            // Upload to S3
            generatedImageS3Url = await uploadToS3(
              {
                buffer: Buffer.from(imageBuffer),
                originalname: `generated-${Date.now()}.png`,
                mimetype: "image/png",
              },
              "generated-images"
            );
            console.log("Generated image uploaded to S3:", generatedImageS3Url);
          } catch (imageError) {
            console.error("Error processing generated image:", imageError);
            // Continue with scenario update even if image processing fails
          }
        }

        // Prepare update data
        const updateData = {
          title,
          context,
          status,
          aspects: aspects,
          categories: categories,
          files: allFiles,
          assignedIA,
          assignedIAModel,
          updated_at: new Date().toISOString(),
          pdf_contents: finalPdfContents,
          generated_image_url:
            generatedImageS3Url || existingScenario?.generated_image_url,
          show_image_prompt: show_image_prompt === "true",
          interactive_avatar: req.body.interactive_avatar,
          avatar_language: req.body.avatar_language,
          time_limit: req.body.timeLimit
            ? parseInt(req.body.timeLimit)
            : existingScenario?.time_limit || 30,
        };

        // Update users array if users_assigned is provided
        if (users_assigned.length > 0) {
          updateData.users = users_assigned.map((id) => Number(id));
        }

        const { data: scenario, error: scenarioError } = await connectSqlDB
          .from("scenarios")
          .update(updateData)
          .eq("id", id)
          .select()
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

// Save Conversation in sql database
export const saveConversation = async (req, res) => {
  try {
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("Request params:", req.params);

    // Extract data from the request
    const { conversation, facialExpressions, elapsedTime } = req.body;
    const userId = req.body.userId || req.body.user_id;
    const scenarioId = req.params.id;

    // Validate required fields with detailed error messages
    if (!scenarioId) {
      return res.status(400).json({ message: "Missing scenarioId parameter" });
    }

    if (!userId) {
      return res.status(400).json({ message: "Missing userId parameter" });
    }

    if (!conversation || !Array.isArray(conversation)) {
      return res
        .status(400)
        .json({ message: "Missing or invalid conversation data" });
    }

    console.log("Saving conversation:", {
      scenarioId,
      userId,
      conversationLength: conversation.length,
      conversationSample: conversation.slice(0, 1),
      facialExpressionsCount: facialExpressions?.length || 0,
      elapsedTime: elapsedTime || 0,
    });

    // Insert the conversation data into the database
    const { data, error } = await connectSqlDB
      .from("conversations")
      .insert({
        scenario_id: Number(scenarioId),
        conversation,
        user_id: Number(userId),
        facial_expressions: facialExpressions || [],
        elapsed_time: elapsedTime || 0,
      })
      .select();

    if (error) {
      console.error("Database error:", error);
      throw new Error(error.message);
    }

    res.status(201).json({ message: "Conversation saved successfully", data });
  } catch (error) {
    console.error("Save Conversation Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getConversations = async (req, res) => {
  try {
    const { scenarioId } = req.params;

    const { data, error } = await connectSqlDB
      .from("conversations")
      .select("*")
      .eq("scenario_id", Number(scenarioId));

    if (error) {
      throw new Error(error.message);
    }

    // Return empty array if no conversations found instead of 404
    res.json(data || []);
  } catch (error) {
    console.error("Get Conversations Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const { data, error } = await connectSqlDB
      .from("conversations")
      .select("*")
      .eq("id", Number(conversationId))
      .single();

    if (error) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllConversations = async (req, res) => {
  try {
    const { data, error } = await connectSqlDB
      .from("conversations")
      .select("*");

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ message: "No conversations found" });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const generateImage = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    console.log("Fetching OpenAI API key from settings...");
    // Get OpenAI API key from settings
    const { data: settings, error: settingsError } = await connectSqlDB
      .from("settings")
      .select("openai_key")
      .single();

    if (settingsError) {
      console.error("Database error:", settingsError);
      return res
        .status(500)
        .json({ message: "Database error", error: settingsError.message });
    }

    if (!settings || !settings.openai_key) {
      console.error("OpenAI API key not found in settings");
      return res.status(500).json({ message: "OpenAI API key not found" });
    }

    console.log("Decrypting API key...");
    let apiKey;
    try {
      apiKey = decryptValue(settings.openai_key);
      console.log("API key decrypted successfully");
    } catch (decryptError) {
      console.error("Error decrypting API key:", decryptError);
      // If decryption fails, try using the key as is
      apiKey = settings.openai_key;
      console.log("Using raw API key");
    }

    if (!apiKey) {
      console.error("No valid API key available");
      return res.status(500).json({ message: "No valid API key available" });
    }

    console.log("Initializing OpenAI client...");
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    console.log("Generating image with prompt:", prompt);
    // Generate image using DALL-E
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    console.log("Image generated successfully");
    // Return the OpenAI image URL directly
    res.json({ url: imageResponse.data[0].url });
  } catch (error) {
    console.error("Detailed error in generateImage:", error);
    if (error.response) {
      console.error("OpenAI API error response:", error.response.data);
    }
    res.status(500).json({
      message: "Error generating image",
      error: error.message,
      details: error.response?.data || "No additional details",
    });
  }
};

// OpenAI assistants endpoint
export const getOpenAIAssistants = async (req, res) => {
  try {
    // Get OpenAI API key from settings
    const { data: settings, error: settingsError } = await connectSqlDB
      .from("settings")
      .select("openai_key")
      .single();

    if (settingsError) {
      console.error("Error fetching API keys:", settingsError);
      return res.status(500).json({
        error: "Failed to fetch API keys",
        details: settingsError.message,
      });
    }

    if (!settings || !settings.openai_key) {
      console.error("No OpenAI API key found");
      return res.status(500).json({ error: "No OpenAI API key found" });
    }

    const apiKey = decryptValue(settings.openai_key);

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Fetch assistants
    const assistants = await openai.beta.assistants.list({
      limit: 10,
    });

    // Return the assistants
    res.json({ assistants: assistants.data });
  } catch (error) {
    console.error("Error fetching OpenAI assistants:", error);
    res.status(500).json({
      error: "Error fetching OpenAI assistants",
      details: error.message,
    });
  }
};

// Generate report with assistant
export const generateReportWithAssistant = async (req, res) => {
  try {
    const { assistantId, messages, systemPrompt } = req.body;

    if (!assistantId || !messages || !systemPrompt) {
      return res.status(400).json({
        error: "Missing required parameters",
        details: "assistantId, messages, and systemPrompt are required",
      });
    }

    // Get OpenAI API key from settings
    const { data: settings, error: settingsError } = await connectSqlDB
      .from("settings")
      .select("openai_key")
      .single();

    if (settingsError) {
      console.error("Error fetching API key:", settingsError);
      return res.status(500).json({
        error: "Failed to fetch API key",
        details: settingsError.message,
      });
    }

    if (!settings || !settings.openai_key) {
      console.error("No OpenAI API key found");
      return res.status(500).json({ error: "No OpenAI API key found" });
    }

    const apiKey = decryptValue(settings.openai_key);

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Method 1: Use assistants API with threads
    try {
      // Create a thread
      const thread = await openai.beta.threads.create();

      // Add messages to the thread
      await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: systemPrompt,
      });

      // Add conversation messages
      for (const message of messages) {
        await openai.beta.threads.messages.create(thread.id, {
          role: message.role,
          content: message.content,
        });
      }

      // Run the assistant
      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistantId,
      });

      // Wait for completion (this is a simple polling approach)
      let runStatus = await openai.beta.threads.runs.retrieve(
        thread.id,
        run.id
      );

      // Poll for completion - in production, you'd use a webhook
      while (
        runStatus.status !== "completed" &&
        runStatus.status !== "failed"
      ) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      }

      if (runStatus.status === "failed") {
        throw new Error(
          `Assistant run failed: ${
            runStatus.last_error?.message || "Unknown error"
          }`
        );
      }

      // Get the messages from the thread
      const messages = await openai.beta.threads.messages.list(thread.id);

      // Extract the latest assistant response
      const assistantMessages = messages.data
        .filter((msg) => msg.role === "assistant")
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      if (assistantMessages.length > 0) {
        const responseContent = assistantMessages[0].content[0].text.value;
        return res.json({ report: responseContent });
      } else {
        return res.status(404).json({ error: "No assistant response found" });
      }
    } catch (assistantError) {
      console.error("Error using Assistants API:", assistantError);

      // Method 2: Fallback to regular ChatCompletion API
      try {
        console.log("Falling back to Chat Completion API");

        const systemMessage = { role: "system", content: systemPrompt };
        const allMessages = [systemMessage, ...messages];

        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: allMessages,
          temperature: 0.7,
          max_tokens: 1500,
        });

        return res.json({ report: completion.choices[0].message.content });
      } catch (chatError) {
        console.error("Error with Chat Completion fallback:", chatError);
        throw chatError; // Re-throw to be caught by outer catch block
      }
    }
  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).json({
      error: "Error generating report",
      details: error.message,
    });
  }
};

// Save report to database
export const saveReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, conversations_ids, user_id } = req.body;

    if (!id || !title || !content || !user_id) {
      return res.status(400).json({
        message: "Missing required parameters",
        details: "Scenario ID, title, content, and user ID are required",
      });
    }

    // Validate scenario exists
    const { data: scenario, error: scenarioError } = await connectSqlDB
      .from("scenarios")
      .select("id")
      .eq("id", id)
      .single();

    if (scenarioError || !scenario) {
      return res.status(404).json({ message: "Scenario not found" });
    }

    // Save report to database
    const { data: report, error } = await connectSqlDB
      .from("reports")
      .insert({
        scenario_id: Number(id),
        user_id: Number(user_id),
        title,
        content,
        conversations_ids: conversations_ids || [],
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving report:", error);
      return res.status(500).json({
        message: "Failed to save report",
        details: error.message,
      });
    }

    res.status(201).json({
      message: "Report saved successfully",
      report,
    });
  } catch (error) {
    console.error("Error in saveReport:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get all reports for a scenario
export const getReports = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await connectSqlDB
      .from("reports")
      .select(
        `
        *,
        user:user_id (
          id,
          name,
          email
        )
      `
      )
      .eq("scenario_id", Number(id))
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching reports:", error);
      return res.status(500).json({
        message: "Failed to fetch reports",
        details: error.message,
      });
    }

    res.json(data || []);
  } catch (error) {
    console.error("Error in getReports:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get a specific report by ID
export const getReportById = async (req, res) => {
  try {
    const { id, reportId } = req.params;

    const { data, error } = await connectSqlDB
      .from("reports")
      .select(
        `
        *,
        user:user_id (
          id,
          name,
          email
        )
      `
      )
      .eq("id", Number(reportId))
      .eq("scenario_id", Number(id))
      .single();

    if (error) {
      console.error("Error fetching report:", error);
      return res.status(404).json({ message: "Report not found" });
    }

    res.json(data);
  } catch (error) {
    console.error("Error in getReportById:", error);
    res.status(500).json({ message: error.message });
  }
};

// Export report to PDF
export const exportReportToPdf = async (req, res) => {
  try {
    const { id, reportId } = req.params;

    // Get report data with user information
    const { data: report, error } = await connectSqlDB
      .from("reports")
      .select(
        `
        *,
        user:user_id (
          id,
          name,
          email,
          company_id
        )
      `
      )
      .eq("id", Number(reportId))
      .eq("scenario_id", Number(id))
      .single();

    if (error || !report) {
      console.error("Error fetching report:", error);
      return res.status(404).json({ message: "Report not found" });
    }

    // Get scenario data for header
    const { data: scenario } = await connectSqlDB
      .from("scenarios")
      .select("title")
      .eq("id", Number(id))
      .single();

    // Get company information if user has a company
    let company = null;
    if (report.user?.company_id) {
      const { data: companyData } = await connectSqlDB
        .from("companies")
        .select("name, logo")
        .eq("id", report.user.company_id)
        .single();
      company = companyData;
    }

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=report-${reportId}.pdf`
    );

    // Pipe PDF document to response
    doc.pipe(res);

    // Add company header if available
    if (company) {
      const headerY = 50;

      // Add company name on the left
      doc.fontSize(14).text(company.name, 50, headerY, { align: "left" });

      // Add company logo on the right if available
      if (company.logo) {
        try {
          // Fetch logo from URL
          const logoResponse = await fetch(company.logo);
          if (logoResponse.ok) {
            const logoBuffer = await logoResponse.arrayBuffer();
            const logoImage = Buffer.from(logoBuffer);

            // Add logo to the right side of the header
            doc.image(logoImage, doc.page.width - 150, headerY - 10, {
              fit: [100, 40],
              align: "right",
            });
          }
        } catch (logoError) {
          console.error("Error adding logo to PDF:", logoError);
          // Continue without logo if there's an error
        }
      }

      // Move down after header
      doc.moveDown(3);
    }

    // Add content to PDF
    doc.fontSize(20).text(`${report.title}`, { align: "center" });
    doc.moveDown();
    doc
      .fontSize(12)
      .text(`Scenario: ${scenario?.title || "Unknown"}`, { align: "left" });
    doc
      .fontSize(12)
      .text(`Generated: ${new Date(report.created_at).toLocaleString()}`, {
        align: "left",
      });
    doc
      .fontSize(12)
      .text(`By: ${report.user?.name || "Unknown"}`, { align: "left" });
    doc.moveDown();

    // Add a horizontal line
    doc
      .moveTo(50, doc.y)
      .lineTo(doc.page.width - 50, doc.y)
      .stroke();
    doc.moveDown();

    // Add report content - handle Markdown-like formatting
    const lines = report.content.split("\n");
    lines.forEach((line) => {
      if (line.startsWith("# ")) {
        doc.fontSize(18).text(line.replace("# ", ""), { align: "left" });
      } else if (line.startsWith("## ")) {
        doc.fontSize(16).text(line.replace("## ", ""), { align: "left" });
      } else if (line.startsWith("### ")) {
        doc.fontSize(14).text(line.replace("### ", ""), { align: "left" });
      } else if (line.match(/^[A-Za-z\s]+: \d+$/)) {
        // Format aspect scores
        doc.fontSize(12).text(line, { continued: false });
      } else if (line.trim() === "") {
        doc.moveDown();
      } else {
        doc.fontSize(12).text(line);
      }
    });

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error("Error in exportReportToPdf:", error);
    res.status(500).json({ message: error.message });
  }
};

// Export report to Word document
export const exportReportToWord = async (req, res) => {
  try {
    const { id, reportId } = req.params;

    // Get report data with user information
    const { data: report, error } = await connectSqlDB
      .from("reports")
      .select(
        `
        *,
        user:user_id (
          id,
          name,
          email,
          company_id
        )
      `
      )
      .eq("id", Number(reportId))
      .eq("scenario_id", Number(id))
      .single();

    if (error || !report) {
      console.error("Error fetching report:", error);
      return res.status(404).json({ message: "Report not found" });
    }

    // Get scenario data for header
    const { data: scenario } = await connectSqlDB
      .from("scenarios")
      .select("title")
      .eq("id", Number(id))
      .single();

    // Get company information if user has a company
    let company = null;
    if (report.user?.company_id) {
      const { data: companyData } = await connectSqlDB
        .from("companies")
        .select("name, logo")
        .eq("id", report.user.company_id)
        .single();
      company = companyData;
    }

    // Prepare header content
    const headerChildren = [];

    // Add company header if available
    if (company) {
      let logoBuffer = null;

      // Fetch logo if available
      if (company.logo) {
        try {
          const logoResponse = await fetch(company.logo);
          if (logoResponse.ok) {
            const logoArrayBuffer = await logoResponse.arrayBuffer();
            logoBuffer = Buffer.from(logoArrayBuffer);
          }
        } catch (logoError) {
          console.error("Error fetching logo for Word document:", logoError);
          // Continue without logo if there's an error
        }
      }

      // Create a table for header layout (company name left, logo right)
      const headerTable = new Table({
        width: {
          size: 100,
          type: WidthType.PERCENTAGE,
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    text: company.name,
                    alignment: "left",
                    spacing: { after: 200 },
                  }),
                ],
                width: {
                  size: 70,
                  type: WidthType.PERCENTAGE,
                },
                borders: {
                  top: { style: BorderStyle.NONE },
                  bottom: { style: BorderStyle.NONE },
                  left: { style: BorderStyle.NONE },
                  right: { style: BorderStyle.NONE },
                },
              }),
              new TableCell({
                children: [
                  logoBuffer
                    ? new Paragraph({
                        children: [
                          new ImageRun({
                            data: logoBuffer,
                            transformation: {
                              width: 100,
                              height: 40,
                            },
                          }),
                        ],
                        alignment: "right",
                      })
                    : new Paragraph({
                        text: "",
                        alignment: "right",
                      }),
                ],
                width: {
                  size: 30,
                  type: WidthType.PERCENTAGE,
                },
                borders: {
                  top: { style: BorderStyle.NONE },
                  bottom: { style: BorderStyle.NONE },
                  left: { style: BorderStyle.NONE },
                  right: { style: BorderStyle.NONE },
                },
              }),
            ],
          }),
        ],
      });

      headerChildren.push(headerTable);
      headerChildren.push(new Paragraph({ text: "" })); // Spacing
    }

    // Create Word document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: headerChildren,
        },
      ],
    });

    // Add title and content
    const contentChildren = [
      new Paragraph({
        text: report.title,
        heading: HeadingLevel.TITLE,
        alignment: "center",
      }),
      new Paragraph({
        text: `Scenario: ${scenario?.title || "Unknown"}`,
        alignment: "left",
      }),
      new Paragraph({
        text: `Generated: ${new Date(report.created_at).toLocaleString()}`,
        alignment: "left",
      }),
      new Paragraph({
        text: `By: ${report.user?.name || "Unknown"}`,
        alignment: "left",
      }),
      new Paragraph({
        text: "",
        alignment: "left",
      }),
    ];

    // Process content with Markdown-like formatting
    const lines = report.content.split("\n");

    lines.forEach((line) => {
      if (line.startsWith("# ")) {
        contentChildren.push(
          new Paragraph({
            text: line.replace("# ", ""),
            heading: HeadingLevel.HEADING_1,
          })
        );
      } else if (line.startsWith("## ")) {
        contentChildren.push(
          new Paragraph({
            text: line.replace("## ", ""),
            heading: HeadingLevel.HEADING_2,
          })
        );
      } else if (line.startsWith("### ")) {
        contentChildren.push(
          new Paragraph({
            text: line.replace("### ", ""),
            heading: HeadingLevel.HEADING_3,
          })
        );
      } else if (line.match(/^[A-Za-z\s]+: \d+$/)) {
        // Format aspect scores
        const [aspect, score] = line.split(":").map((s) => s.trim());
        contentChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${aspect}: `,
                bold: true,
              }),
              new TextRun({
                text: score,
              }),
            ],
          })
        );
      } else if (line.trim() === "") {
        contentChildren.push(new Paragraph({}));
      } else {
        contentChildren.push(new Paragraph({ text: line }));
      }
    });

    // Add content to document
    doc.addSection({
      children: contentChildren,
    });

    // Generate Word document buffer
    const buffer = await Packer.toBuffer(doc);

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=report-${reportId}.docx`
    );

    // Send document
    res.send(buffer);
  } catch (error) {
    console.error("Error in exportReportToWord:", error);
    res.status(500).json({ message: error.message });
  }
};

// Update report's show_to_user property
export const updateReportShowToUser = async (req, res) => {
  try {
    const { id, reportId } = req.params;
    const { show_to_user } = req.body;

    if (show_to_user === undefined) {
      return res.status(400).json({
        message: "Missing required parameter",
        details: "show_to_user is required",
      });
    }

    // Validate report exists and belongs to the scenario
    const { data: existingReport, error: reportError } = await connectSqlDB
      .from("reports")
      .select("id")
      .eq("id", Number(reportId))
      .eq("scenario_id", Number(id))
      .single();

    if (reportError || !existingReport) {
      return res.status(404).json({ message: "Report not found" });
    }

    // Update the show_to_user property
    const { data: updatedReport, error } = await connectSqlDB
      .from("reports")
      .update({ show_to_user: Boolean(show_to_user) })
      .eq("id", Number(reportId))
      .eq("scenario_id", Number(id))
      .select()
      .single();

    if (error) {
      console.error("Error updating report:", error);
      return res.status(500).json({
        message: "Failed to update report",
        details: error.message,
      });
    }

    res.json({
      message: "Report updated successfully",
      report: updatedReport,
    });
  } catch (error) {
    console.error("Error in updateReportShowToUser:", error);
    res.status(500).json({ message: error.message });
  }
};
