import { logger } from './logger';

interface EnvVar {
  name: string;
  required: boolean;
  defaultValue?: string;
  validator?: (value: string) => boolean;
  description?: string;
}

const ENV_VARS: EnvVar[] = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    validator: (value) => value.startsWith('https://'),
    description: 'Supabase project URL'
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase anonymous key'
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    description: 'Supabase service role key (server-side only)'
  },
  {
    name: 'JWT_SECRET',
    required: true,
    validator: (value) => value.length >= 32,
    description: 'JWT secret key (minimum 32 characters)'
  },
  {
    name: 'API_KEY_SECRET',
    required: true,
    validator: (value) => value.length >= 8 && value !== 'your-admin-password-here' && value !== 'your-secret-api-key-for-internal-auth',
    description: 'Admin password for registration (minimum 8 characters)'
  },
  {
    name: 'ANTHROPIC_API_KEY',
    required: true,
    validator: (value) => value.startsWith('sk-ant-'),
    description: 'Anthropic API key for Claude'
  },
  {
    name: 'N8N_WEBHOOK_URL',
    required: false,
    defaultValue: '',
    validator: (value) => !value || value.startsWith('http'),
    description: 'n8n webhook URL'
  },
  {
    name: 'NEXT_PUBLIC_APP_URL',
    required: false,
    defaultValue: 'http://localhost:3000',
    validator: (value) => value.startsWith('http'),
    description: 'Application URL for CORS and redirects'
  },
  {
    name: 'LOG_LEVEL',
    required: false,
    defaultValue: 'info',
    validator: (value) => ['debug', 'info', 'warn', 'error'].includes(value),
    description: 'Logging level'
  }
];

export function validateEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Skip validation on client side for server-only variables
  if (typeof window !== 'undefined') {
    logger.info('Skipping full environment validation on client side');
    return { valid: true, errors: [] };
  }

  logger.info('Validating environment variables...');

  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.name];

    // Check if required variable is missing
    if (envVar.required && !value) {
      errors.push(`Missing required environment variable: ${envVar.name} - ${envVar.description || ''}`);
      continue;
    }

    // Skip validation for optional variables that are not set
    if (!envVar.required && !value) {
      if (envVar.defaultValue !== undefined) {
        logger.debug(`Using default value for ${envVar.name}: ${envVar.defaultValue}`);
      }
      continue;
    }

    // Validate the value if a validator is provided
    if (value && envVar.validator && !envVar.validator(value)) {
      errors.push(`Invalid value for ${envVar.name}: ${value}`);
    }

    // Log successful validation in debug mode
    if (value) {
      logger.debug(`✓ ${envVar.name} is set`);
    }
  }

  // Check for common mistakes and security issues
  if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost')) {
    warnings.push('NEXT_PUBLIC_SUPABASE_URL contains localhost - ensure this is intentional');
  }

  if (process.env.API_KEY_SECRET === 'your-admin-password-here' || 
      process.env.API_KEY_SECRET === 'your-secret-api-key-for-internal-auth') {
    errors.push('API_KEY_SECRET is using the default value - please change it to a secure password');
  }

  if (process.env.JWT_SECRET === 'xfunnel-jwt-secret-key-change-this-in-production') {
    errors.push('JWT_SECRET is using the default value - please generate a secure random string');
  }

  // Production-specific checks
  if (process.env.NODE_ENV === 'production') {
    if (process.env.NEXT_PUBLIC_APP_URL?.includes('localhost')) {
      errors.push('NEXT_PUBLIC_APP_URL contains localhost in production - please set to your production domain');
    }
    
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      warnings.push('Rate limiting is not configured for production - consider setting up Upstash Redis');
    }
  }

  // Log results
  if (errors.length > 0) {
    logger.error('Environment validation failed', undefined, { errors });
  } else {
    logger.info('Environment validation passed', { warnings });
  }

  return { valid: errors.length === 0, errors };
}

// Helper function to get environment variable with fallback
export function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && defaultValue !== undefined) {
    return defaultValue;
  }
  if (!value) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value;
}

// Safe environment variables for client-side use
export const clientEnv = {
  supabaseUrl: typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL! : '',
  supabaseAnonKey: typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! : '',
  isDevelopment: typeof process !== 'undefined' ? process.env.NODE_ENV === 'development' : false,
  isProduction: typeof process !== 'undefined' ? process.env.NODE_ENV === 'production' : false
};