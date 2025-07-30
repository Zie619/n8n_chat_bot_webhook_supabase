# 🚀 xFunnel Production Setup Guide

This guide is for **non-programmers** who want to deploy xFunnel to production. Follow these steps carefully.

## 📋 What You'll Need

1. **Accounts** (all free to start):
   - GitHub account - [Sign up](https://github.com/signup)
   - Vercel account - [Sign up](https://vercel.com/signup)
   - Supabase account - [Sign up](https://supabase.com)
   - Anthropic account (paid) - [Sign up](https://console.anthropic.com)

2. **Information to Gather**:
   - A secure admin password (you'll create this)
   - Your email address

## 🗄️ Step 1: Set Up Your Database (Supabase)

1. **Create a Supabase Project**:
   - Go to [supabase.com](https://supabase.com) and sign in
   - Click **"New Project"**
   - Name it: `xfunnel` (or your preferred name)
   - **IMPORTANT**: Generate a strong database password and **save it somewhere safe**
   - Select the region closest to you
   - Click **"Create new project"** and wait ~2 minutes

2. **Set Up the Database**:
   - Once your project is ready, click **"SQL Editor"** in the left menu
   - Click **"New Query"**
   - Copy ALL the content from the file `supabase/production-setup-no-rls.sql`
   - Paste it into the SQL editor
   - Click **"Run"** (the play button)
   - You should see "Success. No rows returned"

3. **Get Your Database Keys**:
   - Click **"Settings"** (gear icon) in the left menu
   - Click **"API"**
   - You'll see three important values. Copy and save these:
     - **Project URL**: `https://xxxxx.supabase.co`
     - **anon public**: `eyJhbGc...` (a long string)
     - **service_role**: Click "Reveal" first, then copy `eyJhbGc...` (another long string)

## 🤖 Step 2: Get Your AI Key (Anthropic)

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign in or create an account
3. Click **"API Keys"** in the left menu
4. Click **"Create Key"**
5. Name it: `xfunnel`
6. Copy the key (starts with `sk-ant-api03-...`)
7. **SAVE THIS KEY** - you can't see it again!

## 🚀 Step 3: Deploy to Vercel

1. **Fork the Code**:
   - Go to the xFunnel repository on GitHub
   - Click the **"Fork"** button in the top right
   - This creates your own copy

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com) and sign in
   - Click **"Add New..."** → **"Project"**
   - Select **"Import Git Repository"**
   - Find and select your forked `xfunnel` repository
   - Click **"Import"**

3. **Configure Environment Variables** (VERY IMPORTANT):
   - You'll see a section called **"Environment Variables"**
   - Add each of these one by one:

   | Name | Value | Notes |
   |------|-------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | From Step 1.3 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key | From Step 1.3 |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | From Step 1.3 |
   | `JWT_SECRET` | Click [here](https://generate-secret.vercel.app/32) to generate | Must be 32+ characters |
   | `ANTHROPIC_API_KEY` | Your Claude API key | From Step 2 |
   | `API_KEY_SECRET` | Create a secure password | You'll need this to create accounts |
   | `NEXT_PUBLIC_APP_URL` | Leave as: `https://your-app.vercel.app` | Update after deployment |

4. **Deploy**:
   - After adding all variables, click **"Deploy"**
   - Wait 3-5 minutes for deployment
   - Once done, you'll see a success message

5. **Update Your App URL**:
   - Click **"Visit"** to see your deployed app
   - Copy the URL (like `https://xfunnel-abc123.vercel.app`)
   - Go back to your Vercel project settings
   - Find **"Environment Variables"**
   - Edit `NEXT_PUBLIC_APP_URL` and replace with your actual URL
   - Click **"Save"**
   - Go to **"Deployments"** and click **"Redeploy"** on the latest deployment

## ✅ Step 4: Test Your App

1. **Visit Your App**:
   - Go to your app URL
   - You should see the xFunnel login page

2. **Create Your First Account**:
   - Click **"Sign Up"**
   - Enter your email and a password
   - **Admin Password**: Enter the password you set in `API_KEY_SECRET`
   - Click **"Sign Up"**

3. **Test Features**:
   - Create a new article
   - Type some content
   - Click the AI assistant button
   - Ask it to help improve your content

## 🔧 Troubleshooting

### "Application error" Message
- Go to Vercel dashboard
- Click **"Functions"** tab
- Look for error messages
- Double-check all environment variables are set correctly

### Can't Create Account
- Make sure you're using the exact admin password from `API_KEY_SECRET`
- Check that it's not still set to default value

### AI Not Working
- Verify your `ANTHROPIC_API_KEY` is correct
- Check that your Anthropic account has credits
- Look in Vercel Functions logs for errors

### Database Errors
- Go back to Supabase SQL Editor
- Run: `SELECT * FROM users;`
- If you get an error, re-run the setup SQL file

## 📧 Getting Help

If you're stuck:
1. Check the Vercel Functions logs for errors
2. Verify all environment variables are set
3. Make sure your Anthropic account has API credits
4. Contact support with:
   - Screenshot of the error
   - What you were trying to do
   - Your app URL (not your passwords!)

## 🎉 Success!

Your xFunnel app is now live! You can:
- Share the URL with team members
- They can sign up using the admin password
- Start creating and editing articles with AI assistance

## 🔐 Important Security Notes

- **Never share** your `API_KEY_SECRET` publicly
- **Never commit** API keys to GitHub
- **Keep** your Supabase service role key secret
- **Monitor** your Anthropic API usage to control costs
- **Change** the admin password if it gets compromised

---

**Congratulations!** You've successfully deployed xFunnel to production! 🎊