# Database Setup Instructions

## Prerequisites
- A Supabase project (create one at https://supabase.com)
- Supabase CLI (optional, for local development)

## Setup Steps

### 1. Run Migrations

Navigate to your Supabase project dashboard and go to the SQL Editor. Run each migration file in order:

1. **001_create_users_table.sql** - Creates the users table for authentication
2. **002_update_articles_table.sql** - Updates articles table with user relationships
3. **003_create_workers_table.sql** - Creates workers table for activity tracking

### 2. Enable Authentication

In your Supabase dashboard:
1. Go to Authentication → Settings
2. Disable "Enable email confirmations" for easier testing (re-enable in production)
3. Configure JWT secret (save this for your .env file)

### 3. Update Environment Variables

Update your `.env.local` file with:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
JWT_SECRET=your-jwt-secret
```

### 4. Create Initial Articles Table (if not exists)

If the articles table doesn't exist yet, run this:

```sql
CREATE TABLE IF NOT EXISTS articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'draft',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
```

### 5. Test the Setup

You can test the setup by creating a test user:

```sql
-- This is just for testing, in production passwords should be hashed
INSERT INTO users (email, password_hash) 
VALUES ('test@example.com', 'hashed_password_here');
```

## Security Notes

1. Always use password hashing (bcrypt) in your application
2. Enable RLS policies on all tables
3. Use environment variables for sensitive data
4. Implement proper JWT token validation
5. Add rate limiting for authentication endpoints

## Next Steps

After database setup:
1. Implement authentication API routes
2. Create login/register pages
3. Add session management
4. Implement activity tracking