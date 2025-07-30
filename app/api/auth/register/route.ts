import { NextRequest, NextResponse } from 'next/server';
import { createUser, generateToken } from '@/lib/auth';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const { success, remaining, reset } = await rateLimit(clientId, 'auth');
    
    if (!success) {
      return NextResponse.json(
        { 
          error: 'Too many registration attempts. Please try again later.',
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
    
    const { email, password, adminPassword } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check admin password requirement
    const requiredAdminPassword = process.env.API_KEY_SECRET;
    if (requiredAdminPassword) {
      if (!adminPassword) {
        return NextResponse.json(
          { error: 'Admin password is required for registration' },
          { status: 403 }
        );
      }
      
      if (adminPassword !== requiredAdminPassword) {
        return NextResponse.json(
          { error: 'Invalid admin password' },
          { status: 403 }
        );
      }
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Basic password validation (at least 6 characters)
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const user = await createUser(email, password);

    if (!user) {
      // Check if this is a configuration issue
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey || supabaseUrl === 'your-supabase-project-url/') {
        return NextResponse.json(
          { 
            error: 'Database not configured. Please check your Supabase settings in .env.local',
            details: 'See DATABASE_SETUP.md for instructions'
          },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    const token = generateToken(user);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}