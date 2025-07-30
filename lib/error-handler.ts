import { logger } from './logger';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, true, 'VALIDATION_ERROR');
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, true, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, true, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, true, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, true, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, true, 'RATE_LIMIT_EXCEEDED');
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, originalError?: any) {
    super(`External service error: ${service}`, 503, true, 'EXTERNAL_SERVICE_ERROR');
    if (originalError) {
      logger.error(`External service error details for ${service}`, originalError);
    }
  }
}

// Error response formatter
export function formatErrorResponse(error: Error | AppError): {
  error: string;
  message: string;
  code?: string;
  statusCode: number;
  details?: any;
} {
  if (error instanceof AppError) {
    return {
      error: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') ? {
        stack: error.stack
      } : undefined
    };
  }

  // For non-operational errors, log them and return a generic message
  logger.error('Unexpected error', error);
  
  return {
    error: 'InternalServerError',
    message: (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') 
      ? error.message 
      : 'An unexpected error occurred',
    statusCode: 500,
    details: (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') ? {
      stack: error.stack
    } : undefined
  };
}

// Async error wrapper for API routes
export function asyncHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof AppError) {
        logger.warn(`Operational error: ${error.message}`, {
          code: error.code,
          statusCode: error.statusCode
        });
      } else {
        logger.error('Unhandled error in async handler', error);
      }
      throw error;
    }
  }) as T;
}

// Global error handler for unhandled errors
export function setupGlobalErrorHandlers() {
  if (typeof window === 'undefined') {
    // Server-side error handlers
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      logger.error('Unhandled Promise Rejection', reason, {
        promise: promise.toString()
      });
    });

    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception', error);
      // Give the logger time to write
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    });
  } else {
    // Client-side error handlers
    window.addEventListener('unhandledrejection', (event) => {
      logger.error('Unhandled promise rejection', event.reason);
    });

    window.addEventListener('error', (event) => {
      logger.error('Global error', event.error || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });
  }
}