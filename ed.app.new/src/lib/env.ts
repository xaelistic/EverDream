/**
 * Environment Variable Validation
 * 
 * Validates required environment variables at app startup
 * and provides helpful error messages if they're missing.
 */

export interface EnvConfig {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  openRouterApiKey?: string;
  hfInferenceApiKey?: string;
  falAiKey?: string;
  localGenUrl?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  config: EnvConfig;
}

/**
 * Validate environment variables and return configuration
 */
export function validateEnvVariables(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const config: EnvConfig = {};

  // Required for cloud sync (optional - app can work in local-only mode)
  config.supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  config.supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    warnings.push(
      'Supabase not configured. The app will work in local-only mode without cloud sync.'
    );
  } else {
    // Validate Supabase URL format
    try {
      new URL(config.supabaseUrl);
    } catch {
      errors.push('Invalid VITE_SUPABASE_URL format. Must be a valid URL.');
    }

    // Validate Supabase key format (should start with 'eyJ')
    if (!config.supabaseAnonKey.startsWith('eyJ')) {
      warnings.push(
        'VITE_SUPABASE_ANON_KEY may be invalid. Supabase keys typically start with "eyJ".'
      );
    }
  }

  // Optional API keys
  config.localGenUrl = import.meta.env.VITE_LOCAL_GEN_URL;

  // Warn if no image generation method is configured
  const hasImageGenConfig = 
    config.supabaseUrl || 
    config.falAiKey || 
    config.hfInferenceApiKey || 
    config.localGenUrl;
  
  if (!hasImageGenConfig) {
    warnings.push(
      'No image generation configured. Dreams will be saved without generated images. ' +
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    config,
  };
}

/**
 * Initialize environment validation at app startup
 * Call this early in your app initialization
 */
export function initEnvValidation(): void {
  const result = validateEnvVariables();

  if (result.errors.length > 0) {
    console.error('[Env Validation] Critical errors:');
    result.errors.forEach(err => console.error(`  - ${err}`));
    throw new Error(`Environment validation failed: ${result.errors.join(', ')}`);
  }

  if (result.warnings.length > 0) {
    console.log('[Env Validation] Warnings:');
    result.warnings.forEach(warn => console.log(`  - ${warn}`));
  }

  console.log('[Env Validation] Configuration:', {
    supabase: !!result.config.supabaseUrl,
    openRouter: !!result.config.openRouterApiKey,
    hfInference: !!result.config.hfInferenceApiKey,
    falAi: !!result.config.falAiKey,
    localGen: !!result.config.localGenUrl,
  });
}
