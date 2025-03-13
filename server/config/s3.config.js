import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import { decryptValue } from "../libs/encryption.js";
import { connectSqlDB } from "../db.cjs";
dotenv.config();

const getS3Credentials = async () => {
  try {
    const { data: settings, error } = await connectSqlDB
      .from("settings")
      .select(
        "aws_access_key, aws_secret_key, aws_region, aws_bucket, aws_bucket_url"
      )
      .single();

    if (error) {
      console.error("Error fetching S3 credentials:", error);
      throw new Error(`S3 credentials not found: ${error.message}`);
    }

    if (!settings) {
      console.error("No S3 credentials found in database");
      throw new Error("S3 credentials not found in database");
    }

    // Validate required fields
    if (
      !settings.aws_access_key ||
      !settings.aws_secret_key ||
      !settings.aws_region
    ) {
      console.error("Missing required S3 credentials");
      throw new Error("Missing required S3 credentials");
    }
    return settings;
  } catch (error) {
    console.error("Error in getS3Credentials:", error);
    throw error;
  }
};

// Initialize S3 client with proper error handling
let s3Client;

try {
  const s3Credentials = await getS3Credentials();

  s3Client = new S3Client({
    region: decryptValue(s3Credentials.aws_region),
    credentials: {
      accessKeyId: decryptValue(s3Credentials.aws_access_key),
      secretAccessKey: decryptValue(s3Credentials.aws_secret_key),
    },
  });
} catch (error) {
  console.error("Failed to initialize S3 client:", error);
  // Create a dummy client that will throw errors when used
  s3Client = {
    send: () => {
      throw new Error("S3 client not properly initialized: " + error.message);
    },
  };
}

export { s3Client };
