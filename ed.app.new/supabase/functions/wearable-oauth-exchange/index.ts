/**
 * Supabase Edge Function: wearable-oauth-exchange
 *
 * Securely exchanges OAuth authorization code for access/refresh tokens.
 * Client secrets are kept server-side (Supabase secrets).
 *
 * Request body:
 *   { provider: string, code: string, redirect_uri?: string }
 *
 * Response:
 *   { success: true, auth: { provider, accessToken, refreshToken?, expiresAt? } }
 *   or error
 *
 * Required secrets (set via supabase secrets set):
 *   OURA_CLIENT_ID, OURA_CLIENT_SECRET
 *   FITBIT_CLIENT_ID, FITBIT_CLIENT_SECRET
 *   etc. for each provider.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://everdream.n1g3.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ success: false, error: message }, status);
}

async function exchangeToken(provider: string, code: string, redirectUri: string) {
  const getSecret = (name: string) => Deno.env.get(name) || '';

  let tokenUrl = '';
  const body: Record<string, string> = {
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  };

  let clientId = '';
  let clientSecret = '';

  switch (provider) {
    case 'oura':
      tokenUrl = 'https://api.ouraring.com/oauth/token';
      clientId = getSecret('OURA_CLIENT_ID');
      clientSecret = getSecret('OURA_CLIENT_SECRET');
      body.client_id = clientId;
      body.client_secret = clientSecret;
      break;

    case 'fitbit':
      tokenUrl = 'https://api.fitbit.com/oauth2/token';
      clientId = getSecret('FITBIT_CLIENT_ID');
      clientSecret = getSecret('FITBIT_CLIENT_SECRET');
      body.client_id = clientId;
      body.client_secret = clientSecret;
      break;

    case 'google_fit':
      tokenUrl = 'https://oauth2.googleapis.com/token';
      clientId = getSecret('GOOGLE_FIT_CLIENT_ID');
      clientSecret = getSecret('GOOGLE_FIT_CLIENT_SECRET');
      body.client_id = clientId;
      body.client_secret = clientSecret;
      break;

    // Add other providers similarly (samsung, huawei, etc.)
    case 'withings':
      tokenUrl = 'https://wbsapi.withings.net/v2/oauth2';
      clientId = getSecret('WITHINGS_CLIENT_ID');
      clientSecret = getSecret('WITHINGS_CLIENT_SECRET');
      body.client_id = clientId;
      body.client_secret = clientSecret;
      break;

    default:
      throw new Error(`Unsupported provider for OAuth exchange: ${provider}`);
  }

  if (!clientId || !clientSecret) {
    throw new Error(`Missing client credentials for ${provider}`);
  }

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed for ${provider}: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  return {
    provider,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const { provider, code, redirect_uri } = await req.json();

    if (!provider || !code) {
      return errorResponse('provider and code are required');
    }

    const redirectUri = redirect_uri || 'https://everdream.app/wearable-callback'; // adjust as needed

    const auth = await exchangeToken(provider, code, redirectUri);

    return jsonResponse({ success: true, auth });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[wearable-oauth-exchange] Error:', message);
    return errorResponse(message, 500);
  }
});
