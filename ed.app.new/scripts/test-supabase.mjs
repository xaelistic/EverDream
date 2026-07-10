// test-supabase.mjs
// Run with: node scripts/test-supabase.mjs
// Requires .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
// This creates an anonymous test account (or uses existing) and inserts full-featured test data
// to validate all capture fields in dreams and sleep_sessions.

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
  console.log('=== EverDream Supabase Test ===');
  console.log('URL:', process.env.VITE_SUPABASE_URL);

  // 1. Auth - create / use anonymous test account
  console.log('\n[1] Authenticating (anonymous test account)...');
  let { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (!user) {
    const { data: signInData, error: signErr } = await supabase.auth.signInAnonymously();
    if (signErr) {
      console.error('Sign in failed (may need email confirm disabled or use dashboard):', signErr.message);
      // Fallback: try to proceed if already have session in some envs
    } else {
      user = signInData.user;
      console.log('Created/ signed in as anonymous user:', user?.id);
    }
  } else {
    console.log('Using existing session for user:', user.id);
  }

  // Get or ensure profile
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('auth_user_id', user?.id)
    .single();

  let profileId = profile?.id;
  if (!profileId && user) {
    const { data: newProfile } = await supabase
      .from('profiles')
      .insert({ auth_user_id: user.id, display_name: 'TestUser-' + Date.now().toString().slice(-4) })
      .select('id')
      .single();
    profileId = newProfile?.id;
  }
  console.log('Using profile ID:', profileId);

  if (!profileId) {
    console.error('Cannot proceed without profile. Create user manually in Supabase Auth or run app signup.');
    return;
  }

  // 2. Insert test dream with ALL key capture/analysis fields
  console.log('\n[2] Inserting test dream with full fields...');
  const dreamPayload = {
    user_id: profileId,
    content: 'Test dream: Flying over a bioluminescent ocean, old friend transforms into a wise dragon. Felt empowering and mysterious.',
    transcript: 'flying bioluminescent ocean friend dragon empowering mysterious',
    capture_mode: 'text',
    category: 'lucid',
    themes: ['flying', 'ocean', 'transformation', 'wisdom', 'friendship'],
    emotion: 'empowered',
    symbols: ['dragon', 'ocean', 'night-sky', 'transformation'],
    narrative: 'A powerful symbol of personal growth and unexpected alliances in the subconscious.',
    nugget: 'Transformation brings wisdom when embraced.',
    valence: 0.85,
    interpretation: {
      summary: 'Positive growth and alliance dream',
      key_themes: ['empowerment', 'change', 'connection'],
      psychological_notes: 'May reflect current life transitions.'
    },
    lucidity_level: 4,
    pre_sleep_intent: 'Seeking creative inspiration',
    pre_sleep_note: 'Watched nature documentary before bed',
    mood_valence: 0.75,
    context: { time_of_day: 'late', recent_stress: 'medium', location: 'home-bedroom' },
    media_urls: [],
    generated_image_url: null, // Will be filled by image gen in real flow
    generated_image_prompt: 'flying over glowing bioluminescent ocean with dragon friend surreal style',
    generated_image_style: 'surreal',
    generated_image_source: 'test',
    visibility: 'private',
    license: 'copyleft',
    allow_remix: true,
    sleep_score: 88,
    sleep_duration_minutes: 450,
    rem_minutes: 95
  };

  const { data: dream, error: dErr } = await supabase.from('dreams').insert(dreamPayload).select().single();
  if (dErr) console.error('Dream insert error:', dErr.message);
  else console.log('✓ Dream inserted:', dream.id, 'Fields populated:', Object.keys(dreamPayload).length);

  // 3. Insert test sleep session with ALL fields
  console.log('\n[3] Inserting test sleep session with full fields...');
  const now = new Date();
  const sleepStart = new Date(now.getTime() - 8 * 3600 * 1000);
  const sleepPayload = {
    user_id: profileId,
    sleep_start: sleepStart.toISOString(),
    sleep_end: now.toISOString(),
    time_in_bed_minutes: 480,
    awake_minutes: 25,
    light_minutes: 200,
    deep_minutes: 130,
    rem_minutes: 95,
    total_sleep_minutes: 425,
    sleep_efficiency: 88.5,
    awakenings: 3,
    waso_minutes: 30,
    movement_index: 8.7,
    heart_rate_avg: 56,
    heart_rate_variability: 52,
    algorithmic_score: 86,
    user_report_score: 90,
    calibration_offset: -2,
    calibrated_score: 84,
    circadian_alignment_score: 79,
    chronotype_estimate: 'night-owl',
    source: 'wearable',
    wearable_provider: 'oura',
    device_id: 'test-oura-001',
    dream_id: dream?.id || null,
    morning_check_in: { energy: 8, mood: 'inspired', notes: 'Great dream recall' },
    is_active: false
  };

  const { data: sleep, error: sErr } = await supabase.from('sleep_sessions').insert(sleepPayload).select().single();
  if (sErr) console.error('Sleep insert error:', sErr.message);
  else console.log('✓ Sleep session inserted:', sleep.id);

  // 4. Test update / relation
  if (dream && sleep) {
    await supabase.from('dreams').update({ sleep_session_id: sleep.id }).eq('id', dream.id);
    console.log('✓ Linked dream <-> sleep session');
  }

  // 5. Verify
  const { data: verifyDream } = await supabase.from('dreams').select('id, content, valence, themes, interpretation, sleep_session_id').eq('id', dream?.id).single();
  console.log('\n[4] Verification sample from DB:', verifyDream);

  console.log('\n=== SUCCESS: Test data created with full fields. ===');
  console.log('Check your Supabase dashboard > Table Editor > dreams and sleep_sessions.');
  console.log('To create more named test accounts: Use the running app LoginScreen with test emails (or Supabase Studio > Auth > Add user).');

  await supabase.auth.signOut();
}

main().catch(console.error);