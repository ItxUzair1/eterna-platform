#!/usr/bin/env node
// Verifies SPACES_* env vars and connectivity to your DigitalOcean Space
// 1) Lists the bucket
// 2) Uploads a tiny test object
// 3) Generates a signed URL
// 4) Deletes the test object

const dotenv = require('dotenv');
dotenv.config();

const { S3Client, ListObjectsV2Command, PutObjectCommand, HeadBucketCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Trim whitespace and remove quotes that might be in .env file
const endpoint = (process.env.SPACES_ENDPOINT || '').trim().replace(/^["']|["']$/g, '');
const region = (process.env.SPACES_REGION || 'us-east-1').trim();
const bucket = (process.env.SPACES_BUCKET || '').trim().replace(/^["']|["']$/g, '');
const accessKeyId = (process.env.SPACES_ACCESS_KEY || '').trim().replace(/^["']|["']$/g, '');
const secretAccessKey = (process.env.SPACES_SECRET_KEY || '').trim().replace(/^["']|["']$/g, '');

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function normalizeEndpoint(url) {
  try { return new URL(url).toString(); } catch { return url; }
}

async function main() {
  const missing = [];
  if (!endpoint) missing.push('SPACES_ENDPOINT');
  if (!bucket) missing.push('SPACES_BUCKET');
  if (!accessKeyId) missing.push('SPACES_ACCESS_KEY');
  if (!secretAccessKey) missing.push('SPACES_SECRET_KEY');
  if (missing.length) fail(`Missing env vars: ${missing.join(', ')}`);

  // Debug: show masked keys to verify they're being read correctly
  const keyPreview = accessKeyId ? `${accessKeyId.substring(0, 4)}...${accessKeyId.substring(accessKeyId.length - 4)}` : 'MISSING';
  const secretPreview = secretAccessKey ? `${secretAccessKey.substring(0, 4)}...${secretAccessKey.substring(secretAccessKey.length - 4)}` : 'MISSING';
  console.log(`🔑 Access Key: ${keyPreview} (length: ${accessKeyId.length})`);
  console.log(`🔐 Secret Key: ${secretPreview} (length: ${secretAccessKey.length})`);
  console.log(`🌐 Endpoint: ${endpoint}`);
  console.log(`📦 Bucket: ${bucket}`);
  console.log(`📍 Region: ${region}`);

  const s3 = new S3Client({
    region,
    endpoint: normalizeEndpoint(endpoint),
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey }
  });

  console.log('Checking bucket access...');
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`OK: Can access bucket '${bucket}'.`);
  } catch (e) {
    fail(`HeadBucket failed: ${e.message}`);
  }

  console.log('Listing a few objects (if any)...');
  try {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 5 }));
    const names = (res.Contents || []).map(o => o.Key);
    console.log('Objects:', names.length ? names : '(none)');
  } catch (e) {
    fail(`ListObjects failed: ${e.message}`);
  }

  const key = `verify/${Date.now()}-${Math.round(Math.random()*1e9)}.txt`;
  console.log('Uploading test object:', key);
  try {
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: Buffer.from('spaces-ok'), ACL: 'private', ContentType: 'text/plain' }));
    console.log('Upload OK');
  } catch (e) {
    fail(`PutObject failed: ${e.message}`);
  }

  console.log('Generating signed URL (60s)...');
  try {
    const url = await getSignedUrl(s3, new (require('@aws-sdk/client-s3').GetObjectCommand)({ Bucket: bucket, Key: key }), { expiresIn: 60 });
    console.log('Signed URL:', url);
  } catch (e) {
    fail(`Signed URL failed: ${e.message}`);
  }

  console.log('Deleting test object...');
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    console.log('Delete OK');
  } catch (e) {
    fail(`DeleteObject failed: ${e.message}`);
  }

  console.log('All checks passed.');
}

main().catch((e) => fail(e.message));


