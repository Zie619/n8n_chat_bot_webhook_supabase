import { logger } from './logger';
import { validateEnvironment } from './env-validation';
import { setupGlobalErrorHandlers } from './error-handler';

let initialized = false;

export function initializeApp() {
  if (initialized) return;
  
  logger.info('Initializing xFunnel application...');
  
  // Set up global error handlers
  setupGlobalErrorHandlers();
  
  // Validate environment variables
  const { valid, errors } = validateEnvironment();
  
  if (!valid) {
    logger.error('Application initialization failed due to environment errors', undefined, { errors });
    
    // In production on the server side, only exit if critical errors
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
      const hasCriticalErrors = errors.some(error => 
        error.includes('NEXT_PUBLIC_SUPABASE_URL') || 
        error.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
        error.includes('SUPABASE_SERVICE_ROLE_KEY')
      );
      
      if (hasCriticalErrors) {
        logger.error('Exiting due to critical environment configuration errors');
        process.exit(1);
      } else {
        logger.warn('Running with non-critical environment warnings', { errors });
      }
    }
  }
  
  // Log application info
  logger.info('Application initialized', {
    nodeEnv: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    platform: process.platform,
    nodeVersion: process.version
  });
  
  initialized = true;
}