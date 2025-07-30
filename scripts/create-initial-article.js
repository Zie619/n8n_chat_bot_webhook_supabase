#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createInitialArticle() {
  console.log('Creating initial article for user...\n');

  const userId = '97acdf37-8f1f-4a23-a414-30ccf1c79c05'; // xeliadx@gmail.com's user ID

  try {
    // Create a welcome article
    const { data: article, error } = await supabase
      .from('articles')
      .insert({
        user_id: userId,
        title: 'Welcome to XFunnel Article Editor',
        content: `# Welcome to XFunnel!

This is your AI-powered article editor. Here's what you can do:

## Features

- **Create Articles**: Click the "New Article" button to start writing
- **AI Assistant**: Use Claude AI to help improve your content
- **Auto-save**: Your work is automatically saved as you type
- **Send to n8n**: When ready, send your articles to your n8n workflow

## Getting Started

1. Edit this article or create a new one
2. Use the AI assistant to enhance your content
3. Save your work (happens automatically)
4. Send to n8n when complete

Happy writing!`,
        status: 'draft',
        word_count: 80,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating article:', error);
      return;
    }

    console.log('✅ Created welcome article');
    console.log('   ID:', article.id);
    console.log('   Title:', article.title);
    console.log('\nThe user will see this article when they log in.');

  } catch (error) {
    console.error('Failed to create article:', error);
  }
}

createInitialArticle();