import { NextResponse } from 'next/server';
import { logger } from './logger';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function createApiError(
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any
): ApiError {
  return new ApiError(message, statusCode, code, details);
}

export function handleApiError(error: unknown): NextResponse {
  // Log the error
  logger.error('API Error', error);

  // Handle known API errors
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: process.env.NODE_ENV === 'development' ? error.details : undefined,
      },
      { status: error.statusCode }
    );
  }

  // Handle JWT errors
  if (error instanceof Error && error.name === 'JsonWebTokenError') {
    return NextResponse.json(
      { error: 'Invalid authentication token' },
      { status: 401 }
    );
  }

  if (error instanceof Error && error.name === 'TokenExpiredError') {
    return NextResponse.json(
      { error: 'Authentication token expired' },
      { status: 401 }
    );
  }

  // Handle database errors
  if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
    return NextResponse.json(
      { error: 'Database connection failed. Please try again later.' },
      { status: 503 }
    );
  }

  // Handle validation errors
  if (error instanceof Error && error.name === 'ValidationError') {
    return NextResponse.json(
      { 
        error: 'Validation failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 400 }
    );
  }

  // Default error response
  const isDevelopment = process.env.NODE_ENV === 'development';
  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
  
  return NextResponse.json(
    {
      error: isDevelopment ? errorMessage : 'Internal server error',
      stack: isDevelopment && error instanceof Error ? error.stack : undefined,
    },
    { status: 500 }
  );
}

// Wrapper for API route handlers
export function withErrorHandler<T extends (...args: any[]) => Promise<Response>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  }) as T;
}