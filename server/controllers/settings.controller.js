import { connectSqlDB } from "../db.cjs";
import { encryptValue, decryptValue } from "../libs/encryption.js";

const encryptSettings = (settings) => {
  const encrypted = {};
  Object.keys(settings).forEach((key) => {
    if (settings[key] && typeof settings[key] === "string") {
      encrypted[key] = encryptValue(settings[key]);
    } else {
      encrypted[key] = settings[key];
    }
  });
  return encrypted;
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
  const {
    // AI Keys
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

    // Encrypt settings before saving
    const encryptedSettings = encryptSettings(settingsData);

    let result;
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

    if (result.error) {
      return res.status(500).json({ error: "Error updating settings" });
    }

    // Decrypt settings before sending response
    const decryptedSettings = decryptSettings(result.data);
    res.json(decryptedSettings);
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
