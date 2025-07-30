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
};

const log = {
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}→ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
};

console.log(`${colors.green}=== Supabase Database Setup (Node.js) ===${colors.reset}\n`);

// Check environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  log.error('Missing required environment variables!');
  console.log('Please ensure the following are set in .env.local:');
  console.log('  - NEXT_PUBLIC_SUPABASE_URL');
  console.log('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Check if using default/placeholder values
if (supabaseUrl.includes('your-supabase-project-url') || supabaseUrl.includes('your-project')) {
  log.error('Please update NEXT_PUBLIC_SUPABASE_URL with your actual Supabase URL');
  console.log('It should look like: https://abcdefghijk.supabase.co');
  process.exit(1);
}

log.info(`Supabase URL: ${supabaseUrl}`);

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Function to run a SQL query
async function runSQL(sql, filename) {
  try {
    // Split SQL into individual statements (simple split by semicolon)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      // Skip empty statements
      if (!statement.trim()) continue;

      // For Supabase, we need to use the REST API to run raw SQL
      // This is a workaround since Supabase doesn't expose direct SQL execution
      log.info(`Executing: ${statement.substring(0, 50)}...`);
      
      // Try to parse and execute based on statement type
      if (statement.toUpperCase().includes('CREATE TABLE')) {
        log.warning('CREATE TABLE detected - this needs to be run in Supabase SQL Editor');
      } else if (statement.toUpperCase().includes('CREATE POLICY')) {
        log.warning('CREATE POLICY detected - this needs to be run in Supabase SQL Editor');
      } else if (statement.toUpperCase().includes('ALTER TABLE')) {
        log.warning('ALTER TABLE detected - this needs to be run in Supabase SQL Editor');
      } else if (statement.toUpperCase().includes('CREATE INDEX')) {
        log.warning('CREATE INDEX detected - this needs to be run in Supabase SQL Editor');
      }
    }
    
    return { success: false, requiresManual: true };
  } catch (error) {
    console.error(`Error in ${filename}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Function to test if tables exist
async function checkTableExists(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error && error.code === '42P01') {
      return false; // Table doesn't exist
    }
    
    return !error;
  } catch (err) {
    return false;
  }
}

// Main setup function
async function setupDatabase() {
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  
  try {
    // Read all migration files
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
    
    if (sqlFiles.length === 0) {
      log.error('No SQL migration files found!');
      return;
    }
    
    log.info(`Found ${sqlFiles.length} migration files\n`);
    
    // Since we can't run raw SQL through the JS client, we'll generate a combined script
    const combinedSQL = [];
    
    for (const file of sqlFiles) {
      log.info(`Reading: ${file}`);
      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      combinedSQL.push(`-- Migration: ${file}`);
      combinedSQL.push(sql);
      combinedSQL.push('');
    }
    
    // Save combined SQL for manual execution
    const outputPath = path.join(__dirname, 'combined-migrations.sql');
    await fs.writeFile(outputPath, combinedSQL.join('\n'));
    
    log.success(`Combined migrations saved to: ${outputPath}\n`);
    
    // Check which tables exist
    console.log(`${colors.yellow}Checking existing tables...${colors.reset}\n`);
    
    const tables = ['users', 'articles', 'workers'];
    const missingTables = [];
    
    for (const table of tables) {
      const exists = await checkTableExists(table);
      if (exists) {
        log.success(`Table '${table}' exists`);
      } else {
        log.error(`Table '${table}' not found`);
        missingTables.push(table);
      }
    }
    
    console.log('');
    
    if (missingTables.length > 0) {
      console.log(`${colors.yellow}=== Manual Setup Required ===${colors.reset}\n`);
      console.log('The Supabase JavaScript client cannot run DDL statements directly.');
      console.log('Please follow these steps:\n');
      console.log('1. Go to your Supabase project dashboard');
      console.log('2. Navigate to the SQL Editor');
      console.log('3. Copy and paste the contents of:');
      console.log(`   ${colors.green}${outputPath}${colors.reset}`);
      console.log('4. Click "Run" to execute all migrations\n');
      console.log('Alternatively, run each migration file individually in order:');
      sqlFiles.forEach(file => {
        console.log(`   - ${file}`);
      });
    } else {
      log.success('All required tables exist!');
      console.log('\nYour database is ready to use.');
    }
    
  } catch (error) {
    log.error(`Setup failed: ${error.message}`);
    console.error(error);
  }
}

// Test connection first
async function testConnection() {
  log.info('Testing Supabase connection...');
  
  try {
    // Try to query a system table
    const { data, error } = await supabase.from('users').select('count(*)').limit(0);
    
    if (error && error.code !== '42P01') { // 42P01 = table doesn't exist (which is ok)
      throw error;
    }
    
    log.success('Successfully connected to Supabase\n');
    return true;
  } catch (error) {
    log.error('Failed to connect to Supabase');
    console.error('Error:', error.message);
    
    if (error.message.includes('Invalid API key')) {
      console.log('\nPlease check your SUPABASE_SERVICE_ROLE_KEY in .env.local');
    }
    
    return false;
  }
}

// Run the setup
async function main() {
  const connected = await testConnection();
  
  if (!connected) {
    process.exit(1);
  }
  
  await setupDatabase();
}

main().catch(console.error);