import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, generateToken } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { withLogging } from '@/lib/logger';
import { ValidationError, AuthenticationError, formatErrorResponse } from '@/lib/error-handler';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limiter';

export const POST = withLogging(async (request: NextRequest) => {
  const startTime = Date.now();
  
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const { success, remaining, reset } = await rateLimit(clientId, 'auth');
    
    if (!success) {
      return NextResponse.json(
        { 
          error: 'Too many login attempts. Please try again later.',
          retryAfter: Math.ceil((reset - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(reset).toISOString()
          }
        }
      );
    }
    
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      throw new ValidationError('Invalid JSON in request body');
    }

    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    // Allow demo user without @ validation
    if (email !== 'user' && !email.includes('@')) {
      throw new ValidationError('Invalid email format');
    }

    // Log authentication attempt (without password)
    logger.info('Login attempt', { 
      email, 
      userAgent: request.headers.get('user-agent') || undefined 
    });

    // Authenticate user
    const user = await authenticateUser(email, password);

    if (!user) {
      logger.warn('Failed login attempt', { email });
      throw new AuthenticationError('Invalid email or password');
    }

    // Generate token
    const token = generateToken(user);

    // Log successful login
    logger.info('Successful login', {
      userId: user.id,
      email: user.email,
      duration: Date.now() - startTime
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    const errorResponse = formatErrorResponse(error as Error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode }
    );
  }
});