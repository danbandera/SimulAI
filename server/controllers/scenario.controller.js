import { connectSqlDB } from "../db.cjs";
import Conversation from "../models/conversation.model.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { uploadToS3, deleteFromS3 } from "../utils/s3.utils.js";

// Create uploads directory if it doesn't exist
const uploadDir = "uploads/scenarios";
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
    upload(req, res, async (err) => {
      if (err) {
        return res
          .status(400)
          .json({ message: "File upload error", error: err.message });
      }

      try {
        const { id } = req.params;
        const { title, description, status, aspects, existingFiles } = req.body;

        // Upload new files to S3
        const newFileUrls = [];
        if (req.files && req.files.length > 0) {
          for (const file of req.files) {
            try {
              const fileUrl = await uploadToS3(file, "documents");
              newFileUrls.push(fileUrl);
            } catch (error) {
              console.error("Error uploading file to S3:", error);
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
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select()
          .single();

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
        res.status(500).json({ message: error.message });
      }
    });
  } catch (error) {
    console.error("Update Scenario Error:", error);
    res.status(500).json({ message: error.message });
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

    console.log(conversationToSave);
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
