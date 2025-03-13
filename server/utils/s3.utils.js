import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "../config/s3.config.js";
import crypto from "crypto";
import { connectSqlDB } from "../db.cjs";
import { decryptValue } from "../libs/encryption.js";
import jwt from "jsonwebtoken";

// Function to get S3 bucket settings from database
const getS3BucketSettings = async () => {
  try {
    const { data: settings, error } = await connectSqlDB
      .from("settings")
      .select("aws_bucket, aws_bucket_url")
      .single();

    if (error) {
      console.error("Error fetching S3 settings:", error);
      throw new Error(`S3 bucket settings not found: ${error.message}`);
    }

    if (!settings) {
      console.error("No S3 settings found in database");
      throw new Error("S3 bucket settings not found in database");
    }

    // Ensure the bucket URL is properly formatted
    let bucketUrl = settings.aws_bucket_url;

    // Check if the URL is a JWT token (starts with ey)
    if (typeof bucketUrl === "string" && bucketUrl.startsWith("ey")) {
      try {
        // Decode the JWT token
        const decoded = jwt.verify(bucketUrl, process.env.JWT_SECRET);
        if (decoded && decoded.data) {
          bucketUrl = decoded.data;
        } else {
          console.error("JWT token does not contain expected data structure");
          throw new Error("Invalid JWT token format for bucket URL");
        }
      } catch (jwtError) {
        console.error("Error decoding JWT token:", jwtError);
        throw new Error(`Failed to decode bucket URL: ${jwtError.message}`);
      }
    }

    // Ensure the URL ends with a slash
    if (!bucketUrl.endsWith("/")) {
      bucketUrl += "/";
    }

    return {
      bucketName: decryptValue(settings.aws_bucket),
      bucketUrl: bucketUrl,
    };
  } catch (error) {
    console.error("Error in getS3BucketSettings:", error);
    throw error;
  }
};

export const uploadToS3 = async (file, folder = "") => {
  try {
    // Validate file
    if (!file) {
      console.error("No file provided to uploadToS3");
      throw new Error("No file provided");
    }

    if (!file.buffer) {
      console.error("File has no buffer:", file);
      throw new Error("Invalid file received: no buffer");
    }

    // Get bucket settings from database
    const { bucketName, bucketUrl } = await getS3BucketSettings();

    // Generate unique filename
    const fileExtension = file.originalname.split(".").pop();
    const randomName = crypto.randomBytes(16).toString("hex");
    const fileName = `${folder}/${randomName}.${fileExtension}`;

    const params = {
      Bucket: bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    await s3Client.send(new PutObjectCommand(params));

    // Construct the final URL
    const fileUrl = `${bucketUrl}${fileName}`;

    return fileUrl;
  } catch (error) {
    console.error("Error in uploadToS3:", error);
    console.error("Error stack:", error.stack);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

export const deleteFromS3 = async (fileUrl) => {
  try {
    // Get bucket settings from database
    const { bucketName, bucketUrl } = await getS3BucketSettings();
    // Extract the key including the folder path
    const key = fileUrl.replace(bucketUrl, "").replace(/^\//, "");

    const params = {
      Bucket: bucketName,
      Key: key,
    };

    await s3Client.send(new DeleteObjectCommand(params));
  } catch (error) {
    console.error("Error deleting from S3:", error);
    throw error;
  }
};
