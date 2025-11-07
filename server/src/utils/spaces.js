const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const multer = require('multer');
const multerS3 = require('multer-s3');

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

const s3 = new S3Client({
	region: SPACES_REGION,
	endpoint: normalizeEndpoint(SPACES_ENDPOINT),
	forcePathStyle: true,
	credentials: {
		accessKeyId: SPACES_KEY || '',
		secretAccessKey: SPACES_SECRET || ''
	}
});

function uniqueKey(prefix, originalName) {
	const safe = String(originalName || 'file').replace(/[^A-Za-z0-9._-]+/g, '_');
	return `${prefix}/${Date.now()}-${Math.round(Math.random()*1e9)}-${safe}`;
}

function spacesUploadMiddleware(field = 'file', { maxCount = 1, prefix = 'uploads' } = {}) {
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
	
	const storage = multerS3({
		s3,
		bucket: SPACES_BUCKET,
		acl: 'private',
		contentType: multerS3.AUTO_CONTENT_TYPE,
		key: (_req, file, cb) => {
			try {
				cb(null, uniqueKey(prefix, file.originalname));
			} catch (err) {
				console.error('[spaces] Error generating key:', err);
				cb(err);
			}
		}
	});
	const uploader = multer({ 
		storage,
		limits: {
			fileSize: 5 * 1024 * 1024 // 5MB limit for profile photos
		}
	});
	return maxCount === 1 ? uploader.single(field) : uploader.array(field, maxCount);
}

async function getSignedDownloadUrl(key, expiresSeconds = 3600) {
	if (!key) return null;
	const cmd = new GetObjectCommand({ Bucket: SPACES_BUCKET, Key: key });
	return await getSignedUrl(s3, cmd, { expiresIn: expiresSeconds });
}

async function uploadBufferToSpaces({ key, buffer, contentType = 'application/octet-stream', acl = 'private' }) {
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


