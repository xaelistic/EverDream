import { supabase, getCurrentUser, getProfile } from './supabase/client';
import { inviteLandingUrl, inviteMessage } from './friendsInvite';

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

function slugQuery(value: string): string {
  return value.trim().replace(/^@/, '');
}

async function myProfileId(): Promise<string | null> {
  const row = await getProfile();
  return row?.id ?? null;
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
    .map((row: {
      id: string;
      handle?: string | null;
      display_name?: string | null;
      avatar_url?: string | null;
      friend_code?: string | null;
    }) => ({
      id: row.id,
      handle: row.handle || null,
      displayName: row.display_name || row.handle || 'Dreamer',
      avatarUrl: row.avatar_url || null,
      friendCode: row.friend_code || null,
    }))
    .filter((hit: DreamerHit) => hit.id !== me?.id);
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

export async function listFriendships(): Promise<FriendRow[]> {
  const me = await getProfile();
  if (!me?.id) return [];

  const { data, error } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status')
    .or(`requester_id.eq.${me.id},addressee_id.eq.${me.id}`)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  const otherIds = Array.from(
    new Set(
      (data || []).map((row) => (row.requester_id === me.id ? row.addressee_id : row.requester_id)),
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
    const otherId = row.requester_id === me.id ? row.addressee_id : row.requester_id;
    const person = byId.get(otherId);
    return {
      id: row.id,
      profileId: otherId,
      name: person?.name || 'Dreamer',
      handle: person?.handle || null,
      avatarUrl: person?.avatarUrl || null,
      status: row.status,
      incoming: row.addressee_id === me.id,
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
