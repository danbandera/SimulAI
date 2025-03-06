import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "../config/s3.config.js";
import crypto from "crypto";

export const uploadToS3 = async (file, folder = "") => {
  try {
    if (!file || !file.buffer) {
      throw new Error("Invalid file received");
    }

    // Generate unique filename
    const fileExtension = file.originalname.split(".").pop();
    const randomName = crypto.randomBytes(16).toString("hex");
    const fileName = `${folder}/${randomName}.${fileExtension}`;
    console.log(fileName);
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    await s3Client.send(new PutObjectCommand(params));
    const fileUrl = `${process.env.AWS_BUCKET_URL + fileName}`;
    return fileUrl;
  } catch (error) {
    console.error("Error in uploadToS3:", error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

export const deleteFromS3 = async (fileUrl) => {
  try {
    // Extract the key including the folder path
    const key = fileUrl
      .replace(process.env.AWS_BUCKET_URL, "")
      .replace(/^\//, "");
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    };

    await s3Client.send(new DeleteObjectCommand(params));
  } catch (error) {
    console.error("Error deleting from S3:", error);
    throw error;
  }
};
