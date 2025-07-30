# Webhook Configuration Guide

## Setting up n8n Webhook Integration

This guide explains how to properly configure the n8n webhook integration for xFunnel.

### 1. Configure Environment Variables

Edit your `.env.local` file and update the following variables:

```bash
# Required: Your n8n webhook URL
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/your-webhook-id

# Optional: Authentication header if your n8n webhook requires it
N8N_WEBHOOK_AUTH_HEADER=Bearer your-auth-token
```

### 2. Getting Your n8n Webhook URL

1. Open your n8n instance
2. Create a new workflow or open an existing one
3. Add a "Webhook" node
4. Configure the webhook node:
   - HTTP Method: POST
   - Path: Choose a custom path or use the generated one
   - Response Mode: "When Last Node Finishes" (recommended)
5. Copy the "Production URL" from the webhook node
6. Paste this URL as the value for `N8N_WEBHOOK_URL` in your `.env.local` file

### 3. Webhook Payload Structure

When an article is sent to n8n, the following payload is sent:

```json
{
  "article_id": "unique-article-id",
  "status": "final",
  "title": "Article Title",
  "content": "Article content...",
  "timestamp": "2024-01-09T12:00:00.000Z",
  "source": "xfunnel"
}
```

### 4. Testing the Webhook

1. Start your xFunnel application
2. Create or edit an article
3. Click the "Send" button
4. Check the browser console for logs
5. Check your n8n workflow execution history

### 5. Troubleshooting

#### Common Issues:

1. **"Webhook URL not configured" error**
   - Ensure `N8N_WEBHOOK_URL` is set in `.env.local`
   - Restart your Next.js development server after changing environment variables

2. **"Webhook URL not properly configured" error**
   - You're still using the placeholder URL
   - Update `N8N_WEBHOOK_URL` with your actual n8n webhook URL

3. **"Failed to send webhook" error**
   - Check if your n8n instance is running
   - Verify the webhook URL is correct
   - Check if authentication is required

4. **CORS errors**
   - The webhook route includes CORS headers
   - If issues persist, check your n8n webhook node configuration

### 6. Security Considerations

- Never commit your `.env.local` file to version control
- The webhook URL is masked in console logs for security
- Use authentication headers if your n8n webhook is publicly accessible
- Consider using HTTPS for production deployments

### 7. Example n8n Workflow

Here's a simple n8n workflow to receive and process xFunnel articles:

1. **Webhook Node** - Receives the article data
2. **Set Node** - Extract and format article data
3. **HTTP Request Node** - Send to external service (optional)
4. **Respond to Webhook Node** - Send success response back to xFunnel

For more complex workflows, you can add nodes for:
- Sending emails
- Saving to databases
- Integrating with other services
- Conditional logic based on article content