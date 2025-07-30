# xFunnel Webhook Setup Guide

## Overview

xFunnel integrates with n8n through webhooks to send finalized articles for further processing. This guide explains how to configure and troubleshoot the webhook integration.

## Configuration

### 1. Environment Variables

Add the following to your `.env.local` file:

```env
# Required: Your n8n webhook URL
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/your-webhook-id

# Optional: Authentication header if your webhook requires it
N8N_WEBHOOK_AUTH_HEADER=your-auth-token
```

**Important**: 
- Replace the webhook URL with your actual n8n webhook endpoint
- The URL should be the full webhook URL from n8n, including the webhook ID
- Ensure the URL uses HTTPS in production environments

### 2. n8n Webhook Configuration

In your n8n workflow:

1. Add a **Webhook** node
2. Set the HTTP Method to **POST**
3. Set the Path to a unique identifier (this will be part of your webhook URL)
4. Copy the Production URL or Test URL from the webhook node
5. Paste this URL into your `.env.local` file as `N8N_WEBHOOK_URL`

## Webhook Payload

When an article is sent to n8n, xFunnel sends the following payload:

```json
{
  "article_id": "unique-article-id",
  "status": "final",
  "title": "Article Title",
  "content": "Full article content...",
  "timestamp": "2024-01-10T15:30:00.000Z",
  "environment": "development",
  "user_email": "user@example.com",
  "word_count": 1234,
  "source": "xfunnel"
}
```

## Testing the Webhook

### Method 1: In-App Test Button

1. Open any article in the xFunnel editor
2. Click the **🧪 Test** button next to "Send to n8n"
3. Check the toast notification for the test result
4. Open the browser console for detailed diagnostic information

### Method 2: API Test Endpoint

Visit `http://localhost:3000/api/webhook-test` in your browser to see:
- Webhook configuration status
- Connectivity test results
- Troubleshooting recommendations

### Method 3: Command Line Test

Run the included test script:

```bash
node test-webhook.js
```

This will test both:
- Direct connection to your n8n webhook
- Connection through the xFunnel API

### Method 4: Environment Check

Visit `http://localhost:3000/api/env-check` to verify:
- Environment variables are loaded
- `.env.local` file exists
- Webhook URL is configured

## Troubleshooting

### Common Issues

1. **"Webhook URL not configured" error**
   - Ensure `.env.local` file exists in the project root
   - Check that `N8N_WEBHOOK_URL` is set correctly
   - Restart the Next.js development server after adding environment variables

2. **"Cannot reach the webhook URL" error**
   - Verify n8n is running and accessible
   - Check the webhook URL is correct
   - Ensure no firewall is blocking the connection
   - Test the webhook URL directly using curl or the test script

3. **"Webhook returned HTTP 404" error**
   - The webhook path in n8n doesn't match the URL
   - The n8n workflow might be inactive
   - Check if you're using the production or test URL correctly

4. **Timeout errors**
   - n8n might be taking too long to respond
   - Network latency issues
   - Check n8n server performance

### Debug Mode

The webhook API includes extensive logging. Check the console output when:
- Sending an article to n8n
- Running the webhook test
- Experiencing any issues

### Retry Logic

The webhook implementation includes:
- Automatic retry (up to 3 attempts)
- Exponential backoff between retries
- 30-second timeout per request
- Detailed error reporting

## Security Considerations

1. **Use HTTPS**: Always use HTTPS URLs in production
2. **Authentication**: Add authentication headers if your n8n webhook requires them
3. **Environment Variables**: Never commit `.env.local` to version control
4. **Rate Limiting**: Consider implementing rate limiting for production use

## Example n8n Workflow

Here's a simple n8n workflow to receive xFunnel articles:

1. **Webhook Node**: Receives the article data
2. **Set Node**: Extract and format the article fields
3. **HTTP Request Node**: Send to your CMS or database
4. **Respond to Webhook Node**: Return success response

## API Reference

### POST /api/webhook

Sends an article to the configured n8n webhook.

**Request Body:**
```json
{
  "article_id": "string",
  "status": "final",
  "title": "string",
  "content": "string",
  "timestamp": "string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook sent successfully",
  "webhook_url": "https://n8n.example.com/webhook/***",
  "webhook_response": {},
  "payload_sent": {}
}
```

### GET /api/webhook-test

Tests the webhook configuration and connectivity.

**Response:**
```json
{
  "status": "Webhook Test Results",
  "checks": {
    "webhookUrlExists": true,
    "webhookUrlValid": true,
    "environment": "development"
  },
  "connectivity": {
    "reachable": true,
    "statusCode": 200,
    "success": true,
    "responseTime": "150ms"
  },
  "recommendations": ["✅ Webhook configuration appears to be working correctly!"]
}
```

## Support

If you continue to experience issues:
1. Check the browser console for detailed error messages
2. Review the server logs for webhook-related errors
3. Test the webhook URL directly using curl or Postman
4. Ensure your n8n workflow is active and properly configured