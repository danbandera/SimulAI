import jwt from "jsonwebtoken";

export const encryptValue = (value) => {
  if (!value) return value;
  return jwt.sign({ data: value }, process.env.JWT_SECRET);
};

export const decryptValue = (token) => {
  if (!token) return token;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.data;
  } catch (error) {
    console.error("Decryption error:", error);
    return token;
  }
};
