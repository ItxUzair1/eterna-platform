#!/usr/bin/env node
// Script to generate and save EMAIL_ENCRYPTION_KEY to .env file
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
const key = crypto.randomBytes(32).toString('hex');

console.log('Generated EMAIL_ENCRYPTION_KEY:');
console.log(key);
console.log('');

try {
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Check if EMAIL_ENCRYPTION_KEY already exists
  if (envContent.includes('EMAIL_ENCRYPTION_KEY=')) {
    // Replace existing key
    envContent = envContent.replace(
      /EMAIL_ENCRYPTION_KEY=.*/g,
      `EMAIL_ENCRYPTION_KEY=${key}`
    );
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('✅ Updated EMAIL_ENCRYPTION_KEY in .env file');
  } else {
    // Append new key
    const newLine = envContent.endsWith('\n') || envContent === '' ? '' : '\n';
    fs.appendFileSync(envPath, `${newLine}EMAIL_ENCRYPTION_KEY=${key}\n`, 'utf8');
    console.log('✅ Added EMAIL_ENCRYPTION_KEY to .env file');
  }
  
  console.log('');
  console.log('⚠️  IMPORTANT:');
  console.log('⚠️  If you have existing SMTP accounts with encrypted passwords,');
  console.log('⚠️  you MUST update their passwords after setting this key.');
  console.log('⚠️  Otherwise, decryption will fail.');
  console.log('');
  console.log('✅ Restart your server for the changes to take effect.');
} catch (err) {
  console.error('❌ Error writing to .env file:', err.message);
  console.error('');
  console.error('Please manually add this to your .env file:');
  console.error(`EMAIL_ENCRYPTION_KEY=${key}`);
}

