import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';
import { AuthenticationError, ExternalServiceError } from './error-handler';

// Only create Supabase client if environment variables are set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  logger.error('JWT_SECRET environment variable is not set');
  throw new Error('JWT_SECRET must be set for authentication to work');
}

// Log initialization status
if (!supabase) {
  logger.warn('Supabase client not initialized - missing environment variables');
}

export interface User {
  id: string;
  email: string;
  created_at?: string;
  last_login?: string;
}

export interface AuthToken {
  userId: string;
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(user: User): string {
  const payload: AuthToken = {
    userId: user.id,
    email: user.email,
  };
  
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthToken | null {
  try {
    logger.debug('Verifying token', { 
      tokenPreview: token.substring(0, 20) + '...' 
    });
    
    const decoded = jwt.verify(token, JWT_SECRET!) as AuthToken;
    
    logger.debug('Token verified successfully', { 
      userId: decoded.userId, 
      email: decoded.email 
    });
    
    return decoded;
  } catch (error) {
    logger.warn('Token verification failed', error as Error);
    return null;
  }
}

export async function createUser(email: string, password: string): Promise<User | null> {
  try {
    if (!supabase) {
      logger.warn('Supabase client not initialized. Using mock user creation.');
      // For mock development, store users in memory
      const mockUsers = global.mockUsers || [];
      if (mockUsers.find((u: any) => u.email === email)) {
        return null; // User already exists
      }
      const newUser = {
        id: 'mock-' + Date.now(),
        email,
        created_at: new Date().toISOString(),
      };
      global.mockUsers = [...mockUsers, newUser];
      return newUser;
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    
    if (existingUser) {
      logger.debug('User already exists', { email: email.split('@')[0] + '@...' });
      return null;
    }

    const hashedPassword = await hashPassword(password);
    
    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        password: hashedPassword,
        name: email.split('@')[0], // Use email prefix as default name
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      logger.error('Supabase insert error', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    logger.error('Error creating user', error as Error);
    return null;
  }
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  try {
    if (!supabase) {
      logger.warn('Supabase client not initialized. Using mock authentication.');
      // Return a mock user for development
      // In a real app, you'd check against stored mock data
      if (email === 'test@example.com' && password === 'password') {
        return {
          id: 'mock-user-1',
          email,
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
        };
      }
      return null;
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !user) return null;
    
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) return null;
    
    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);
    
    // Don't return password
    const { password: _, ...safeUser } = user;
    return safeUser;
  } catch (error) {
    logger.error('Error authenticating user', error as Error);
    return null;
  }
}

export async function getUserById(userId: string): Promise<User | null> {
  try {
    if (!supabase) {
      logger.warn('Supabase client not initialized. Using mock data.');
      // Return mock user data
      if (userId === 'mock-user-1') {
        return {
          id: userId,
          email: 'test@example.com',
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
        };
      }
      return null;
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, email, created_at, last_login')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    logger.error('Error getting user by ID', error as Error);
    return null;
  }
}