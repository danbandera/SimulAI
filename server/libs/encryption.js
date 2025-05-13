import jwt from "jsonwebtoken";

export const encryptValue = (value) => {
  if (!value) return value;
  try {
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not defined in environment variables");
      return value; // Return unencrypted value if JWT_SECRET is missing
    }
    return jwt.sign({ data: value }, process.env.JWT_SECRET);
  } catch (error) {
    console.error("Encryption error:", error);
    return value; // Return unencrypted value in case of error
  }
};

export const decryptValue = (token) => {
  if (!token) return token;
  try {
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not defined in environment variables");
      return token; // Return token as is if JWT_SECRET is missing
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.data;
  } catch (error) {
    console.error("Decryption error:", error);
    return token;
  }
};
