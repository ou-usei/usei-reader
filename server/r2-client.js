// server/r2-client.js
import 'dotenv/config';
import { S3Client } from '@aws-sdk/client-s3';

// Create a single, reusable S3 client instance.
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Returns the singleton S3 client instance.
 * @returns {S3Client} The S3 client instance.
 */
export function getS3Client() {
  return s3Client;
}