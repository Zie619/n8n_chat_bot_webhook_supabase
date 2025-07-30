import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { withLogging } from '@/lib/logger';
import { monitoring } from '@/lib/monitoring';

export const GET = withLogging(async (request: NextRequest) => {
  try {
    // Check authorization
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authToken = verifyToken(token);
    if (!authToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get monitoring data
    const metrics = monitoring.getMetrics();
    const errors = monitoring.getErrors();
    const summary = monitoring.getPerformanceSummary();

    // Get system info
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          total: metrics.length,
          summary,
          recent: metrics.slice(-100) // Last 100 metrics
        },
        errors: {
          total: errors.length,
          recent: errors.slice(-50).map(e => ({
            message: e.error.message,
            timestamp: e.timestamp,
            context: e.context
          }))
        },
        system: {
          uptime: Math.round(uptime),
          memory: {
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            rss: Math.round(memoryUsage.rss / 1024 / 1024),
            external: Math.round(memoryUsage.external / 1024 / 1024)
          },
          nodejs: process.version,
          platform: process.platform,
          arch: process.arch
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get monitoring metrics', error);
    return NextResponse.json(
      { error: 'Failed to retrieve metrics' },
      { status: 500 }
    );
  }
});