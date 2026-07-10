import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testSupabase() {
  console.log('Testing Supabase connection...');
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  console.log('Current user:', user ? user.id : 'none', authErr ? authErr.message : '');

  // Test profile
  const { data: profile } = await supabase.from('profiles').select('*').limit(1);
  console.log('Profiles sample:', profile);

  // To create test data, better to sign in first or use UI.
  console.log('Schema fields for dreams include: content, transcript, capture_mode, themes[], emotion, symbols[], narrative, nugget, valence, interpretation, lucidity_level, pre_sleep_*, mood_valence, context, media_urls, generated_image_*, sleep_session_id, visibility, etc.');
}

testSupabase().catch(console.error);
