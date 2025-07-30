import { logger } from './logger';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
}

interface ErrorMetric {
  error: Error;
  context?: any;
  userId?: string;
  timestamp: Date;
}

class MonitoringService {
  private metrics: PerformanceMetric[] = [];
  private errors: ErrorMetric[] = [];
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    
    // Set up performance observer if available
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.setupPerformanceObserver();
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupPerformanceObserver() {
    try {
      // Observe navigation timing
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordMetric('page-load', navEntry.loadEventEnd - navEntry.fetchStart, 'ms');
            this.recordMetric('dns-lookup', navEntry.domainLookupEnd - navEntry.domainLookupStart, 'ms');
            this.recordMetric('tcp-connection', navEntry.connectEnd - navEntry.connectStart, 'ms');
            this.recordMetric('ttfb', navEntry.responseStart - navEntry.requestStart, 'ms');
          }
        }
      });
      navigationObserver.observe({ entryTypes: ['navigation'] });

      // Observe largest contentful paint
      const paintObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric('lcp', lastEntry.startTime, 'ms');
      });
      paintObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Observe first input delay
      const inputObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'first-input') {
            const fid = entry as any;
            this.recordMetric('fid', fid.processingStart - fid.startTime, 'ms');
          }
        }
      });
      inputObserver.observe({ entryTypes: ['first-input'] });

    } catch (error) {
      logger.warn('Failed to setup performance observer', { error });
    }
  }

  recordMetric(name: string, value: number, unit: string = 'ms') {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date()
    };

    this.metrics.push(metric);
    
    // Log important metrics
    if (['page-load', 'lcp', 'fid', 'api-response-time'].includes(name)) {
      logger.info(`Performance metric: ${name}`, { value, unit });
    }

    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoringService('metric', metric);
    }
  }

  recordError(error: Error, context?: any, userId?: string) {
    const errorMetric: ErrorMetric = {
      error,
      context,
      userId,
      timestamp: new Date()
    };

    this.errors.push(errorMetric);
    
    // Log the error
    logger.error('Application error', error as Error, context);

    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoringService('error', errorMetric);
    }
  }

  recordApiCall(endpoint: string, method: string, duration: number, status: number) {
    this.recordMetric(`api-${method.toLowerCase()}-${endpoint}`, duration, 'ms');
    
    if (status >= 400) {
      this.recordMetric('api-error-rate', 1, 'count');
    }
  }

  private async sendToMonitoringService(type: 'metric' | 'error', data: any) {
    // In production, you would send this to your monitoring service
    // Examples: Sentry, LogRocket, DataDog, New Relic, etc.
    
    // For now, we'll just batch and log
    try {
      if (process.env.NEXT_PUBLIC_MONITORING_ENDPOINT) {
        await fetch(process.env.NEXT_PUBLIC_MONITORING_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: this.sessionId,
            type,
            data,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
          })
        });
      }
    } catch (error) {
      // Silently fail - we don't want monitoring to break the app
      console.error('Failed to send monitoring data:', error);
    }
  }

  getMetrics() {
    return this.metrics;
  }

  getErrors() {
    return this.errors;
  }

  clearMetrics() {
    this.metrics = [];
  }

  clearErrors() {
    this.errors = [];
  }

  // Get a summary of current performance
  getPerformanceSummary() {
    const summary: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    
    for (const metric of this.metrics) {
      if (!summary[metric.name]) {
        summary[metric.name] = {
          avg: 0,
          min: Infinity,
          max: -Infinity,
          count: 0
        };
      }
      
      const s = summary[metric.name];
      s.count++;
      s.min = Math.min(s.min, metric.value);
      s.max = Math.max(s.max, metric.value);
      s.avg = (s.avg * (s.count - 1) + metric.value) / s.count;
    }
    
    return summary;
  }
}

// Export singleton instance
export const monitoring = new MonitoringService();

// Export convenience functions
export function recordMetric(name: string, value: number, unit?: string) {
  monitoring.recordMetric(name, value, unit);
}

export function recordError(error: Error, context?: any, userId?: string) {
  monitoring.recordError(error, context, userId);
}

export function recordApiCall(endpoint: string, method: string, duration: number, status: number) {
  monitoring.recordApiCall(endpoint, method, duration, status);
}