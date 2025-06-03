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

export const bulkDeleteScenarios = async (req, res) => {
  try {
    const { scenarioIds } = req.body;

    if (
      !scenarioIds ||
      !Array.isArray(scenarioIds) ||
      scenarioIds.length === 0
    ) {
      return res.status(400).json({ message: "No scenario IDs provided" });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Get the deleting user's information to enforce permissions
    const { data: deletingUser, error: deletingUserError } = await connectSqlDB
      .from("users")
      .select("role, company_id")
      .eq("id", req.user.id)
      .single();

    if (deletingUserError) {
      console.error("Error fetching deleting user:", deletingUserError);
      return res
        .status(500)
        .json({ message: "Error validating user permissions" });
    }

    // Get scenarios to be deleted to check permissions
    const { data: scenariosToDelete, error: fetchError } = await connectSqlDB
      .from("scenarios")
      .select("id, created_by, files")
      .in("id", scenarioIds);

    if (fetchError) {
      console.error("Error fetching scenarios to delete:", fetchError);
      return res.status(500).json({ message: "Error fetching scenarios" });
    }

    // Filter scenarios based on permissions
    const allowedScenarioIds = [];
    const deniedScenarios = [];

    for (const scenario of scenariosToDelete) {
      let canDelete = false;

      if (deletingUser.role === "admin") {
        // Admin can delete any scenario
        canDelete = true;
      } else if (deletingUser.role === "company") {
        // Company users can only delete scenarios they created
        canDelete = scenario.created_by === req.user.id;
      } else if (deletingUser.role === "user") {
        // Regular users cannot delete scenarios
        canDelete = false;
      }

      if (canDelete) {
        allowedScenarioIds.push(scenario.id);
      } else {
        deniedScenarios.push(scenario);
      }
    }

    if (allowedScenarioIds.length === 0) {
      return res.status(403).json({
        message:
          "You don't have permission to delete any of the selected scenarios",
      });
    }

    console.log(`Bulk deleting scenarios: ${allowedScenarioIds}`);

    // Get scenarios with files to delete from S3
    const scenariosWithFiles = scenariosToDelete.filter(
      (scenario) => allowedScenarioIds.includes(scenario.id) && scenario.files
    );

    // Delete files from S3 for allowed scenarios
    for (const scenario of scenariosWithFiles) {
      if (scenario.files && Array.isArray(scenario.files)) {
        for (const fileUrl of scenario.files) {
          try {
            await deleteFromS3(fileUrl);
            console.log(`Successfully deleted file: ${fileUrl}`);
          } catch (fileDeleteError) {
            console.error(`Error deleting file ${fileUrl}:`, fileDeleteError);
            // Continue with scenario deletion even if file deletion fails
          }
        }
      }
    }

    // Delete related conversations first (foreign key constraint)
    const { error: conversationsDeleteError } = await connectSqlDB
      .from("conversations")
      .delete()
      .in("scenario_id", allowedScenarioIds);

    if (conversationsDeleteError) {
      console.error("Error deleting conversations:", conversationsDeleteError);
      // Continue with scenario deletion even if conversation deletion fails
    } else {
      console.log("Successfully deleted related conversations");
    }

    // Delete related reports
    const { error: reportsDeleteError } = await connectSqlDB
      .from("reports")
      .delete()
      .in("scenario_id", allowedScenarioIds);

    if (reportsDeleteError) {
      console.error("Error deleting reports:", reportsDeleteError);
      // Continue with scenario deletion even if report deletion fails
    } else {
      console.log("Successfully deleted related reports");
    }

    // Delete scenarios
    const { error: deleteError } = await connectSqlDB
      .from("scenarios")
      .delete()
      .in("id", allowedScenarioIds);

    if (deleteError) {
      console.error("Error deleting scenarios:", deleteError);
      return res.status(500).json({ message: "Error deleting scenarios" });
    }

    console.log("Successfully deleted scenarios");

    res.json({
      message: "Bulk delete completed",
      deleted: allowedScenarioIds.length,
      denied: deniedScenarios.length,
      deniedScenarios: deniedScenarios.map((s) => ({
        id: s.id,
        reason: "Insufficient permissions",
      })),
    });
  } catch (error) {
    console.error("Bulk Delete Scenarios Error:", error);
    res.status(500).json({
      message: "Error deleting scenarios",
      error: error.message,
    });
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

    // Get language preference from query parameter or Accept-Language header
    const userLanguage =
      req.query.lang ||
      req.headers["accept-language"]?.split(",")[0]?.split("-")[0] ||
      "en";
    const language = ["en", "es", "fr"].includes(userLanguage)
      ? userLanguage
      : "en";

    // Translation objects for PDF content
    const translations = {
      en: {
        evaluationReport: "Evaluation Report",
        scenario: "SCENARIO",
        generatedBy: "GENERATED BY",
        dateGenerated: "DATE GENERATED",
        conversationsAnalyzed: "CONVERSATIONS ANALYZED",
        assessmentScores: "Assessment Scores",
        generatedOn: "Generated on",
        reportId: "Report ID",
        page: "Page",
        of: "of",
        unknown: "Unknown",
      },
      es: {
        evaluationReport: "Reporte de Evaluación",
        scenario: "ESCENARIO",
        generatedBy: "GENERADO POR",
        dateGenerated: "FECHA DE GENERACIÓN",
        conversationsAnalyzed: "CONVERSACIONES ANALIZADAS",
        assessmentScores: "Puntuaciones de Evaluación",
        generatedOn: "Generado el",
        reportId: "ID del Reporte",
        page: "Página",
        of: "de",
        unknown: "Desconocido",
      },
      fr: {
        evaluationReport: "Rapport d'Évaluation",
        scenario: "SCÉNARIO",
        generatedBy: "GÉNÉRÉ PAR",
        dateGenerated: "DATE DE GÉNÉRATION",
        conversationsAnalyzed: "CONVERSATIONS ANALYSÉES",
        assessmentScores: "Scores d'Évaluation",
        generatedOn: "Généré le",
        reportId: "ID du Rapport",
        page: "Page",
        of: "de",
        unknown: "Inconnu",
      },
    };

    const t = translations[language];

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

    // Create PDF document with professional settings
    const doc = new PDFDocument({
      margin: 60,
      size: "A4",
      info: {
        Title: report.title,
        Author: report.user?.name || t.unknown,
        Subject: `${t.evaluationReport} - ${scenario?.title || t.unknown}`,
        Keywords: "evaluation, report, assessment, analysis",
      },
    });

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${report.title.replace(
        /[^a-zA-Z0-9]/g,
        "_"
      )}_Report.pdf"`
    );

    // Pipe PDF document to response
    doc.pipe(res);

    // Define colors for professional styling
    const colors = {
      primary: "#3C50E0",
      secondary: "#64748B",
      success: "#10B981",
      warning: "#F59E0B",
      danger: "#EF4444",
      dark: "#1F2937",
      light: "#F8FAFC",
      border: "#E5E7EB",
    };

    // Helper function to add a colored rectangle
    const addColoredRect = (x, y, width, height, color) => {
      doc.rect(x, y, width, height).fill(color);
    };

    // Helper function to get score color
    const getScoreColor = (score) => {
      if (score >= 80) return colors.success;
      if (score >= 60) return colors.warning;
      return colors.danger;
    };

    // Add professional header with company branding
    let currentY = 60;

    // Remove the blue background - use white background instead
    // addColoredRect(0, 0, doc.page.width, 120, colors.primary);

    if (company) {
      // Company name in header (black text on white background)
      doc
        .fillColor(colors.dark)
        .fontSize(16)
        .font("Helvetica-Bold")
        .text(company.name, 60, currentY, { align: "left" });

      // Add company logo if available
      if (company.logo) {
        try {
          const logoResponse = await fetch(company.logo);
          if (logoResponse.ok) {
            const logoBuffer = await logoResponse.arrayBuffer();
            const logoImage = Buffer.from(logoBuffer);
            doc.image(logoImage, doc.page.width - 160, currentY - 10, {
              fit: [100, 50],
              align: "right",
            });
          }
        } catch (logoError) {
          console.error("Error adding logo to PDF:", logoError);
        }
      }

      currentY += 60; // Add space after company header
    } else {
      // Default header without company (black text on white background)
      doc
        .fillColor(colors.dark)
        .fontSize(18)
        .font("Helvetica-Bold")
        .text(t.evaluationReport, 60, currentY, { align: "center" });

      currentY += 40; // Add space after default header
    }

    // Add a subtle separator line under the header
    doc
      .strokeColor(colors.border)
      .lineWidth(1)
      .moveTo(60, currentY)
      .lineTo(doc.page.width - 60, currentY)
      .stroke();

    currentY += 30;

    // Report title section
    doc
      .fillColor(colors.dark)
      .fontSize(24)
      .font("Helvetica-Bold")
      .text(report.title, 60, currentY, {
        align: "center",
        width: doc.page.width - 120,
      });

    currentY += 50;

    // Metadata section with professional styling
    const metadataY = currentY;

    // Left column metadata
    doc
      .fillColor(colors.secondary)
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(t.scenario, 60, metadataY);

    doc
      .fillColor(colors.dark)
      .fontSize(12)
      .font("Helvetica")
      .text(scenario?.title || t.unknown, 60, metadataY + 15);

    doc
      .fillColor(colors.secondary)
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(t.generatedBy, 300, metadataY);

    doc
      .fillColor(colors.dark)
      .fontSize(12)
      .font("Helvetica")
      .text(report.user?.name || t.unknown, 300, metadataY + 15);

    // Right column metadata
    doc
      .fillColor(colors.secondary)
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(t.dateGenerated, 300, metadataY + 40);

    doc
      .fillColor(colors.dark)
      .fontSize(12)
      .font("Helvetica")
      .text(
        new Date(report.created_at).toLocaleDateString(
          language === "en" ? "en-US" : language === "es" ? "es-ES" : "fr-FR"
        ),
        300,
        metadataY + 15
      );

    doc
      .fillColor(colors.secondary)
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(t.conversationsAnalyzed, 300, metadataY + 40);

    doc
      .fillColor(colors.dark)
      .fontSize(12)
      .font("Helvetica")
      .text(
        (report.conversations_ids?.length || 0).toString(),
        300,
        metadataY + 55
      );

    currentY += 100;

    // Add separator line
    doc
      .strokeColor(colors.border)
      .lineWidth(1)
      .moveTo(60, currentY)
      .lineTo(doc.page.width - 60, currentY)
      .stroke();

    currentY += 30;

    // Process and add report content with enhanced formatting
    const lines = report.content.split("\n");
    let scoreCards = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if we need a new page
      if (currentY > doc.page.height - 100) {
        doc.addPage();
        currentY = 60;
      }

      if (line.startsWith("# ")) {
        // Main headings with background
        const headingText = line.replace("# ", "");
        const headingHeight = 35;

        addColoredRect(
          60,
          currentY - 5,
          doc.page.width - 120,
          headingHeight,
          colors.light
        );

        doc
          .fillColor(colors.dark)
          .fontSize(18)
          .font("Helvetica-Bold")
          .text(headingText, 70, currentY + 8);

        currentY += headingHeight + 20;
      } else if (line.startsWith("## ")) {
        // Section headings
        const headingText = line.replace("## ", "");

        doc
          .fillColor(colors.primary)
          .fontSize(16)
          .font("Helvetica-Bold")
          .text(headingText, 60, currentY);

        currentY += 30;
      } else if (line.startsWith("### ")) {
        // Subsection headings
        const headingText = line.replace("### ", "");

        doc
          .fillColor(colors.secondary)
          .fontSize(14)
          .font("Helvetica-Bold")
          .text(headingText, 60, currentY);

        currentY += 25;
      } else if (line.match(/^[A-Za-z\s]+: \d+$/)) {
        // Collect aspect scores for later rendering
        const [aspect, score] = line.split(":").map((s) => s.trim());
        scoreCards.push({ aspect, score: parseInt(score) });
      } else if (line.startsWith("- ") || line.startsWith("• ")) {
        // Bullet points with custom styling and proper spacing
        const bulletText = line.replace(/^[-•]\s*/, "");

        // Add bullet point
        doc
          .fillColor(colors.primary)
          .circle(70, currentY + 8, 2)
          .fill();

        doc
          .fillColor(colors.dark)
          .fontSize(11)
          .font("Helvetica")
          .text(bulletText, 85, currentY, {
            width: doc.page.width - 145,
            align: "left",
            lineGap: 2,
          });

        // Calculate the actual height of the text to avoid overlap
        const textHeight = doc.heightOfString(bulletText, {
          width: doc.page.width - 145,
          lineGap: 2,
        });
        currentY += Math.max(textHeight + 8, 20); // Ensure minimum spacing
      } else if (line.trim() === "") {
        // Empty lines - add consistent spacing
        currentY += 12;
      } else if (line.trim() !== "") {
        // Regular paragraphs with proper height calculation
        doc
          .fillColor(colors.dark)
          .fontSize(11)
          .font("Helvetica")
          .text(line, 60, currentY, {
            width: doc.page.width - 120,
            align: "justify",
            lineGap: 3,
          });

        // Calculate the actual height of the text
        const textHeight = doc.heightOfString(line, {
          width: doc.page.width - 120,
          lineGap: 3,
        });
        currentY += textHeight + 12; // Add proper spacing after paragraphs
      }
    }

    // Add score cards section if we have scores
    if (scoreCards.length > 0) {
      // Check if we need a new page for scores
      const scoresHeight = Math.ceil(scoreCards.length / 2) * 90 + 120;
      if (currentY + scoresHeight > doc.page.height - 60) {
        doc.addPage();
        currentY = 60;
      }

      currentY += 30;

      // Scores section header
      doc
        .fillColor(colors.primary)
        .fontSize(18)
        .font("Helvetica-Bold")
        .text(t.assessmentScores, 60, currentY);

      currentY += 50;

      // Render score cards in a grid
      const cardWidth = (doc.page.width - 140) / 2;
      const cardHeight = 70;
      let cardX = 60;
      let cardY = currentY;

      scoreCards.forEach((scoreCard, index) => {
        if (index > 0 && index % 2 === 0) {
          cardY += cardHeight + 25;
          cardX = 60;
        }

        const scoreColor = getScoreColor(scoreCard.score);

        // Card background
        addColoredRect(cardX, cardY, cardWidth, cardHeight, colors.light);

        // Score color indicator
        addColoredRect(cardX, cardY, 5, cardHeight, scoreColor);

        // Aspect name
        doc
          .fillColor(colors.dark)
          .fontSize(12)
          .font("Helvetica-Bold")
          .text(scoreCard.aspect, cardX + 15, cardY + 15);

        // Score value
        doc
          .fillColor(scoreColor)
          .fontSize(24)
          .font("Helvetica-Bold")
          .text(scoreCard.score.toString(), cardX + 15, cardY + 35);

        // Score bar
        const barWidth = cardWidth - 100;
        const barX = cardX + cardWidth - barWidth - 15;
        const barY = cardY + 45;

        // Background bar
        addColoredRect(barX, barY, barWidth, 8, colors.border);

        // Score bar
        const scoreBarWidth = (scoreCard.score / 100) * barWidth;
        addColoredRect(barX, barY, scoreBarWidth, 8, scoreColor);

        cardX += cardWidth + 20;
      });

      currentY = cardY + cardHeight + 40;
    }

    // Add professional footer
    // const footerY = doc.page.height - 80;

    // Footer separator
    // doc
    //   .strokeColor(colors.border)
    //   .lineWidth(1)
    //   .moveTo(60, footerY)
    //   .lineTo(doc.page.width - 60, footerY)
    //   .stroke();

    // Footer content
    // doc
    //   .fillColor(colors.secondary)
    //   .fontSize(9)
    //   .font("Helvetica")
    //   .text(
    //     `${t.generatedOn} ${new Date().toLocaleString(
    //       language === "en" ? "en-US" : language === "es" ? "es-ES" : "fr-FR"
    //     )}`,
    //     60,
    //     footerY + 15
    //   );

    // doc.text(`${t.reportId}: ${reportId}`, 60, footerY + 30);

    // Page numbers (for multi-page documents)
    const pageCount = doc.bufferedPageRange().count;
    if (pageCount > 1) {
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc
          .fillColor(colors.secondary)
          .fontSize(9)
          .font("Helvetica")
          .text(
            `${t.page} ${i + 1} ${t.of} ${pageCount}`,
            doc.page.width - 120,
            doc.page.height - 50
          );
      }
    }

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

    // Get language preference from query parameter or Accept-Language header
    const userLanguage =
      req.query.lang ||
      req.headers["accept-language"]?.split(",")[0]?.split("-")[0] ||
      "en";
    const language = ["en", "es", "fr"].includes(userLanguage)
      ? userLanguage
      : "en";

    // Translation objects for Word content
    const translations = {
      en: {
        evaluationReport: "Evaluation Report",
        scenario: "Scenario",
        generated: "Generated",
        by: "By",
        unknown: "Unknown",
      },
      es: {
        evaluationReport: "Reporte de Evaluación",
        scenario: "Escenario",
        generated: "Generado",
        by: "Por",
        unknown: "Desconocido",
      },
      fr: {
        evaluationReport: "Rapport d'Évaluation",
        scenario: "Scénario",
        generated: "Généré",
        by: "Par",
        unknown: "Inconnu",
      },
    };

    const t = translations[language];

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
        text: `${t.scenario}: ${scenario?.title || t.unknown}`,
        alignment: "left",
      }),
      new Paragraph({
        text: `${t.generated}: ${new Date(report.created_at).toLocaleDateString(
          language === "en" ? "en-US" : language === "es" ? "es-ES" : "fr-FR"
        )}`,
        alignment: "left",
      }),
      new Paragraph({
        text: `${t.by}: ${report.user?.name || t.unknown}`,
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
