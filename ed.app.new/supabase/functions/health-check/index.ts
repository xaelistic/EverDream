/**
 * Supabase Edge Function: health-check
 *
 * Simple health check endpoint for monitoring.
 * Returns status of all edge functions and their configuration.
 *
 * No authentication required — used by Night Watchdog for monitoring.
 *
 * Response:
 *   { status: "ok", functions: { name, configured: boolean }[], timestamp: string }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FunctionStatus {
  name: string;
  configured: boolean;
  requiredSecrets: string[];
  missingSecrets: string[];
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use GET.' }),
      { status: 405, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    );
  }

  // Check which secrets are configured
  const functions: FunctionStatus[] = [
    {
      name: 'analyze-dream',
      configured: true,
      requiredSecrets: ['OPENROUTER_API_KEY'],
      missingSecrets: [],
    },
    {
      name: 'generate-image',
      configured: true,
      requiredSecrets: [],
      missingSecrets: [],
    },
    {
      name: 'transcribe-audio',
      configured: true,
      requiredSecrets: ['HF_INFERENCE_API_KEY'],
      missingSecrets: [],
    },
  ];

  // Check each function's secrets
  for (const fn of functions) {
    fn.missingSecrets = fn.requiredSecrets.filter((secret) => !Deno.env.get(secret));
    fn.configured = fn.missingSecrets.length === 0;
  }

  const allConfigured = functions.every((f) => f.configured);

  return new Response(
    JSON.stringify({
      status: allConfigured ? 'ok' : 'degraded',
      functions,
      timestamp: new Date().toISOString(),
      version: '0.2.0',
    }),
    {
      status: allConfigured ? 200 : 503,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    },
  );
});
