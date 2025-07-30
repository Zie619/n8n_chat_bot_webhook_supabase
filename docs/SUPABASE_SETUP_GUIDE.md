# Supabase Database Setup Guide

## Quick Setup

### Step 1: Update Environment Variables

1. Open `.env.local` and ensure you have:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (optional but recommended)
   ```

2. Get these values from your Supabase project:
   - Go to https://supabase.com/dashboard/project/your-project/settings/api
   - Copy the Project URL, anon key, and service role key

### Step 2: Run Setup Script

Try the automated setup first:
```bash
npm run setup:db
```

If that doesn't work due to missing service role key, follow the manual setup below.

### Step 3: Manual Setup (if needed)

1. Go to your Supabase SQL Editor:
   https://supabase.com/dashboard/project/your-project/sql/new

2. Copy and paste the entire contents of:
   ```
   scripts/combined-migrations.sql
   ```

3. Click "Run" to execute all migrations

## What Gets Created

The setup creates these tables:

### 1. **users** table
- User authentication and profile data
- Activity tracking (login times, article count, AI usage)

### 2. **articles** table  
- Article content and metadata
- Activity tracking (time spent, edits, AI requests)
- Session management

### 3. **workers** table
- AI worker session tracking
- Request counts and processing metrics

### 4. **activity_sessions** table
- Detailed session analytics
- Event tracking for user behavior

## Troubleshooting

### "Invalid API key" Error
- Double-check your Supabase URL and API keys
- Ensure there are no typos (like "yhttps" instead of "https")
- Make sure you're using the correct project's credentials

### "User with this email already exists" Error
1. This might mean the database isn't properly connected
2. Check if tables exist in Supabase Table Editor
3. Try registering with a different email to test

### Tables Not Created
1. Run the manual setup steps above
2. Check Supabase logs for any SQL errors
3. Ensure you have proper permissions in your Supabase project

### Connection Issues
- Verify your internet connection
- Check if Supabase service is operational
- Try accessing your Supabase dashboard directly

## Testing Your Setup

After setup, test by:

1. Starting the dev server:
   ```bash
   npm run dev
   ```

2. Navigate to http://localhost:3000/login

3. Try registering a new account

4. If successful, you should be able to:
   - Create articles
   - Track activity
   - Use AI features

## Alternative Setup Methods

If the Node.js script doesn't work, try:

```bash
# Bash script (requires psql)
npm run setup:db:bash

# Python script (requires psycopg2)
pip install python-dotenv psycopg2-binary
npm run setup:db:python
```

## Need Help?

1. Check Supabase logs for detailed error messages
2. Verify all environment variables are correctly set
3. Ensure your Supabase project is active and not paused
4. Try the manual SQL setup if automated scripts fail