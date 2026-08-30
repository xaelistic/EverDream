import { looksLikeFriendCode } from './friendCode';
import { supabase, getCurrentUser, getProfile } from './supabase/client';
import { inviteLandingUrl, inviteMessage } from './friendsInvite';

export { looksLikeFriendCode };

export { inviteLandingUrl, inviteMessage };

export interface DreamerHit {
  id: string;
  handle: string | null;
  displayName: string;
  avatarUrl: string | null;
  friendCode: string | null;
}

export interface FriendRow {
  id: string;
  profileId: string;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
  status: 'pending' | 'accepted' | 'declined';
  incoming: boolean;
}

export type InviteChannel = 'email' | 'whatsapp' | 'sms' | 'twitter' | 'native' | 'copy';

export function normalizeHandle(value: string): string {
  return value.trim().replace(/^@+/, '').toLowerCase();
}

function slugQuery(value: string): string {
  return normalizeHandle(value);
}

function hitFromRpc(row: {
  id?: string;
  handle?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  friend_code?: string | null;
  status?: string | null;
}): DreamerHit {
  return {
    id: String(row.id || ''),
    handle: row.handle || null,
    displayName: row.display_name || row.handle || 'Dreamer',
    avatarUrl: row.avatar_url || null,
    friendCode: row.friend_code || null,
  };
}

function profileIdFromRow(row: Record<string, unknown> | null): string | null {
  return typeof row?.id === 'string' && row.id ? row.id : null;
}

async function myProfileId(): Promise<string | null> {
  return profileIdFromRow(await getProfile());
}

export async function searchDreamers(raw: string): Promise<DreamerHit[]> {
  const q = slugQuery(raw);
  if (q.length < 2) return [];
  const user = await getCurrentUser();
  if (!user) throw new Error('Sign in to search for people.');

  const { data, error } = await supabase.rpc('search_dreamers', { q });
  if (error) throw new Error(error.message);
  const me = await getProfile();
  return (data || [])
    .map(hitFromRpc)
    .filter((hit: DreamerHit) => hit.id && hit.id !== me?.id);
}

export async function addFriendById(profileId: string): Promise<DreamerHit> {
  const { data, error } = await supabase.rpc('add_friend', { target: profileId });
  if (!error) {
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.id) return hitFromRpc(row);
  }
  if (error && !/function|does not exist|schema cache|404/i.test(error.message)) {
    throw new Error(error.message.replace(/^.*ERROR:\s*/i, ''));
  }

  const requesterId = await myProfileId();
  if (!requesterId) throw new Error('Profile not found. Sign out and back in.');
  const { error: insertError } = await supabase.from('friendships').insert({
    requester_id: requesterId,
    addressee_id: profileId,
    status: 'accepted',
  });
  if (insertError && !/duplicate|unique/i.test(insertError.message)) {
    throw new Error(insertError.message);
  }
  if (insertError) {
    await supabase
      .from('friendships')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .or(
        `and(requester_id.eq.${requesterId},addressee_id.eq.${profileId}),and(requester_id.eq.${profileId},addressee_id.eq.${requesterId})`,
      );
  }
  const { data: people } = await supabase.rpc('get_dreamers', { ids: [profileId] });
  const person = Array.isArray(people) ? people[0] : people;
  if (!person?.id) throw new Error('Could not add that person.');
  return hitFromRpc(person);
}

export async function connectByHandle(username: string): Promise<DreamerHit> {
  const cleaned = normalizeHandle(username);
  if (cleaned.length < 2) throw new Error('Enter a username like @luna.');
  const { data, error } = await supabase.rpc('connect_by_handle', { username: cleaned });
  if (!error) {
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.id) return hitFromRpc(row);
  }
  if (error && !/function|does not exist|schema cache|404/i.test(error.message)) {
    throw new Error(error.message.replace(/^.*ERROR:\s*/i, ''));
  }
  const hits = await searchDreamers(cleaned);
  const exact = hits.find((hit) => normalizeHandle(hit.handle || '') === cleaned);
  if (exact) return addFriendById(exact.id);
  if (hits.length === 1) return addFriendById(hits[0].id);
  if (hits.length > 1) throw new Error('Several people match that. Pick one from the search results.');
  throw new Error(`No one has the username @${cleaned}.`);
}

export async function sendFriendRequest(addresseeId: string): Promise<void> {
  const requesterId = await myProfileId();
  if (!requesterId) throw new Error('Profile not found. Sign out and back in.');
  if (requesterId === addresseeId) throw new Error('You cannot add yourself.');

  const { error } = await supabase.from('friendships').insert({
    requester_id: requesterId,
    addressee_id: addresseeId,
    status: 'pending',
  });
  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      throw new Error('You already sent a request to this person.');
    }
    throw new Error(error.message);
  }
}

export async function respondToFriendRequest(friendshipId: string, accept: boolean): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .update({ status: accept ? 'accepted' : 'declined', updated_at: new Date().toISOString() })
    .eq('id', friendshipId);
  if (error) throw new Error(error.message);
}

export async function connectByFriendCode(code: string): Promise<DreamerHit> {
  const cleaned = code.trim();
  if (!looksLikeFriendCode(cleaned)) throw new Error('Enter a full friend code like DREAM-AB12CD.');
  const { data, error } = await supabase.rpc('connect_by_friend_code', { code: cleaned });
  if (error) throw new Error(error.message.replace(/^.*ERROR:\s*/i, ''));
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) throw new Error('No one has that friend code.');
  return {
    id: row.id,
    handle: row.handle || null,
    displayName: row.display_name || row.handle || 'Dreamer',
    avatarUrl: row.avatar_url || null,
    friendCode: cleaned.toUpperCase().replace(/\s+/g, ''),
  };
}

export function friendRowFromHit(
  hit: DreamerHit,
  status: FriendRow['status'],
  incoming = false,
): FriendRow {
  return {
    id: `local-${hit.id}`,
    profileId: hit.id,
    name: hit.displayName,
    handle: hit.handle,
    avatarUrl: hit.avatarUrl,
    status,
    incoming,
  };
}

export async function listFriendships(): Promise<FriendRow[]> {
  const meId = profileIdFromRow(await getProfile());
  if (!meId) return [];

  const { data, error } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status')
    .or(`requester_id.eq.${meId},addressee_id.eq.${meId}`)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  const otherIds = Array.from(
    new Set(
      (data || []).map((row) => (row.requester_id === meId ? row.addressee_id : row.requester_id)),
    ),
  );
  if (otherIds.length === 0) return [];

  const { data: people } = await supabase.rpc('get_dreamers', { ids: otherIds });

  const byId = new Map(
    (people || []).map((p: { id: string; handle?: string | null; display_name?: string | null; avatar_url?: string | null }) => [
      p.id,
      {
        name: p.display_name || p.handle || 'Dreamer',
        handle: p.handle || null,
        avatarUrl: p.avatar_url || null,
      },
    ]),
  );

  return (data || []).map((row) => {
    const otherId = row.requester_id === meId ? row.addressee_id : row.requester_id;
    const person = byId.get(otherId);
    return {
      id: row.id,
      profileId: otherId,
      name: person?.name || 'Dreamer',
      handle: person?.handle || null,
      avatarUrl: person?.avatarUrl || null,
      status: row.status,
      incoming: row.addressee_id === meId,
    };
  });
}

export async function createFriendInvite(
  channel: InviteChannel,
  email?: string,
): Promise<{ token: string; url: string }> {
  const inviterId = await myProfileId();
  if (!inviterId) throw new Error('Sign in to invite friends.');
  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const { error } = await supabase.from('friend_invites').insert({
    inviter_id: inviterId,
    email: email?.trim() || null,
    channel,
    token,
    status: 'sent',
  });
  if (error) throw new Error(error.message);
  return { token, url: inviteLandingUrl(token) };
}

export function openInviteChannel(channel: InviteChannel, url: string, displayName: string, email?: string): void {
  const text = inviteMessage(displayName, url);
  if (channel === 'email') {
    const to = email ? encodeURIComponent(email) : '';
    window.location.href = `mailto:${to}?subject=${encodeURIComponent('Join me on EverDream')}&body=${encodeURIComponent(text)}`;
    return;
  }
  if (channel === 'whatsapp') {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    return;
  }
  if (channel === 'sms') {
    window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
    return;
  }
  if (channel === 'twitter') {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer',
    );
  }
}
