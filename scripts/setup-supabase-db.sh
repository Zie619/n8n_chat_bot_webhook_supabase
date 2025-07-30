#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Supabase Database Setup Script ===${NC}\n"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}Error: .env.local file not found!${NC}"
    echo "Please create .env.local with your Supabase credentials"
    exit 1
fi

# Load environment variables from .env.local
export $(cat .env.local | grep -v '^#' | xargs)

# Check required environment variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}Error: Missing required environment variables!${NC}"
    echo "Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local"
    exit 1
fi

# Extract project ref from Supabase URL
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed -n 's/https:\/\/\(.*\)\.supabase\.co.*/\1/p')

if [ -z "$PROJECT_REF" ]; then
    echo -e "${RED}Error: Could not extract project reference from Supabase URL${NC}"
    echo "URL should be in format: https://yourproject.supabase.co"
    exit 1
fi

echo -e "${YELLOW}Project Reference: ${PROJECT_REF}${NC}"
echo -e "${YELLOW}Supabase URL: ${NEXT_PUBLIC_SUPABASE_URL}${NC}\n"

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: PostgreSQL client (psql) is not installed!${NC}"
    echo "Please install PostgreSQL client:"
    echo "  Ubuntu/Debian: sudo apt-get install postgresql-client"
    echo "  macOS: brew install postgresql"
    echo "  Windows: Download from https://www.postgresql.org/download/"
    exit 1
fi

# Database connection string
DB_URL="postgresql://postgres.${PROJECT_REF}:${SUPABASE_SERVICE_ROLE_KEY}@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

# Test connection
echo -e "${YELLOW}Testing database connection...${NC}"
PGPASSWORD="${SUPABASE_SERVICE_ROLE_KEY}" psql "${DB_URL}" -c "SELECT version();" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Could not connect to Supabase database!${NC}"
    echo "Please check your credentials and try again."
    exit 1
fi

echo -e "${GREEN}✓ Successfully connected to Supabase database${NC}\n"

# Get migration files
MIGRATION_DIR="supabase/migrations"
if [ ! -d "$MIGRATION_DIR" ]; then
    echo -e "${RED}Error: Migration directory not found!${NC}"
    echo "Expected directory: $MIGRATION_DIR"
    exit 1
fi

# Run migrations in order
echo -e "${YELLOW}Running migrations...${NC}\n"

for migration in $(ls $MIGRATION_DIR/*.sql | sort); do
    filename=$(basename "$migration")
    echo -e "${YELLOW}Running migration: $filename${NC}"
    
    # Run the migration
    PGPASSWORD="${SUPABASE_SERVICE_ROLE_KEY}" psql "${DB_URL}" -f "$migration" 2>&1 | while IFS= read -r line; do
        if [[ $line == *"ERROR"* ]]; then
            echo -e "${RED}$line${NC}"
        elif [[ $line == *"NOTICE"* ]]; then
            echo -e "${YELLOW}$line${NC}"
        else
            echo "$line"
        fi
    done
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        echo -e "${GREEN}✓ $filename completed successfully${NC}\n"
    else
        echo -e "${RED}✗ $filename failed${NC}\n"
        echo -e "${YELLOW}You may need to fix this migration and run it manually${NC}"
    fi
done

# Verify tables were created
echo -e "${YELLOW}Verifying database setup...${NC}\n"

TABLES=("users" "articles" "workers")
ALL_GOOD=true

for table in "${TABLES[@]}"; do
    result=$(PGPASSWORD="${SUPABASE_SERVICE_ROLE_KEY}" psql "${DB_URL}" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');" 2>/dev/null | tr -d '[:space:]')
    
    if [ "$result" = "t" ]; then
        echo -e "${GREEN}✓ Table '$table' exists${NC}"
    else
        echo -e "${RED}✗ Table '$table' not found${NC}"
        ALL_GOOD=false
    fi
done

echo ""

if [ "$ALL_GOOD" = true ]; then
    echo -e "${GREEN}=== Database setup completed successfully! ===${NC}"
    echo -e "\nYou can now:"
    echo -e "  1. Register new users at http://localhost:3000/login"
    echo -e "  2. Create and manage articles"
    echo -e "  3. Track user activity"
else
    echo -e "${RED}=== Some tables are missing ===${NC}"
    echo -e "\nPlease check the migration errors above and fix them."
    echo -e "You can also run migrations manually in the Supabase SQL Editor."
fi