// test.js
import dotenv from 'dotenv';
dotenv.config();

import { S3Client, ListBucketsCommand, HeadBucketCommand } from "@aws-sdk/client-s3";

// Load and validate environment variables
const {
  SPACES_ENDPOINT,
  SPACES_REGION,
  SPACES_BUCKET,
  SPACES_ACCESS_KEY,
  SPACES_SECRET_KEY
} = process.env;

function checkEnv() {
  const missing = [];
  if (!SPACES_ENDPOINT) missing.push("SPACES_ENDPOINT");
  if (!SPACES_REGION) missing.push("SPACES_REGION");
  if (!SPACES_BUCKET) missing.push("SPACES_BUCKET");
  if (!SPACES_ACCESS_KEY) missing.push("SPACES_ACCESS_KEY");
  if (!SPACES_SECRET_KEY) missing.push("SPACES_SECRET_KEY");

  if (missing.length) {
    console.error("❌ Missing environment variables:", missing.join(", "));
    process.exit(1);
  } else {
    console.log("✅ All environment variables are set.");
  }
}

async function testSpacesConnection() {
  checkEnv();

  // Initialize S3 client for DigitalOcean Spaces
  const s3 = new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: SPACES_REGION,
    credentials: {
      accessKeyId: SPACES_ACCESS_KEY,
      secretAccessKey: SPACES_SECRET_KEY
    },
    forcePathStyle: false // DigitalOcean supports virtual-hosted style
  });

  try {
    // Test credentials by listing buckets
    console.log("🌐 Listing buckets...");
    const buckets = await s3.send(new ListBucketsCommand({}));
    console.log("✅ Buckets found:", buckets.Buckets?.map(b => b.Name) || "None");

    // Test access to your specific bucket
    console.log(`🔍 Checking access to bucket "${SPACES_BUCKET}"...`);
    await s3.send(new HeadBucketCommand({ Bucket: SPACES_BUCKET }));
    console.log(`✅ Bucket "${SPACES_BUCKET}" is accessible!`);
  } catch (err) {
    console.error("❌ Error accessing Spaces:");
    console.error(err.name, err.Code || "", err.message);
    if (err.$metadata) {
      console.log("Status Code:", err.$metadata.httpStatusCode);
      console.log("Request ID:", err.$metadata.requestId);
    }
  }
}

testSpacesConnection();
