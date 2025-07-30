# XFunnel Database Setup Summary

## Current Status

✅ **Scripts Created:**
- `scripts/setup-database-simple.js` - Main setup script
- `scripts/setup-supabase-db.sh` - Bash alternative 
- `scripts/setup-supabase.py` - Python alternative
- `scripts/test-connection.js` - Connection tester
- `scripts/combined-migrations.sql` - All SQL migrations in one file

✅ **Documentation Created:**
- `DATABASE_SETUP.md` - Detailed setup instructions
- `SUPABASE_SETUP_GUIDE.md` - Quick setup guide
- This summary file

## ⚠️ Issue Found

The Supabase connection is failing, likely because:
1. The API keys in `.env.local` may be incorrect or from a different project
2. The service role key is still set to placeholder value

## 🚀 Quick Fix Steps

### 1. Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings → API**
4. Copy these values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)
   - **service_role** key (also starts with `eyJ...`)

### 2. Update .env.local

Replace the values in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 3. Run Database Setup

#### Option A: Automated Setup (if service role key is provided)
```bash
npm run setup:db
```

#### Option B: Manual Setup
1. Go to your [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql)
2. Copy contents of `scripts/combined-migrations.sql`
3. Paste and click "Run"

### 4. Test Your Setup

```bash
# Test connection
node scripts/test-connection.js

# Start the app
npm run dev
```

Then visit http://localhost:3000/login and try registering.

## 📁 All Database Scripts

```bash
# Available setup commands:
npm run setup:db          # Simplified Node.js script
npm run setup:db:node     # Full Node.js script  
npm run setup:db:bash     # Bash script (requires psql)
npm run setup:db:python   # Python script (requires psycopg2)

# Test connection:
node scripts/test-connection.js
```

## 🎯 What Gets Created

The setup creates 4 tables:
- `users` - User accounts and authentication
- `articles` - Article content and metadata
- `workers` - AI worker session tracking
- `activity_sessions` - Detailed activity analytics

## ❓ Still Having Issues?

1. **"Invalid API key"** - Double-check you copied the correct keys from Supabase
2. **"User already exists"** - Tables might not be created yet, run the setup
3. **Can't connect** - Ensure Supabase project is active (not paused)

The combined SQL file at `scripts/combined-migrations.sql` contains everything needed for manual setup if the automated scripts fail.