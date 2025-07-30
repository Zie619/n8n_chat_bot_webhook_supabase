# 📚 xFunnel Deployment Guide for Non-Programmers

This guide will walk you through deploying xFunnel to production using Vercel, Supabase, and optionally Cloudflare Tunnel.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Setting up Supabase (Database)](#setting-up-supabase)
3. [Getting API Keys](#getting-api-keys)
4. [Deploying to Vercel](#deploying-to-vercel)
5. [Setting up Cloudflare Tunnel (Optional)](#cloudflare-tunnel)
6. [Testing Your Deployment](#testing)
7. [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites {#prerequisites}

Before starting, you'll need:

1. **GitHub Account** - [Sign up free](https://github.com/signup)
2. **Vercel Account** - [Sign up free](https://vercel.com/signup)
3. **Supabase Account** - [Sign up free](https://supabase.com/dashboard)
4. **Anthropic Claude API Key** - [Get API key](https://console.anthropic.com/)
5. **Credit Card** - For API services (Claude AI costs money per use)

## 🗄️ Setting up Supabase (Database) {#setting-up-supabase}

### Step 1: Create a New Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in:
   - **Project Name**: `xfunnel` (or your preferred name)
   - **Database Password**: Generate a strong password and SAVE IT
   - **Region**: Choose the closest to your location
4. Click **"Create new project"** and wait ~2 minutes

### Step 2: Set Up the Database

1. In your Supabase project, click **"SQL Editor"** in the left sidebar
2. Click **"New Query"**
3. Copy ALL the content from the file `supabase/production-setup-no-rls.sql`
4. Paste it into the SQL editor
5. Click **"Run"** (play button)
6. You should see "Success. No rows returned"

### Step 3: Get Your Supabase Keys

1. Click **"Settings"** (gear icon) in the left sidebar
2. Click **"API"**
3. Copy these values (you'll need them later):
   - **Project URL**: Looks like `https://xxxxx.supabase.co`
   - **anon public**: Under "Project API keys"
   - **service_role secret**: Click "Reveal" first, then copy

⚠️ **IMPORTANT**: Keep the service_role key SECRET! Never share it publicly.

## 🔑 Getting API Keys {#getting-api-keys}

### Claude AI API Key

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Go to **"API Keys"**
4. Click **"Create Key"**
5. Name it `xfunnel`
6. Copy the key (starts with `sk-ant-api03-`)
7. SAVE IT - you can't see it again!

### Create Your Admin Password

Think of a secure password for admin registration. This will be required when creating new user accounts. Save this password securely.

## 🚀 Deploying to Vercel {#deploying-to-vercel}

### Step 1: Fork the Repository

1. Go to the xFunnel repository on GitHub
2. Click **"Fork"** button (top right)
3. This creates your own copy of the code

### Step 2: Connect to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Click **"Import Git Repository"**
4. Find your forked `xfunnel` repository
5. Click **"Import"**

### Step 3: Configure Environment Variables

This is the most important step! Click **"Environment Variables"** and add each of these:

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | From Supabase Settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key | From Supabase Settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | From Supabase Settings |
| `JWT_SECRET` | Generate a 32+ character random string | Use [this generator](https://generate-secret.vercel.app/32) |
| `ANTHROPIC_API_KEY` | Your Claude API key | From Anthropic Console |
| `API_KEY_SECRET` | Your admin password | The password you created |
| `NEXT_PUBLIC_APP_URL` | `https://your-app-name.vercel.app` | Update after deployment |

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait 2-5 minutes for deployment
3. Once complete, click **"Visit"** to see your app!

### Step 5: Update App URL

1. Copy your app URL (like `https://xfunnel-abc123.vercel.app`)
2. Go back to Vercel project settings
3. Update `NEXT_PUBLIC_APP_URL` with your actual URL
4. Click **"Redeploy"** for changes to take effect

## 🌐 Setting up Cloudflare Tunnel (Optional) {#cloudflare-tunnel}

This allows you to use a custom domain and adds extra security.

### Prerequisites
- A domain name you own
- Cloudflare account (free)

### Step 1: Add Your Domain to Cloudflare

1. Sign up at [Cloudflare](https://cloudflare.com)
2. Click **"Add a Site"**
3. Enter your domain name
4. Follow instructions to update your domain's nameservers

### Step 2: Create a Tunnel

1. In Cloudflare, go to **"Zero Trust"** → **"Access"** → **"Tunnels"**
2. Click **"Create a tunnel"**
3. Name it `xfunnel`
4. Install and run the connector (follow Cloudflare's instructions)

### Step 3: Configure the Tunnel

1. In tunnel configuration, add a public hostname:
   - **Subdomain**: `app` (or your choice)
   - **Domain**: Select your domain
   - **Service**: `https://your-app.vercel.app`
2. Save the tunnel

### Step 4: Update Vercel

1. In Vercel project settings, go to **"Domains"**
2. Add your custom domain
3. Follow Vercel's instructions to configure DNS

## ✅ Testing Your Deployment {#testing}

### 1. Test Registration

1. Go to your app URL
2. Click **"Sign Up"**
3. Enter:
   - Email: your email
   - Password: choose a password
   - Admin Password: the one you set in `API_KEY_SECRET`
4. You should be able to register and log in

### 2. Test Article Creation

1. After logging in, click **"New Article"**
2. Enter a title and some content
3. Click **"Save"**
4. The article should appear in your list

### 3. Test AI Assistant

1. Open an article
2. Click **"AI Editor"**
3. Type: "Help me improve this article"
4. You should get AI suggestions

## 🔧 Troubleshooting {#troubleshooting}

### "Application error" on Vercel

1. Check Vercel's **"Functions"** tab for errors
2. Verify all environment variables are set correctly
3. Click **"Redeploy"**

### "Failed to fetch" errors

1. Check that all Supabase keys are correct
2. Ensure `NEXT_PUBLIC_APP_URL` matches your actual URL
3. Check if your database setup completed successfully

### Can't register new users

1. Verify `API_KEY_SECRET` is set in Vercel
2. Make sure you're using the exact same password
3. Check it's not the default `your-admin-password-here`

### AI not working

1. Verify `ANTHROPIC_API_KEY` is correct
2. Check your Anthropic account has credits
3. Look for errors in Vercel Functions logs

### Database errors

1. Go to Supabase SQL Editor
2. Run: `SELECT * FROM users;`
3. If error, re-run the setup SQL file
4. Contact support if issues persist

## 📞 Getting Help

1. **Vercel Support**: [vercel.com/support](https://vercel.com/support)
2. **Supabase Support**: [supabase.com/support](https://supabase.com/support)
3. **GitHub Issues**: Report bugs in the repository

## 🎉 Congratulations!

You've successfully deployed xFunnel! Your app is now:
- ✅ Live on the internet
- ✅ Secured with proper authentication
- ✅ Connected to a real database
- ✅ Ready for users

### Next Steps

1. Share your app URL with users
2. Monitor usage in Vercel dashboard
3. Check Supabase for database growth
4. Watch Claude API usage for costs

### Maintenance Tips

- **Weekly**: Check Vercel and Supabase dashboards
- **Monthly**: Review API costs and usage
- **Always**: Keep your admin password secure
- **Never**: Share your API keys or service role key

---

Remember: If something doesn't work, double-check your environment variables first - they're the most common source of issues!