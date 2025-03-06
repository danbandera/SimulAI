import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import { decryptValue } from "../libs/encryption.js";
import { connectSqlDB } from "../db.cjs";
dotenv.config();

const getS3Credentials = async () => {
  const { data: settings, error } = await connectSqlDB
    .from("settings")
    .select(
      "aws_access_key, aws_secret_key, aws_region, aws_bucket, aws_bucket_url"
    )
    .single();

  if (error || !settings) {
    throw new Error("S3 credentials not found");
  }

  return settings;
};

const s3Credentials = await getS3Credentials();

export const s3Client = new S3Client({
  region: decryptValue(s3Credentials.aws_region),
  credentials: {
    accessKeyId: decryptValue(s3Credentials.aws_access_key),
    secretAccessKey: decryptValue(s3Credentials.aws_secret_key),
  },
});
