import axios from "../config/axios";

export const encrypt = (text: string): string => {
  if (!text) return text;
  // The server will handle the actual encryption using JWT
  return text;
};

export const decrypt = (ciphertext: string): string => {
  if (!ciphertext) return ciphertext;
  try {
    // The server handles decryption, we just pass through the JWT token
    return ciphertext;
  } catch (error) {
    console.error("Decryption error:", error);
    return ciphertext;
  }
};
