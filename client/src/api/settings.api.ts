import axios from "../config/axios";
import { encrypt, decrypt } from "../utils/encryption";

interface Settings {
  openai_key?: string;
  mistral_key?: string;
  llama_key?: string;
  mail_username?: string;
  mail_password?: string;
  mail_host?: string;
  mail_port?: number;
  mail_from?: string;
  mail_from_name?: string;
  aws_access_key?: string;
  aws_secret_key?: string;
  aws_region?: string;
  aws_bucket?: string;
  aws_bucket_url?: string;
}

const encryptSettings = (settings: any) => {
  const encrypted: any = {};
  Object.keys(settings).forEach((key) => {
    if (settings[key] && typeof settings[key] === "string") {
      encrypted[key] = encrypt(settings[key]);
    } else {
      encrypted[key] = settings[key];
    }
  });
  return encrypted;
};

const decryptSettings = (settings: any) => {
  const decrypted: any = {};
  Object.keys(settings).forEach((key) => {
    if (settings[key] && typeof settings[key] === "string") {
      decrypted[key] = decrypt(settings[key]);
    } else {
      decrypted[key] = settings[key];
    }
  });
  return decrypted;
};

export const getSettings = async () => {
  try {
    const response = await axios.get("/settings");
    return decryptSettings(response.data);
  } catch (error) {
    throw error;
  }
};

export const updateSettings = async (settings: Settings) => {
  try {
    const encryptedSettings = encryptSettings(settings);
    const response = await axios.put("/settings", encryptedSettings);
    return decryptSettings(response.data);
  } catch (error) {
    throw error;
  }
};
