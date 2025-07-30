# Database Setup Guide

## Setting up Supabase for xFunnel

### 1. Local Development Setup

If you're using Supabase locally or haven't set up the database yet, follow these steps:

#### Prerequisites
- Ensure you have your Supabase project URL and keys in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
```

#### Running Migrations

1. **Option A: Using Supabase SQL Editor (Recommended)**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run each migration file in order:
     - `000_create_articles_table.sql`
     - `001_create_users_table.sql`
     - `002_update_articles_table.sql`
     - `003_create_workers_table.sql`
     - `004_update_workers_table_activity_tracking.sql`

2. **Option B: Using the setup script**
   ```bash
   npm install
   node scripts/setup-database.js
   ```

### 2. Testing the Setup

After running the migrations, test your setup:

1. Try registering a new user at `/login`
2. Create and edit articles
3. Check if data persists in Supabase

### 3. Troubleshooting

#### "User with this email already exists" error when no user exists
This usually means:
- The database connection is failing
- The users table doesn't exist
- There's a connectivity issue with Supabase

**Solution:**
1. Check your environment variables in `.env.local`
2. Ensure all migrations have been run
3. Check Supabase dashboard for any errors
4. Verify your Supabase URL and keys are correct

#### Cannot connect to Supabase
1. Ensure your Supabase project is active
2. Check if your IP is allowed in Supabase settings (for production)
3. Verify environment variables are correctly set

### 4. Development without Supabase

If you want to develop without Supabase connection:
- The app will use mock data for authentication
- Articles will be stored in memory (not persisted)
- Use these test credentials:
  - Email: `test@example.com`
  - Password: `password`

### 5. Clearing Test Data

To clear all test data:
```sql
-- Run in Supabase SQL Editor
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE articles CASCADE;
TRUNCATE TABLE workers CASCADE;
```

**Warning:** This will delete all data in these tables!