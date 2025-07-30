/**
 * Production-ready logger with proper error handling and environment-aware logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  error?: any;
  stack?: string;
  [key: string]: any;
}

class Logger {
  private isDevelopment = typeof process !== 'undefined' ? process.env.NODE_ENV === 'development' : false;
  private isDebugMode = typeof window !== 'undefined' && localStorage.getItem('xfunnel_debug') === 'true';
  private logLevel: LogLevel = (typeof process !== 'undefined' ? process.env.LOG_LEVEL as LogLevel : null) || (this.isDevelopment ? 'info' : 'warn');
  
  private logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  private shouldLog(level: LogLevel): boolean {
    // Always log in debug mode
    if (this.isDebugMode) return true;
    return this.logLevels[level] >= this.logLevels[this.logLevel];
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context
    };

    // In production, use JSON format for better parsing by log aggregators
    if (!this.isDevelopment) {
      return JSON.stringify(logEntry);
    }

    // In development, use a more readable format
    const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, context);

    switch (level) {
      case 'debug':
        console.debug(formattedMessage);
        break;
      case 'info':
        console.log(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'error':
        console.error(formattedMessage);
        // In production, you might want to send errors to an external service
        if (!this.isDevelopment && context?.error) {
          this.sendToErrorTracking(message, context);
        }
        break;
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    // Skip initialization logs unless in debug mode
    if (!this.isDebugMode && (message.includes('Initializing xFunnel') || message.includes('Application initialized'))) {
      return;
    }
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error | any, context?: LogContext) {
    const errorContext: LogContext = {
      ...this.sanitize(context),
      error: error?.message || error,
      stack: this.isDevelopment ? error?.stack : '[STACK_REDACTED]'
    };
    this.log('error', message, errorContext);
  }

  // Log API requests
  logRequest(req: Request, res: Response, duration: number) {
    const context: LogContext = {
      method: req.method,
      path: new URL(req.url).pathname,
      statusCode: res.status,
      duration,
      userAgent: req.headers.get('user-agent') || undefined
    };

    const level: LogLevel = res.status >= 500 ? 'error' : 
                           res.status >= 400 ? 'warn' : 'info';
    
    this.log(level, `${req.method} ${new URL(req.url).pathname} ${res.status}`, context);
  }

  // Helper method to sanitize sensitive data
  sanitize(data: any): any {
    if (!data) return data;
    
    const sensitive = [
      'password', 'token', 'api_key', 'apikey', 'secret', 
      'authorization', 'auth', 'bearer', 'credential',
      'access_token', 'refresh_token', 'jwt',
      'ANTHROPIC_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
      'JWT_SECRET', 'API_KEY_SECRET', 'key'
    ];
    
    if (typeof data === 'string') {
      // Redact API keys and tokens in strings
      return data
        .replace(/sk-[a-zA-Z0-9-_]{40,}/g, 'sk-[REDACTED]')
        .replace(/Bearer\s+[a-zA-Z0-9-_\.]+/gi, 'Bearer [REDACTED]')
        .replace(/eyJ[a-zA-Z0-9-_\.]+/g, '[JWT_REDACTED]');
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitize(item));
    }
    
    if (typeof data === 'object') {
      const sanitized = { ...data };
      for (const key of Object.keys(sanitized)) {
        const lowerKey = key.toLowerCase();
        if (sensitive.some(s => lowerKey.includes(s.toLowerCase()))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof sanitized[key] === 'object') {
          sanitized[key] = this.sanitize(sanitized[key]);
        } else if (typeof sanitized[key] === 'string') {
          sanitized[key] = this.sanitize(sanitized[key]);
        }
      }
      return sanitized;
    }
    
    return data;
  }

  // Placeholder for sending errors to external tracking service
  private async sendToErrorTracking(message: string, context: LogContext) {
    // In a real production app, you'd send to Sentry, LogRocket, etc.
    // Example:
    // await sentry.captureException(new Error(message), { extra: context });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export middleware for API routes
export function withLogging<T extends (...args: any[]) => Promise<Response>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = Date.now();
    const [req] = args as unknown as [Request];
    
    try {
      const response = await handler(...args);
      const duration = Date.now() - startTime;
      
      logger.logRequest(req, response, duration);
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Unhandled error in API route', error, {
        method: req.method,
        path: new URL(req.url).pathname,
        duration
      });
      
      // Return a generic error response
      return new Response(
        JSON.stringify({ 
          error: 'Internal Server Error',
          message: process.env.NODE_ENV === 'development'
            ? (error as Error).message 
            : 'An unexpected error occurred'
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }) as T;
}