import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { validateEnvironment } from '@/lib/env-validation';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    database: {
      status: 'ok' | 'error';
      message?: string;
      responseTime?: number;
    };
    environment: {
      status: 'ok' | 'error';
      errors?: string[];
    };
    memory: {
      status: 'ok' | 'warning' | 'error';
      usage: {
        heapUsed: number;
        heapTotal: number;
        rss: number;
        external: number;
      };
    };
  };
}

export async function GET() {
  const startTime = Date.now();
  
  try {
    const health: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: {
          status: 'ok'
        },
        environment: {
          status: 'ok'
        },
        memory: {
          status: 'ok',
          usage: {
            heapUsed: 0,
            heapTotal: 0,
            rss: 0,
            external: 0
          }
        }
      }
    };

    // Check environment variables
    const envValidation = validateEnvironment();
    if (!envValidation.valid) {
      health.checks.environment.status = 'error';
      health.checks.environment.errors = envValidation.errors;
      health.status = 'unhealthy';
    }

    // Check database connection
    try {
      const dbStartTime = Date.now();
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      // Simple query to test connection
      const { error } = await supabase.from('articles').select('id').limit(1);
      
      const dbResponseTime = Date.now() - dbStartTime;
      
      if (error) {
        health.checks.database.status = 'error';
        health.checks.database.message = 'Database query failed';
        health.status = 'unhealthy';
        logger.error('Health check database error', error);
      } else {
        health.checks.database.responseTime = dbResponseTime;
        
        // Warn if database is slow
        if (dbResponseTime > 1000) {
          logger.warn('Database response time is slow', { responseTime: dbResponseTime });
        }
      }
    } catch (error) {
      health.checks.database.status = 'error';
      health.checks.database.message = 'Database connection failed';
      health.status = 'unhealthy';
      logger.error('Health check database connection error', error);
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    health.checks.memory.usage = {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
      external: Math.round(memoryUsage.external / 1024 / 1024) // MB
    };

    // Set memory status based on usage
    const heapPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    if (heapPercentage > 90) {
      health.checks.memory.status = 'error';
      health.status = 'unhealthy';
    } else if (heapPercentage > 75) {
      health.checks.memory.status = 'warning';
    }

    const totalTime = Date.now() - startTime;
    
    logger.info('Health check completed', {
      status: health.status,
      duration: totalTime,
      checks: {
        database: health.checks.database.status,
        environment: health.checks.environment.status,
        memory: health.checks.memory.status
      }
    });

    return NextResponse.json(health, {
      status: health.status === 'healthy' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${totalTime}ms`
      }
    });
  } catch (error) {
    logger.error('Health check failed', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      },
      { 
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
  }
}