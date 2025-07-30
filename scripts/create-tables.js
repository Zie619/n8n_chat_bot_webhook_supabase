#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}→ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
};

console.log(`${colors.cyan}=== Supabase Table Creation Script ===${colors.reset}\n`);

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  log.error('Missing required environment variables!');
  console.log('Please ensure the following are set in .env.local:');
  console.log('  - NEXT_PUBLIC_SUPABASE_URL');
  console.log('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (serviceRoleKey === 'your-service-role-key-here') {
  log.error('Service role key is still set to placeholder value!');
  console.log('\nTo create tables, you need to:');
  console.log('1. Go to your Supabase dashboard');
  console.log('2. Navigate to Settings → API');
  console.log('3. Copy the service_role key');
  console.log('4. Update SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

console.log(`${colors.yellow}IMPORTANT: Since Supabase JS client cannot execute DDL statements,${colors.reset}`);
console.log(`${colors.yellow}you need to manually run the SQL in Supabase SQL Editor.${colors.reset}\n`);

console.log(`${colors.cyan}Steps to create tables:${colors.reset}\n`);
console.log('1. Go to your Supabase SQL Editor:');
console.log(`   ${colors.blue}https://supabase.com/dashboard/project/arnoyxumlfkmckpiqixj/sql/new${colors.reset}\n`);

console.log('2. Copy the entire contents of this file:');
console.log(`   ${colors.green}scripts/combined-migrations.sql${colors.reset}\n`);

console.log('3. Paste it in the SQL Editor and click "Run"\n');

console.log(`${colors.cyan}Alternative: Use Supabase CLI${colors.reset}`);
console.log('If you have Supabase CLI installed:');
console.log('  npx supabase db push\n');

// Show preview of SQL file
async function showSQLPreview() {
  try {
    const sqlPath = path.join(__dirname, 'combined-migrations.sql');
    const sql = await fs.readFile(sqlPath, 'utf8');
    const lines = sql.split('\n').slice(0, 20);
    
    console.log(`${colors.yellow}Preview of SQL to run:${colors.reset}`);
    console.log('----------------------------------------');
    lines.forEach(line => console.log(line));
    console.log('... (and more)');
    console.log('----------------------------------------\n');
    
    console.log(`${colors.green}Full SQL file location:${colors.reset}`);
    console.log(`${sqlPath}\n`);
    
    // Count what will be created
    const tableMatches = sql.match(/CREATE TABLE/gi) || [];
    const indexMatches = sql.match(/CREATE INDEX/gi) || [];
    const functionMatches = sql.match(/CREATE OR REPLACE FUNCTION/gi) || [];
    const policyMatches = sql.match(/CREATE POLICY/gi) || [];
    
    console.log(`${colors.cyan}What will be created:${colors.reset}`);
    console.log(`  - ${tableMatches.length} tables`);
    console.log(`  - ${indexMatches.length} indexes`);
    console.log(`  - ${functionMatches.length} functions`);
    console.log(`  - ${policyMatches.length} RLS policies\n`);
    
  } catch (error) {
    log.error(`Could not read SQL file: ${error.message}`);
  }
}

// Test connection with service role key
async function testConnection() {
  log.info('Testing connection with service role key...');
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  try {
    // Test if we can query
    const { data, error } = await supabase.from('users').select('*', { count: 'exact', head: true });
    
    if (error && error.code === '42P01') {
      log.warning('Tables do not exist yet - this is expected');
      log.info('Please follow the steps above to create them');
    } else if (error) {
      log.error(`Connection error: ${error.message}`);
    } else {
      log.success('Connected successfully!');
      log.warning('But tables might already exist');
    }
  } catch (err) {
    log.error(`Failed to connect: ${err.message}`);
  }
}

// Run
async function main() {
  await showSQLPreview();
  await testConnection();
  
  console.log(`${colors.cyan}Ready to create tables?${colors.reset}`);
  console.log('Follow the steps above to complete the setup.\n');
}

main().catch(console.error);