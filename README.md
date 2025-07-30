# xFunnel - AI-Powered Article Editor

xFunnel is a modern web application that integrates Claude AI for intelligent article editing and n8n for workflow automation. Built with Next.js, TypeScript, and Supabase, it provides a seamless editing experience with real-time collaboration features.
![alt text](<Screenshot 2025-07-11 at 17.36.34.png>)
## Features

- **AI-Powered Editing**: Integrated Claude AI for intelligent content suggestions and editing
- **Real-time Collaboration**: Multiple users can view and edit articles with last-editor tracking
- **Workflow Automation**: n8n webhook integration for automated article processing
- **Modern UI**: Clean, responsive interface with dark mode support
- **Activity Tracking**: Monitor user activity and article editing patterns
- **Worker Management**: Track and manage background workers with real-time statistics

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js 18.x or higher
- npm or yarn package manager
- PostgreSQL database (via Supabase)
- Git

You'll also need accounts for:
- [Supabase](https://supabase.com) - For database and authentication
- [Anthropic](https://anthropic.com) - For Claude AI API access
- [n8n](https://n8n.io) (optional) - For workflow automation

## Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/xfunnel.git
cd xfunnel
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Claude AI Configuration (Required)
ANTHROPIC_API_KEY=your-anthropic-api-key

# Webhook Configuration (Optional - for n8n integration)
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/article-done
N8N_WEBHOOK_AUTH_HEADER=optional-auth-header

# IMPORTANT: Admin Registration Security (Required)
# Set this to a secure password to prevent unauthorized registrations
# Users will need to provide this password when creating new accounts
API_KEY_SECRET=change-this-to-a-secure-password

# Optional: Production URL (for CORS)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: MCP Configuration (for local development)
MCP_CONTEXT7_ENABLED=false
MCP_TASKMASTER_ENABLED=false

# Optional: Rate Limiting (if using Upstash Redis)
UPSTASH_REDIS_REST_URL=your-upstash-redis-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-token
```

### Getting Supabase Credentials

1. Create a new project at [app.supabase.com](https://app.supabase.com)
2. Go to Settings > API
3. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### Getting Anthropic API Key

1. Sign up at [console.anthropic.com](https://console.anthropic.com)
2. Create a new API key
3. Copy it to `ANTHROPIC_API_KEY`

## Database Setup

The application uses Supabase (PostgreSQL) for data storage. Run the database setup script:

```bash
npm run setup:db
```

This will create the following tables:
- `users` - User authentication and profiles
- `articles` - Article content and metadata
- `workers` - Background worker tracking
- `activity_log` - User activity tracking

### Manual Database Setup (if needed)

If the automatic setup fails, you can manually run the migrations:

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run each file in `supabase/migrations/` in order:
   - `000_create_articles_table.sql`
   - `001_create_users_table.sql`
   - `002_update_articles_table.sql`
   - `003_create_workers_table.sql`
   - `004_update_workers_table_activity_tracking.sql`
   - `005_update_articles_shared_access.sql`

## Local Development

1. Start the development server:
```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

3. Register a new account using the admin password set in `API_KEY_SECRET`

### Development Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run setup:db` - Setup database tables
- `npm run setup:db:node` - Alternative database setup using Node.js

## Build and Production

1. Build the application:
```bash
npm run build
```

2. Test the production build locally:
```bash
npm run start
```

## Deployment to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy to Vercel:
```bash
vercel
```

3. Configure environment variables in Vercel dashboard:
   - Go to your project settings
   - Navigate to Environment Variables
   - Add all variables from `.env.local`

4. Configure database access:
   - Ensure your Supabase project allows connections from Vercel IPs
   - Update CORS settings if needed

### Production Considerations

- Set `NODE_ENV=production`
- Use strong passwords for `API_KEY_SECRET`
- Enable rate limiting with Upstash Redis
- Configure proper CORS headers
- Set up monitoring and error tracking

## Features Documentation

### Article Editor
- Rich text editing with Claude AI assistance
- Auto-save functionality
- Version history tracking
- Collaborative editing with conflict resolution

### User Management
- Secure authentication via Supabase Auth
- Role-based access control
- Activity tracking and analytics

### Worker System
- Background task processing
- Real-time status updates
- Performance monitoring

### n8n Integration
- Webhook endpoints for workflow triggers
- Article status updates
- Automated content processing

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify Supabase credentials in `.env.local`
   - Check if tables are created properly
   - Ensure RLS policies are configured

2. **Authentication Issues**
   - Confirm `API_KEY_SECRET` is set correctly
   - Check Supabase Auth settings
   - Verify JWT secret configuration

3. **Claude AI Not Working**
   - Validate `ANTHROPIC_API_KEY`
   - Check API rate limits
   - Monitor error logs for specific issues

4. **Build Failures**
   - Clear `.next` folder and rebuild
   - Check for TypeScript errors
   - Verify all dependencies are installed

5. **"ai_requests_count column not found" Error**
   - Run the migration to add missing columns:
   ```sql
   -- In Supabase SQL Editor, run:
   ALTER TABLE workers ADD COLUMN IF NOT EXISTS ai_requests_count INTEGER DEFAULT 0;
   ALTER TABLE workers ADD COLUMN IF NOT EXISTS manual_edits_count INTEGER DEFAULT 0;
   ALTER TABLE workers ADD COLUMN IF NOT EXISTS focus_count INTEGER DEFAULT 0;
   ALTER TABLE workers ADD COLUMN IF NOT EXISTS blur_count INTEGER DEFAULT 0;
   ALTER TABLE workers ADD COLUMN IF NOT EXISTS read_percentage INTEGER DEFAULT 0;
   ALTER TABLE workers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
   ALTER TABLE workers ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW());
   ```
   - Or run the migration file: `supabase/migrations/006_fix_workers_columns.sql`
   - Restart your Next.js server after fixing

6. **N8N Webhook Not Working**
   - Ensure `N8N_WEBHOOK_URL` is set in `.env.local` (not `.env.example`)
   - Use your actual n8n webhook URL, not the placeholder
   - Format: `N8N_WEBHOOK_URL=https://your-n8n.com/webhook/your-webhook-id`
   - Restart Next.js server after changing environment variables

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=true
```

Check browser console and server logs for detailed information.

### Getting Help

- Check existing issues on GitHub
- Review error logs in Supabase dashboard
- Monitor Next.js server logs
- Use browser DevTools for client-side debugging

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Database by [Supabase](https://supabase.com)
- AI powered by [Claude (Anthropic)](https://anthropic.com)
- UI components from [Radix UI](https://radix-ui.com)
- Styling with [Tailwind CSS](https://tailwindcss.com)