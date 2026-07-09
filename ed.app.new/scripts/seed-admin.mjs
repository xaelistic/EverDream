#!/usr/bin/env node
/**
 * Seed EverDream test accounts (admin + tier samples).
 *
 * Usage:
 *   npm run seed:admin
 *
 * Requires in .env (or environment):
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY  (recommended — skips email confirmation)
 *
 * Accounts created:
 *   admin@everdream.test  — is_admin + pro tier (all features, no payment)
 *   free@everdream.test   — free tier (onboarding not completed)
 *   plus@everdream.test   — plus tier
 *   pro@everdream.test    — pro tier
 *
 * Default password for all: EverDream!Test2026
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnvFile() {
  const envPath = resolve(root, '.env');
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DEFAULT_PASSWORD = process.env.SEED_PASSWORD || 'EverDream!Test2026';

const ACCOUNTS = [
  {
    email: 'admin@everdream.test',
    displayName: 'EverDream Admin',
    isAdmin: true,
    tier: 'pro',
    skipOnboarding: false,
  },
  {
    email: 'free@everdream.test',
    displayName: 'Free Tester',
    isAdmin: false,
    tier: 'free',
    skipOnboarding: false,
  },
  {
    email: 'plus@everdream.test',
    displayName: 'Plus Tester',
    isAdmin: false,
    tier: 'plus',
    skipOnboarding: true,
  },
  {
    email: 'pro@everdream.test',
    displayName: 'Pro Tester',
    isAdmin: false,
    tier: 'pro',
    skipOnboarding: true,
  },
];

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const adminClient = SERVICE_KEY
  ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

const anonClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function upsertAccount(account) {
  const metadata = {
    display_name: account.displayName,
    is_admin: account.isAdmin,
    subscription_tier: account.tier,
  };

  if (adminClient) {
    const { data: existing } = await adminClient.auth.admin.listUsers();
    const found = existing?.users?.find((u) => u.email === account.email);

    if (found) {
      const { error } = await adminClient.auth.admin.updateUserById(found.id, {
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: metadata,
      });
      if (error) throw error;
      await syncProfile(adminClient, found.id, account);
      return { email: account.email, action: 'updated', id: found.id };
    }

    const { data, error } = await adminClient.auth.admin.createUser({
      email: account.email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) throw error;
    await syncProfile(adminClient, data.user.id, account);
    return { email: account.email, action: 'created', id: data.user.id };
  }

  const { data, error } = await anonClient.auth.signUp({
    email: account.email,
    password: DEFAULT_PASSWORD,
    options: { data: metadata },
  });
  if (error) {
    if (error.message?.toLowerCase().includes('already registered')) {
      const { error: signInError } = await anonClient.auth.signInWithPassword({
        email: account.email,
        password: DEFAULT_PASSWORD,
      });
      if (signInError) throw signInError;
      const { data: userData } = await anonClient.auth.getUser();
      if (userData.user) await syncProfile(anonClient, userData.user.id, account);
      return { email: account.email, action: 'exists (signed in)', id: userData.user?.id };
    }
    throw error;
  }
  if (data.user) await syncProfile(anonClient, data.user.id, account);
  return { email: account.email, action: 'created (confirm email if required)', id: data.user?.id };
}

async function syncProfile(client, authUserId, account) {
  const profilePatch = {
    display_name: account.displayName,
    is_admin: account.isAdmin,
    subscription_tier: account.tier,
    updated_at: new Date().toISOString(),
  };
  if (account.skipOnboarding) {
    profilePatch.onboarded_at = new Date().toISOString();
  }

  const { error: profileError } = await client
    .from('profiles')
    .update(profilePatch)
    .eq('auth_user_id', authUserId);

  if (profileError) {
    console.warn(`  profile sync warning for ${account.email}:`, profileError.message);
  }

  const { data: profile } = await client
    .from('profiles')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (!profile?.id) return;

  if (account.isAdmin || account.tier !== 'free') {
    await client
      .from('user_settings')
      .update({
        image_generation_enabled: true,
        ai_analysis_consent: true,
        data_processing_consent: true,
        wearable_sync: true,
        sleep_tracking_enabled: true,
        motion_sensor_enabled: true,
        audio_recording_enabled: true,
        smart_wake_enabled: true,
        circadian_coaching_enabled: true,
        notifications_enabled: true,
      })
      .eq('user_id', profile.id);
  }
}

console.log('EverDream — seeding test accounts');
console.log('Supabase URL:', SUPABASE_URL);
console.log('Service role:', SERVICE_KEY ? 'yes' : 'no (sign-up may need email confirmation)');
console.log('Password:', DEFAULT_PASSWORD);
console.log('');

const results = [];
for (const account of ACCOUNTS) {
  try {
    const result = await upsertAccount(account);
    results.push({ ...result, tier: account.tier, isAdmin: account.isAdmin, ok: true });
    console.log(`✅ ${result.email} — ${result.action} (${account.tier}${account.isAdmin ? ', admin' : ''})`);
  } catch (err) {
    results.push({ email: account.email, ok: false, error: err.message });
    console.error(`❌ ${account.email} — ${err.message}`);
  }
}

console.log('');
console.log('Login credentials for testing:');
console.log('  Primary admin: admin@everdream.test /', DEFAULT_PASSWORD);
console.log('  Tier samples:  free@ / plus@ / pro@ everdream.test /', DEFAULT_PASSWORD);
console.log('');
console.log('Enable login screen: set VITE_REQUIRE_AUTH=true in .env, then npm run dev');
console.log('Force onboarding:  localStorage.setItem("forceOnboarding", "1"); location.reload()');
console.log('Admin dashboard:   http://localhost:5173/#/admin');

const failed = results.filter((r) => !r.ok);
process.exit(failed.length ? 1 : 0);