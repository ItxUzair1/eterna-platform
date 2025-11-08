const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const multer = require('multer');

// Trim whitespace and remove quotes that might be in .env file
const SPACES_ENDPOINT = (process.env.SPACES_ENDPOINT || '').trim().replace(/^["']|["']$/g, '');
const SPACES_REGION = (process.env.SPACES_REGION || 'us-east-1').trim();
const SPACES_KEY = (process.env.SPACES_ACCESS_KEY || '').trim().replace(/^["']|["']$/g, '');
const SPACES_SECRET = (process.env.SPACES_SECRET_KEY || '').trim().replace(/^["']|["']$/g, '');
const SPACES_BUCKET = (process.env.SPACES_BUCKET || '').trim().replace(/^["']|["']$/g, '');

function getSpacesConfigErrors() {
	const errs = [];
	if (!SPACES_ENDPOINT) errs.push('SPACES_ENDPOINT');
	if (!SPACES_KEY) errs.push('SPACES_ACCESS_KEY');
	if (!SPACES_SECRET) errs.push('SPACES_SECRET_KEY');
	if (!SPACES_BUCKET) errs.push('SPACES_BUCKET');
	return errs;
}

const SPACES_CONFIG_ERRORS = getSpacesConfigErrors();
if (SPACES_CONFIG_ERRORS.length) {
	console.warn('[spaces] Missing env vars:', SPACES_CONFIG_ERRORS.join(', '));
} else {
	// Debug: show first/last chars of keys (masked) to verify they're being read
	const keyPreview = SPACES_KEY ? `${SPACES_KEY.substring(0, 4)}...${SPACES_KEY.substring(SPACES_KEY.length - 4)}` : 'MISSING';
	const secretPreview = SPACES_SECRET ? `${SPACES_SECRET.substring(0, 4)}...${SPACES_SECRET.substring(SPACES_SECRET.length - 4)}` : 'MISSING';
	console.log(`[spaces] Config loaded - Endpoint: ${SPACES_ENDPOINT}, Bucket: ${SPACES_BUCKET}, Key: ${keyPreview}, Secret: ${secretPreview}`);
}

// Use path-style addressing to avoid TLS SNI issues when endpoint already contains bucket
// Ensure SPACES_ENDPOINT is regional only, e.g. https://sfo3.digitaloceanspaces.com
function normalizeEndpoint(endpoint) {
	if (!endpoint) return endpoint;
	try {
		const u = new URL(endpoint);
		// If someone set endpoint to bucket.sfo3.digitaloceanspaces.com, keep host but path-style will be used
		return u.toString();
	} catch {
		return endpoint;
	}
}

// Initialize S3 client with proper configuration for DigitalOcean Spaces
let s3;
try {
	if (SPACES_ENDPOINT && SPACES_KEY && SPACES_SECRET) {
		s3 = new S3Client({
			region: SPACES_REGION || 'us-east-1',
			endpoint: normalizeEndpoint(SPACES_ENDPOINT),
			forcePathStyle: true, // Required for DigitalOcean Spaces
			credentials: {
				accessKeyId: SPACES_KEY,
				secretAccessKey: SPACES_SECRET
			}
		});
		console.log('[spaces] S3 Client initialized successfully');
	} else {
		console.warn('[spaces] S3 Client not initialized - missing configuration');
		s3 = null;
	}
} catch (err) {
	console.error('[spaces] Failed to initialize S3 client:', err);
	s3 = null;
}

function uniqueKey(prefix, originalName) {
	const safe = String(originalName || 'file').replace(/[^A-Za-z0-9._-]+/g, '_');
	return `${prefix}/${Date.now()}-${Math.round(Math.random()*1e9)}-${safe}`;
}

// Custom multer storage engine for AWS SDK v3
function createS3Storage(prefix) {
	return {
		_handleFile: function (req, file, cb) {
		let callbackCalled = false;
		const safeCallback = (err, result) => {
			if (callbackCalled) {
				console.warn('[spaces] Callback already called, ignoring duplicate call');
				return;
			}
			callbackCalled = true;
			cb(err, result);
		};

		// Check if S3 client is initialized
		if (!s3) {
			const err = new Error('S3 client not initialized. Check DigitalOcean Spaces configuration.');
			err.code = 'SPACES_CONFIG_MISSING';
			return safeCallback(err);
		}

		try {
				// Validate configuration before starting upload
				if (!SPACES_BUCKET || !SPACES_ENDPOINT || !SPACES_KEY || !SPACES_SECRET) {
					const missing = [];
					if (!SPACES_BUCKET) missing.push('SPACES_BUCKET');
					if (!SPACES_ENDPOINT) missing.push('SPACES_ENDPOINT');
					if (!SPACES_KEY) missing.push('SPACES_ACCESS_KEY');
					if (!SPACES_SECRET) missing.push('SPACES_SECRET_KEY');
					const err = new Error(`DigitalOcean Spaces configuration missing: ${missing.join(', ')}`);
					err.code = 'SPACES_CONFIG_MISSING';
					return safeCallback(err);
				}

				const key = uniqueKey(prefix, file.originalname);
				console.log(`[spaces] Starting upload: ${key} (${file.originalname}, ${file.size || 'unknown'} bytes)`);
				console.log(`[spaces] Config check - Bucket: ${SPACES_BUCKET}, Endpoint: ${SPACES_ENDPOINT}, Region: ${SPACES_REGION}`);
				const chunks = [];
				
				file.stream.on('data', (chunk) => {
					chunks.push(chunk);
				});
				
				file.stream.on('end', () => {
					(async () => {
						try {
							const buffer = Buffer.concat(chunks);
							const contentType = file.mimetype || 'application/octet-stream';
							
							console.log(`[spaces] Uploading to Spaces: ${key} (${buffer.length} bytes, ${contentType})`);
							console.log(`[spaces] S3 Client config - Endpoint: ${s3.config.endpoint}, Region: ${s3.config.region}`);
							
							const cmd = new PutObjectCommand({
								Bucket: SPACES_BUCKET,
								Key: key,
								Body: buffer,
								ContentType: contentType,
								ACL: 'private'
							});
							
							console.log(`[spaces] Sending PutObjectCommand to bucket: ${SPACES_BUCKET}, key: ${key}`);
							const result = await s3.send(cmd);
							console.log(`[spaces] Upload successful: ${key}`, result.$metadata ? `Status: ${result.$metadata.httpStatusCode}` : '');
							
							safeCallback(null, {
								key: key,
								location: key,
								bucket: SPACES_BUCKET,
								etag: null,
								contentType: contentType,
								metadata: {},
								size: buffer.length,
								originalname: file.originalname,
								mimetype: file.mimetype
							});
						} catch (err) {
							console.error('[spaces] Error uploading to S3:', err);
							console.error('[spaces] Error details:', {
								name: err.name,
								message: err.message,
								code: err.code,
								$metadata: err.$metadata,
								stack: err.stack
							});
							// Create a more descriptive error
							const uploadErr = new Error(`Failed to upload to DigitalOcean Spaces: ${err.message}`);
							uploadErr.code = err.code || 'SPACES_UPLOAD_ERROR';
							uploadErr.originalError = err;
							safeCallback(uploadErr);
						}
					})().catch((err) => {
						console.error('[spaces] Unhandled promise rejection in upload:', err);
						safeCallback(err);
					});
				});
				
				file.stream.on('error', (err) => {
					console.error('[spaces] File stream error:', err);
					safeCallback(err);
				});
			} catch (err) {
				console.error('[spaces] Error in storage handler:', err);
				safeCallback(err);
			}
		},
		_removeFile: function (req, file, cb) {
			// Optional: implement file deletion if needed
			cb(null);
		}
	};
}

function spacesUploadMiddleware(field = 'file', { maxCount = 1, prefix = 'uploads', maxFileSize = 50 * 1024 * 1024 } = {}) {
	// Check Spaces configuration
	const missing = [];
	if (!SPACES_ENDPOINT) missing.push('SPACES_ENDPOINT');
	if (!SPACES_BUCKET) missing.push('SPACES_BUCKET');
	if (!SPACES_KEY) missing.push('SPACES_ACCESS_KEY');
	if (!SPACES_SECRET) missing.push('SPACES_SECRET_KEY');
	if (missing.length) {
		console.error('[spaces] Missing configuration:', missing.join(', '));
		// Return middleware that immediately fails with clear error
		return (_req, res, next) => {
			const err = new Error('DigitalOcean Spaces is not configured on the server. Missing: ' + missing.join(', '));
			err.code = 'SPACES_CONFIG_MISSING';
			next(err);
		};
	}
	
	const storage = createS3Storage(prefix);
	const uploader = multer({ 
		storage,
		limits: {
			fileSize: maxFileSize // Configurable file size limit (default 50MB)
		}
	});
	return maxCount === 1 ? uploader.single(field) : uploader.array(field, maxCount);
}

async function getSignedDownloadUrl(key, expiresSeconds = 3600) {
	if (!key) return null;
	if (!s3) {
		throw new Error('S3 client not initialized. Check DigitalOcean Spaces configuration.');
	}
	const cmd = new GetObjectCommand({ Bucket: SPACES_BUCKET, Key: key });
	return await getSignedUrl(s3, cmd, { expiresIn: expiresSeconds });
}

async function uploadBufferToSpaces({ key, buffer, contentType = 'application/octet-stream', acl = 'private' }) {
	if (!s3) {
		throw new Error('S3 client not initialized. Check DigitalOcean Spaces configuration.');
	}
	const cmd = new PutObjectCommand({
		Bucket: SPACES_BUCKET,
		Key: key,
		Body: buffer,
		ContentType: contentType,
		ACL: acl
	});
	await s3.send(cmd);
	return key;
}

module.exports = { s3, spacesUploadMiddleware, getSignedDownloadUrl, uploadBufferToSpaces, uniqueKey };


