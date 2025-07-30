import { logger } from './logger';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class MemoryRateLimiter {
  private store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  cleanup() {
    const now = Date.now();
    for (const key in this.store) {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    }
  }

  async limit(
    key: string,
    maxRequests: number,
    windowMs: number
  ): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
    const now = Date.now();
    const resetTime = now + windowMs;

    if (!this.store[key] || this.store[key].resetTime < now) {
      this.store[key] = { count: 1, resetTime };
      return {
        success: true,
        limit: maxRequests,
        remaining: maxRequests - 1,
        reset: resetTime,
      };
    }

    if (this.store[key].count >= maxRequests) {
      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        reset: this.store[key].resetTime,
      };
    }

    this.store[key].count++;
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - this.store[key].count,
      reset: this.store[key].resetTime,
    };
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Create singleton instance
const memoryLimiter = new MemoryRateLimiter();

// Rate limiter configurations
export const rateLimiters = {
  // Authentication endpoints - strict limits
  auth: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  // API endpoints - moderate limits
  api: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minute
  },
  // Claude AI endpoints - limited by cost
  claude: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
  },
};

export async function rateLimit(
  identifier: string,
  limiterType: keyof typeof rateLimiters = 'api'
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const config = rateLimiters[limiterType];
  
  // For production, we'll use memory-based rate limiting to avoid external dependencies
  // If you want to use Redis-based rate limiting, install @upstash/ratelimit and @upstash/redis
  return memoryLimiter.limit(
    `${limiterType}:${identifier}`,
    config.maxRequests,
    config.windowMs
  );
}

// Helper function to get client identifier
export function getClientIdentifier(request: Request): string {
  // Try to get real IP from various headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  // Fallback to a default identifier
  return '127.0.0.1';
}