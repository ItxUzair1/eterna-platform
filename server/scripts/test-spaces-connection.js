#!/usr/bin/env node
// Test script to verify DigitalOcean Spaces configuration
// Run with: node scripts/test-spaces-connection.js

require('dotenv').config();
const { S3Client, PutObjectCommand, HeadBucketCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');

// Load environment variables
const SPACES_ENDPOINT = (process.env.SPACES_ENDPOINT || '').trim().replace(/^["']|["']$/g, '');
const SPACES_REGION = (process.env.SPACES_REGION || 'us-east-1').trim();
const SPACES_KEY = (process.env.SPACES_ACCESS_KEY || '').trim().replace(/^["']|["']$/g, '');
const SPACES_SECRET = (process.env.SPACES_SECRET_KEY || '').trim().replace(/^["']|["']$/g, '');
const SPACES_BUCKET = (process.env.SPACES_BUCKET || '').trim().replace(/^["']|["']$/g, '');

function normalizeEndpoint(endpoint) {
	if (!endpoint) return endpoint;
	try {
		const u = new URL(endpoint);
		return u.toString();
	} catch {
		return endpoint;
	}
}

async function testConnection() {
	console.log('\n🔍 Testing DigitalOcean Spaces Configuration...\n');
	
	// Check environment variables
	const missing = [];
	if (!SPACES_ENDPOINT) missing.push('SPACES_ENDPOINT');
	if (!SPACES_BUCKET) missing.push('SPACES_BUCKET');
	if (!SPACES_KEY) missing.push('SPACES_ACCESS_KEY');
	if (!SPACES_SECRET) missing.push('SPACES_SECRET_KEY');
	
	if (missing.length) {
		console.error('❌ Missing environment variables:', missing.join(', '));
		console.error('\nPlease set the following in your .env file:');
		console.error('SPACES_ENDPOINT=https://<region>.digitaloceanspaces.com');
		console.error('SPACES_REGION=<region> (e.g., nyc3, sfo3, ams3)');
		console.error('SPACES_BUCKET=<your-bucket-name>');
		console.error('SPACES_ACCESS_KEY=<your-access-key>');
		console.error('SPACES_SECRET_KEY=<your-secret-key>');
		process.exit(1);
	}
	
	console.log('✅ Environment variables found:');
	console.log(`   Endpoint: ${SPACES_ENDPOINT}`);
	console.log(`   Region: ${SPACES_REGION}`);
	console.log(`   Bucket: ${SPACES_BUCKET}`);
	console.log(`   Access Key: ${SPACES_KEY.substring(0, 4)}...${SPACES_KEY.substring(SPACES_KEY.length - 4)}`);
	console.log(`   Secret Key: ${SPACES_SECRET.substring(0, 4)}...${SPACES_SECRET.substring(SPACES_SECRET.length - 4)}\n`);
	
	// Initialize S3 client
	const s3 = new S3Client({
		region: SPACES_REGION,
		endpoint: normalizeEndpoint(SPACES_ENDPOINT),
		forcePathStyle: true,
		credentials: {
			accessKeyId: SPACES_KEY,
			secretAccessKey: SPACES_SECRET
		}
	});
	
	try {
		// Test 1: Check bucket access
		console.log('📦 Testing bucket access...');
		await s3.send(new HeadBucketCommand({ Bucket: SPACES_BUCKET }));
		console.log('✅ Bucket is accessible!\n');
		
		// Test 2: List objects (optional)
		console.log('📋 Listing objects in bucket...');
		const listCmd = new ListObjectsV2Command({ Bucket: SPACES_BUCKET, MaxKeys: 5 });
		const listResult = await s3.send(listCmd);
		console.log(`✅ Found ${listResult.KeyCount || 0} objects (showing first 5)\n`);
		
		// Test 3: Upload a test file
		console.log('📤 Testing file upload...');
		const testKey = `test/${Date.now()}-test.txt`;
		const testContent = Buffer.from('This is a test file uploaded from the connection test script.');
		const putCmd = new PutObjectCommand({
			Bucket: SPACES_BUCKET,
			Key: testKey,
			Body: testContent,
			ContentType: 'text/plain',
			ACL: 'private'
		});
		await s3.send(putCmd);
		console.log(`✅ Test file uploaded successfully: ${testKey}\n`);
		
		console.log('🎉 All tests passed! DigitalOcean Spaces is configured correctly.\n');
	} catch (err) {
		console.error('❌ Error testing connection:');
		console.error(`   Name: ${err.name}`);
		console.error(`   Message: ${err.message}`);
		if (err.$metadata) {
			console.error(`   HTTP Status: ${err.$metadata.httpStatusCode}`);
			console.error(`   Request ID: ${err.$metadata.requestId}`);
		}
		console.error('\nCommon issues:');
		console.error('1. Check that SPACES_ENDPOINT is in format: https://<region>.digitaloceanspaces.com');
		console.error('2. Verify SPACES_REGION matches the region in your endpoint (e.g., nyc3, sfo3)');
		console.error('3. Ensure SPACES_ACCESS_KEY and SPACES_SECRET_KEY are correct');
		console.error('4. Verify the bucket name is correct');
		console.error('5. Check that your API keys have the correct permissions');
		process.exit(1);
	}
}

testConnection();

