const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables!');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  const migrationFiles = fs.readdirSync(migrationsDir).sort();

  console.log('Running database migrations...\n');

  for (const file of migrationFiles) {
    if (!file.endsWith('.sql')) continue;
    
    console.log(`Running migration: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).single();
      
      if (error) {
        // If RPC doesn't exist, try a different approach
        console.warn(`Note: Direct SQL execution may require Supabase SQL Editor or migrations through Supabase CLI.`);
        console.log(`Migration content for ${file}:`);
        console.log(sql);
        console.log('\n---\n');
      } else {
        console.log(`✓ ${file} completed successfully`);
      }
    } catch (err) {
      console.error(`Error running ${file}:`, err.message);
    }
  }
  
  console.log('\nMigrations completed!');
  console.log('\nNote: If migrations failed, you can run them manually in the Supabase SQL Editor.');
}

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    const { data, error } = await supabase.from('users').select('count').single();
    
    if (error && error.code === '42P01') {
      console.log('Tables not yet created. Please run migrations in Supabase SQL Editor.');
      return false;
    }
    
    if (error) {
      console.error('Connection error:', error);
      return false;
    }
    
    console.log('✓ Successfully connected to Supabase');
    return true;
  } catch (err) {
    console.error('Connection failed:', err);
    return false;
  }
}

async function main() {
  console.log('Setting up Supabase database...\n');
  
  const connected = await testConnection();
  
  if (connected) {
    console.log('\nDatabase is already set up!');
  } else {
    console.log('\nPlease run the following migrations in your Supabase SQL Editor:');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run each migration file in order\n');
    
    await runMigrations();
  }
}

main().catch(console.error);