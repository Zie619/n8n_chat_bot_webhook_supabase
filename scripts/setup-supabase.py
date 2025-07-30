#!/usr/bin/env python3
"""
Supabase Database Setup Script
Requires: pip install python-dotenv psycopg2-binary
"""

import os
import sys
import glob
import psycopg2
from pathlib import Path
from dotenv import load_dotenv
from urllib.parse import urlparse

# Colors for output
class Colors:
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def log_error(msg):
    print(f"{Colors.RED}✗ {msg}{Colors.RESET}")

def log_success(msg):
    print(f"{Colors.GREEN}✓ {msg}{Colors.RESET}")

def log_info(msg):
    print(f"{Colors.BLUE}→ {msg}{Colors.RESET}")

def log_warning(msg):
    print(f"{Colors.YELLOW}⚠ {msg}{Colors.RESET}")

print(f"{Colors.GREEN}=== Supabase Database Setup (Python) ==={Colors.RESET}\n")

# Load environment variables
env_path = Path('.env.local')
if not env_path.exists():
    log_error(".env.local file not found!")
    print("Please create .env.local with your Supabase credentials")
    sys.exit(1)

load_dotenv(dotenv_path=env_path)

# Get environment variables
supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not supabase_url or not service_role_key:
    log_error("Missing required environment variables!")
    print("Please ensure the following are set in .env.local:")
    print("  - NEXT_PUBLIC_SUPABASE_URL")
    print("  - SUPABASE_SERVICE_ROLE_KEY")
    sys.exit(1)

# Extract project reference from URL
try:
    parsed = urlparse(supabase_url)
    project_ref = parsed.hostname.split('.')[0]
except:
    log_error("Could not parse Supabase URL")
    print("URL should be in format: https://yourproject.supabase.co")
    sys.exit(1)

log_info(f"Project Reference: {project_ref}")
log_info(f"Supabase URL: {supabase_url}\n")

# Build connection string
# Supabase connection format
db_host = f"aws-0-us-west-1.pooler.supabase.com"
db_port = 6543
db_name = "postgres"
db_user = f"postgres.{project_ref}"
db_password = service_role_key

# Test connection
try:
    log_info("Testing database connection...")
    conn = psycopg2.connect(
        host=db_host,
        port=db_port,
        database=db_name,
        user=db_user,
        password=db_password,
        sslmode='require'
    )
    conn.close()
    log_success("Successfully connected to Supabase database\n")
except psycopg2.Error as e:
    log_error(f"Could not connect to database: {e}")
    print("\nPlease check your credentials and try again.")
    print("Note: Make sure you're using the SERVICE_ROLE_KEY, not the ANON_KEY")
    sys.exit(1)

# Get migration files
migration_dir = Path("supabase/migrations")
if not migration_dir.exists():
    log_error(f"Migration directory not found: {migration_dir}")
    sys.exit(1)

migration_files = sorted(migration_dir.glob("*.sql"))
if not migration_files:
    log_error("No SQL migration files found!")
    sys.exit(1)

log_info(f"Found {len(migration_files)} migration files\n")

# Run migrations
failed_migrations = []

for migration_file in migration_files:
    filename = migration_file.name
    log_info(f"Running migration: {filename}")
    
    try:
        # Read SQL file
        with open(migration_file, 'r') as f:
            sql = f.read()
        
        # Connect and execute
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            database=db_name,
            user=db_user,
            password=db_password,
            sslmode='require'
        )
        
        with conn.cursor() as cur:
            # Execute the entire SQL file
            cur.execute(sql)
            conn.commit()
        
        conn.close()
        log_success(f"{filename} completed successfully\n")
        
    except psycopg2.Error as e:
        log_error(f"{filename} failed: {e}\n")
        failed_migrations.append(filename)
        # Continue with other migrations
        continue
    except Exception as e:
        log_error(f"{filename} failed with unexpected error: {e}\n")
        failed_migrations.append(filename)
        continue

# Verify tables
print(f"\n{Colors.YELLOW}Verifying database setup...{Colors.RESET}\n")

tables_to_check = ['users', 'articles', 'workers']
missing_tables = []

try:
    conn = psycopg2.connect(
        host=db_host,
        port=db_port,
        database=db_name,
        user=db_user,
        password=db_password,
        sslmode='require'
    )
    
    with conn.cursor() as cur:
        for table in tables_to_check:
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = %s
                );
            """, (table,))
            exists = cur.fetchone()[0]
            
            if exists:
                log_success(f"Table '{table}' exists")
            else:
                log_error(f"Table '{table}' not found")
                missing_tables.append(table)
    
    conn.close()
    
except psycopg2.Error as e:
    log_error(f"Error checking tables: {e}")

print("")

# Final summary
if not missing_tables and not failed_migrations:
    print(f"{Colors.GREEN}=== Database setup completed successfully! ==={Colors.RESET}\n")
    print("You can now:")
    print("  1. Register new users at http://localhost:3000/login")
    print("  2. Create and manage articles")
    print("  3. Track user activity")
else:
    print(f"{Colors.RED}=== Setup completed with errors ==={Colors.RESET}\n")
    
    if failed_migrations:
        print(f"Failed migrations: {', '.join(failed_migrations)}")
        print("Please check the errors above and fix them.")
    
    if missing_tables:
        print(f"Missing tables: {', '.join(missing_tables)}")
        print("You may need to run the failed migrations manually.")
    
    print("\nYou can run migrations manually in the Supabase SQL Editor.")