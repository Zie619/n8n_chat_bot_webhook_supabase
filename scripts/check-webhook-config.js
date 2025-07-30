#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.error('❌ .env.local file not found!');
  console.log('Please create a .env.local file in the project root.');
  process.exit(1);
}

console.log('🔍 Checking webhook configuration...\n');

// Check N8N_WEBHOOK_URL
const webhookUrl = process.env.N8N_WEBHOOK_URL;
if (!webhookUrl) {
  console.error('❌ N8N_WEBHOOK_URL is not set in .env.local');
  console.log('Please add: N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/your-webhook-id');
} else if (webhookUrl.includes('your-n8n-instance.com')) {
  console.warn('⚠️  N8N_WEBHOOK_URL is still using the placeholder value');
  console.log('Current value:', webhookUrl);
  console.log('Please update it with your actual n8n webhook URL');
} else {
  console.log('✅ N8N_WEBHOOK_URL is configured');
  console.log('Webhook URL:', webhookUrl.replace(/\/webhook\/.*$/, '/webhook/***'));
}

console.log('');

// Check N8N_WEBHOOK_AUTH_HEADER
const authHeader = process.env.N8N_WEBHOOK_AUTH_HEADER;
if (!authHeader || authHeader === 'optional-auth-header') {
  console.log('ℹ️  N8N_WEBHOOK_AUTH_HEADER is not configured (optional)');
  console.log('If your n8n webhook requires authentication, add:');
  console.log('N8N_WEBHOOK_AUTH_HEADER=Bearer your-auth-token');
} else {
  console.log('✅ N8N_WEBHOOK_AUTH_HEADER is configured');
}

console.log('\n📝 Next steps:');
console.log('1. Update N8N_WEBHOOK_URL in .env.local with your actual n8n webhook URL');
console.log('2. Restart your Next.js development server (npm run dev)');
console.log('3. Test by sending an article from the xFunnel interface');
console.log('\nFor detailed instructions, see: docs/WEBHOOK_CONFIGURATION.md');