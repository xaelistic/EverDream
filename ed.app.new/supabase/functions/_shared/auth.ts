import { createClient, type SupabaseClient, type User } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

export type BillableCaller =
  | { kind: 'user'; user: User; client: SupabaseClient }
  | { kind: 'internal'; profileId: string; admin: SupabaseClient };

export type DebitResult = { ok: boolean; remaining: number; message: string };

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function bearerToken(req: Request): string {
  const header = req.headers.get('Authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

function supabaseUrl(): string {
  return Deno.env.get('SUPABASE_URL') || '';
}

function anonKey(): string {
  return Deno.env.get('SUPABASE_ANON_KEY') || '';
}

function serviceKey(): string {
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
}

function adminClient(): SupabaseClient | null {
  const url = supabaseUrl();
  const key = serviceKey();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Signed-in user, or the service role. The anon key is rejected. */
export async function requireUserOrService(req: Request): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const token = bearerToken(req);
  const key = serviceKey();
  if (!token) return { ok: false, status: 401, error: 'Unauthorized' };
  if (key && timingSafeEqual(token, key)) return { ok: true };

  const url = supabaseUrl();
  const anon = anonKey();
  if (!url || !anon) return { ok: false, status: 401, error: 'Unauthorized' };
  const client = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return { ok: false, status: 401, error: 'Unauthorized' };
  return { ok: true };
}

/**
 * A real user session, or an internal service call that names a profile.
 * The public anon key cannot pass.
 */
export async function requireBillableCaller(req: Request): Promise<BillableCaller | { error: string; status: number }> {
  const token = bearerToken(req);
  const key = serviceKey();
  const url = supabaseUrl();
  const anon = anonKey();
  if (!token || !url || !anon) return { error: 'Unauthorized', status: 401 };

  if (key && timingSafeEqual(token, key)) {
    const profileId = (req.headers.get('x-everdream-profile-id') || '').trim();
    const admin = adminClient();
    if (!profileId || !admin) return { error: 'Unauthorized', status: 401 };
    return { kind: 'internal', profileId, admin };
  }

  const client = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return { error: 'Unauthorized', status: 401 };
  return { kind: 'user', user: data.user, client };
}

export async function debitCaller(caller: BillableCaller, amount: number, reason: string): Promise<DebitResult> {
  if (caller.kind === 'internal') {
    const { data, error } = await caller.admin.rpc('consume_image_credits_for_profile', {
      target_profile: caller.profileId,
      amount,
      reason,
    });
    if (error) return { ok: false, remaining: 0, message: error.message };
    const row = Array.isArray(data) ? data[0] : data;
    return {
      ok: Boolean(row?.ok),
      remaining: Number(row?.total_remaining) || 0,
      message: String(row?.message || ''),
    };
  }

  const admin = adminClient();
  const profileId = await profileIdForUser(caller);
  if (!admin || !profileId) return { ok: false, remaining: 0, message: 'Profile not found' };
  const { data, error } = await admin.rpc('consume_image_credits_for_profile', {
    target_profile: profileId,
    amount,
    reason,
  });
  if (error) return { ok: false, remaining: 0, message: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  return {
    ok: Boolean(row?.ok),
    remaining: Number(row?.total_remaining) || 0,
    message: String(row?.message || ''),
  };
}

async function profileIdForUser(caller: Extract<BillableCaller, { kind: 'user' }>): Promise<string | null> {
  const { data } = await caller.client
    .from('profiles')
    .select('id')
    .eq('auth_user_id', caller.user.id)
    .maybeSingle();
  return typeof data?.id === 'string' ? data.id : null;
}

export async function attachJobKey(caller: BillableCaller, reason: string, jobKey: string): Promise<void> {
  const admin = caller.kind === 'internal' ? caller.admin : adminClient();
  if (!admin || !jobKey) return;
  const profileId = caller.kind === 'internal' ? caller.profileId : await profileIdForUser(caller);
  if (!profileId) return;
  await admin.rpc('attach_credit_job_key', {
    target_profile: profileId,
    reason,
    job_key: jobKey,
  });
}

export async function refundCaller(
  caller: BillableCaller,
  amount: number,
  reason: string,
  jobKey?: string | null,
): Promise<void> {
  const admin = caller.kind === 'internal' ? caller.admin : adminClient();
  if (!admin) return;
  const profileId = caller.kind === 'internal' ? caller.profileId : await profileIdForUser(caller);
  if (!profileId) return;
  await admin.rpc('refund_image_credits_for_profile', {
    target_profile: profileId,
    amount,
    reason,
    job_key: jobKey || null,
  });
}
