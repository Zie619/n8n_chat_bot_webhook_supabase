import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

interface WebhookPayload {
  article_id: string;
  status: 'final';
  [key: string]: any; // Allow additional fields
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: WebhookPayload = await request.json();
    
    // Validate required fields
    if (!body.article_id || !body.status) {
      return NextResponse.json(
        { error: 'Invalid request: article_id and status are required' },
        { status: 400 }
      );
    }

    // Get n8n webhook URL from environment
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    
    if (!n8nWebhookUrl) {
      logger.error('N8N_WEBHOOK_URL is not configured');
      return NextResponse.json(
        { 
          error: 'Webhook URL not configured',
          details: 'Please set N8N_WEBHOOK_URL in your .env.local file',
          hint: 'Example: N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/your-webhook-id'
        },
        { status: 500 }
      );
    }
    
    // Check if webhook URL is still the placeholder
    if (n8nWebhookUrl.includes('your-n8n-instance.com')) {
      logger.error('N8N_WEBHOOK_URL is still using the placeholder value');
      return NextResponse.json(
        { 
          error: 'Webhook URL not properly configured',
          details: 'N8N_WEBHOOK_URL is still set to the placeholder value',
          hint: 'Please update N8N_WEBHOOK_URL in your .env.local file with your actual n8n webhook URL'
        },
        { status: 500 }
      );
    }
    
    // Log the webhook call (with masked URL)
    const maskedUrl = n8nWebhookUrl.replace(/\/webhook\/.*$/, '/webhook/***');
    logger.info('Webhook API called', { 
      articleId: body.article_id,
      webhookUrl: maskedUrl 
    });

    // Prepare webhook payload with enhanced data
    const { article_id, status, ...additionalFields } = body;
    const webhookPayload = {
      article_id,
      status,
      timestamp: new Date().toISOString(),
      source: 'xfunnel',
      environment: process.env.NODE_ENV || 'development',
      ...additionalFields, // Include any additional fields
    };

    // Send webhook to n8n with timeout and retry logic
    let response;
    let lastError;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Webhook attempt ${attempt}/${maxRetries}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        response = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'xFunnel/1.0',
            // Add any authentication headers if required by n8n
            ...(process.env.N8N_WEBHOOK_AUTH_HEADER && {
              'Authorization': process.env.N8N_WEBHOOK_AUTH_HEADER,
            }),
          },
          body: JSON.stringify(webhookPayload),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          logger.info('Webhook sent successfully', { attempt });
          break;
        } else {
          lastError = `HTTP ${response.status}: ${response.statusText}`;
          logger.warn(`Webhook failed on attempt ${attempt}`, { error: lastError });
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Webhook error on attempt ${attempt}`, error as Error);
        
        if (error instanceof Error && error.name === 'AbortError') {
          lastError = 'Request timeout after 30 seconds';
        }
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    if (!response || !response.ok) {
      const errorDetails: any = {
        error: 'Failed to send webhook after retries',
        lastError,
        webhookUrl: maskedUrl,
        attempts: maxRetries,
        troubleshooting: [
          'Check if the webhook URL is correct and accessible',
          'Verify n8n is running and the webhook is active',
          'Check for any firewall or network issues',
          'Ensure the webhook URL supports HTTPS if using HTTPS',
        ],
      };
      
      if (response) {
        const errorText = await response.text().catch(() => 'No error details');
        errorDetails.httpStatus = response.status;
        errorDetails.httpError = errorText;
        
        // Log the actual URL for debugging (only in development)
        if (process.env.NODE_ENV === 'development') {
          console.error('Webhook failed to URL:', n8nWebhookUrl);
          console.error('Response status:', response.status);
          console.error('Response text:', errorText);
        }
      }
      
      logger.error('Webhook failed', undefined, errorDetails);
      return NextResponse.json(errorDetails, { status: 502 });
    }

    // Parse n8n response if available
    let n8nResponse;
    try {
      n8nResponse = await response.json();
    } catch {
      n8nResponse = { message: 'Webhook sent successfully' };
    }

    // Return successful response with CORS headers
    return NextResponse.json(
      {
        success: true,
        message: 'Webhook sent successfully',
        webhook_url: maskedUrl, // Use masked URL for security
        webhook_response: n8nResponse,
        payload_sent: webhookPayload,
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
            ? process.env.NEXT_PUBLIC_APP_URL || '*' 
            : '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );
  } catch (error) {
    logger.error('Unexpected error in webhook route', error as Error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
        ? process.env.NEXT_PUBLIC_APP_URL || '*' 
        : '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}