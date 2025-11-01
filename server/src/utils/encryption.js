// server/src/utils/encryption.js
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Use environment variable for encryption key (32 bytes = 64 hex chars for AES-256)
// If not set, try to load from .env file or generate one and save it
let ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  // Try to read from .env file
  const envPath = path.join(__dirname, '../../.env');
  try {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/EMAIL_ENCRYPTION_KEY=(.+)/);
      if (match && match[1]) {
        ENCRYPTION_KEY = match[1].trim();
        // Remove quotes if present
        if ((ENCRYPTION_KEY.startsWith('"') && ENCRYPTION_KEY.endsWith('"')) || 
            (ENCRYPTION_KEY.startsWith("'") && ENCRYPTION_KEY.endsWith("'"))) {
          ENCRYPTION_KEY = ENCRYPTION_KEY.slice(1, -1);
        }
        // Set it in process.env so it's available for this session
        process.env.EMAIL_ENCRYPTION_KEY = ENCRYPTION_KEY;
      }
    }
  } catch (err) {
    console.warn('Could not read .env file:', err.message);
  }
}

if (!ENCRYPTION_KEY) {
  // Generate a new key and try to save it to .env
  ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
  const envPath = path.join(__dirname, '../../.env');
  
  console.warn('⚠️  WARNING: EMAIL_ENCRYPTION_KEY not found. Generated new key.');
  console.warn('⚠️  IMPORTANT: This will cause all existing encrypted passwords to fail!');
  console.warn('⚠️  If you have existing SMTP accounts, you MUST update their passwords.');
  
  try {
    // Try to append to .env file
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Check if EMAIL_ENCRYPTION_KEY already exists in file
    if (!envContent.includes('EMAIL_ENCRYPTION_KEY=')) {
      const newLine = envContent.endsWith('\n') ? '' : '\n';
      fs.appendFileSync(envPath, `${newLine}EMAIL_ENCRYPTION_KEY=${ENCRYPTION_KEY}\n`);
      console.log('✅ Generated encryption key and saved to .env file');
      console.log('✅ Restart the server for the key to take effect');
    } else {
      console.error('❌ EMAIL_ENCRYPTION_KEY exists in .env but is empty or invalid');
      console.error('❌ Please set EMAIL_ENCRYPTION_KEY in your .env file manually');
    }
  } catch (err) {
    console.error('❌ Could not write to .env file:', err.message);
    console.error('❌ Please manually add to .env:');
    console.error(`EMAIL_ENCRYPTION_KEY=${ENCRYPTION_KEY}`);
  }
  
  // Set it in process.env for this session
  process.env.EMAIL_ENCRYPTION_KEY = ENCRYPTION_KEY;
}

// Ensure key is 64 hex characters (32 bytes)
if (ENCRYPTION_KEY.length !== 64) {
  throw new Error('EMAIL_ENCRYPTION_KEY must be 64 hex characters (32 bytes). Current length: ' + ENCRYPTION_KEY.length);
}

const ALGORITHM = 'aes-256-cbc';

function encrypt(text) {
  if (!text) return text;
  try {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (err) {
    throw new Error('Encryption failed: ' + err.message);
  }
}

function decrypt(text) {
  if (!text) return text;
  try {
    const parts = text.split(':');
    if (parts.length < 2) {
      // If no colon separator, assume it's not encrypted (legacy support)
      return text;
    }
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    // Re-throw with more context about the error
    if (err.message.includes('bad decrypt') || err.message.includes('wrong final block length')) {
      const keySource = process.env.EMAIL_ENCRYPTION_KEY ? 'environment variable' : '.env file';
      throw new Error(`Decryption failed: The encryption key may have changed or the password was encrypted with a different key. The current key is loaded from ${keySource}. Please update your SMTP account password in Settings to re-encrypt it with the current key.`);
    }
    throw new Error('Decryption failed: ' + err.message);
  }
}

module.exports = { encrypt, decrypt };