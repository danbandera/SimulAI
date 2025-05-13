import { connectSqlDB } from "../db.cjs";
import { encryptValue, decryptValue } from "../libs/encryption.js";

const encryptSettings = (settings) => {
  const encrypted = {};
  try {
    Object.keys(settings).forEach((key) => {
      if (settings[key] && typeof settings[key] === "string") {
        try {
          encrypted[key] = encryptValue(settings[key]);
        } catch (encryptError) {
          console.error(`Error encrypting value for key ${key}:`, encryptError);
          // If encryption fails, still include the original value
          encrypted[key] = settings[key];
        }
      } else {
        encrypted[key] = settings[key];
      }
    });
    return encrypted;
  } catch (error) {
    console.error("Error in encryptSettings:", error);
    return settings; // Return original settings if encryption fails
  }
};

const decryptSettings = (settings) => {
  const decrypted = {};
  Object.keys(settings).forEach((key) => {
    if (settings[key] && typeof settings[key] === "string") {
      decrypted[key] = decryptValue(settings[key]);
    } else {
      decrypted[key] = settings[key];
    }
  });
  return decrypted;
};

export const getSettings = async (req, res) => {
  try {
    const { data: settings, error } = await connectSqlDB
      .from("settings")
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({ error: "Error fetching settings" });
    }

    // If no settings exist yet, return empty settings
    if (!settings) {
      return res.json({});
    }

    // Decrypt settings before sending
    const decryptedSettings = decryptSettings(settings);
    res.json(decryptedSettings);
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateSettings = async (req, res) => {
  console.log("Request body:", req.body);

  const {
    // Virtual Avatar
    promt_for_virtual_avatar,
    // Analyse Conversation
    promt_for_analyse_conversation,
    // Aspects
    aspects,
    // Scenario Categories
    scenario_categories,
    // Interactive Avatar
    interactive_avatar,
    // AI Keys
    heygen_key,
    openai_key,
    mistral_key,
    llama_key,
    // Mail Settings
    mail_username,
    mail_password,
    mail_host,
    mail_port,
    mail_from,
    mail_from_name,
    // AWS Settings
    aws_access_key,
    aws_secret_key,
    aws_region,
    aws_bucket,
    aws_bucket_url,
  } = req.body;

  try {
    // First check if settings exist
    const { data: existingSettings } = await connectSqlDB
      .from("settings")
      .select("id")
      .single();

    const settingsData = {
      promt_for_virtual_avatar,
      promt_for_analyse_conversation,
      aspects,
      scenario_categories,
      interactive_avatar,
      heygen_key,
      openai_key,
      mistral_key,
      llama_key,
      mail_username,
      mail_password,
      mail_host,
      mail_port: mail_port ? parseInt(mail_port) : null,
      mail_from,
      mail_from_name,
      aws_access_key,
      aws_secret_key,
      aws_region,
      aws_bucket,
      aws_bucket_url,
    };

    console.log("Settings data to save:", settingsData);

    // Encrypt settings before saving
    let encryptedSettings;
    try {
      encryptedSettings = encryptSettings(settingsData);
      console.log("Settings encrypted successfully");
    } catch (encryptError) {
      console.error("Error encrypting settings:", encryptError);
      return res.status(500).json({ error: "Error encrypting settings" });
    }

    let result;
    try {
      if (existingSettings) {
        // Update existing settings
        const { data, error } = await connectSqlDB
          .from("settings")
          .update(encryptedSettings)
          .eq("id", existingSettings.id)
          .select()
          .single();

        result = { data, error };
      } else {
        // Create new settings
        const { data, error } = await connectSqlDB
          .from("settings")
          .insert(encryptedSettings)
          .select()
          .single();

        result = { data, error };
      }
    } catch (dbError) {
      console.error("Database operation error:", dbError);
      return res.status(500).json({ error: "Database operation failed" });
    }

    if (result.error) {
      console.error("Database result error:", result.error);
      return res.status(500).json({ error: "Error updating settings" });
    }

    // Decrypt settings before sending response
    try {
      const decryptedSettings = decryptSettings(result.data);
      res.json(decryptedSettings);
    } catch (decryptError) {
      console.error("Error decrypting settings for response:", decryptError);
      // Return encrypted data if decryption fails
      res.json(result.data);
    }
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
