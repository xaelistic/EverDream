import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Loader2,
  Mail,
  MessageCircle,
  Plus,
  Search,
  Share2,
  User,
  UserPlus,
} from 'lucide-react';
import { useToast } from '../ui/Toast';
import {
  addFriendById,
  connectByFriendCode,
  connectByHandle,
  createFriendInvite,
  friendRowFromHit,
  listFriendships,
  looksLikeFriendCode,
  normalizeHandle,
  openInviteChannel,
  respondToFriendRequest,
  searchDreamers,
  type DreamerHit,
  type FriendRow,
  type InviteChannel,
} from '../../lib/friends';
import { slugifyHandle } from '../../lib/profileService';

interface FriendsNetworkProps {
  card: string;
  isPearl: boolean;
  displayName: string;
  handle?: string;
  friendCode: string;
  onHandleChange?: (handle: string) => void;
  onFriendAdded?: () => void;
}

export function FriendsNetwork({
  card,
  isPearl,
  displayName,
  handle = '',
  friendCode,
  onHandleChange,
  onFriendAdded,
}: FriendsNetworkProps) {
  const { addToast } = useToast();
  const [query, setQuery] = useState('');
  const [code, setCode] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);
  const [hits, setHits] = useState<DreamerHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteBusy, setInviteBusy] = useState<InviteChannel | null>(null);
  const [copiedHandle, setCopiedHandle] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [handleDraft, setHandleDraft] = useState(handle.replace(/^@/, ''));

  useEffect(() => {
    setHandleDraft(handle.replace(/^@/, ''));
  }, [handle]);

  const refresh = useCallback(async () => {
    try {
      const next = await listFriendships();
      setFriends((prev) => (next.length > 0 ? next : prev));
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Could not load friends.' });
    } finally {
      setLoadingList(false);
    }
  }, [addToast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const next = await searchDreamers(q);
        if (!cancelled) setHits(next);
      } catch (err) {
        if (!cancelled) {
          addToast({ type: 'error', message: err instanceof Error ? err.message : 'Search failed.' });
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, addToast]);

  const rememberFriend = (row: FriendRow) => {
    setFriends((prev) => {
      if (prev.some((item) => item.profileId === row.profileId && item.status === row.status)) return prev;
      return [row, ...prev.filter((item) => item.profileId !== row.profileId)];
    });
  };

  const finishAdd = async (friend: DreamerHit) => {
    rememberFriend(friendRowFromHit(friend, 'accepted'));
    addToast({ type: 'success', message: `${friend.displayName} is in your friends list.` });
    onFriendAdded?.();
    setQuery('');
    setHits([]);
    await refresh();
  };

  const handleConnectCode = async (raw = code) => {
    if (!raw.trim()) {
      addToast({ type: 'warning', message: 'Paste a friend code, or search a username above.' });
      return;
    }
    setCodeBusy(true);
    try {
      const friend = await connectByFriendCode(raw);
      await finishAdd(friend);
      setCode('');
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Could not add that code.' });
    } finally {
      setCodeBusy(false);
    }
  };

  const handleAdd = async (hit: DreamerHit) => {
    setAddingId(hit.id);
    try {
      if (looksLikeFriendCode(query) && hit.friendCode) {
        await handleConnectCode(hit.friendCode);
        return;
      }
      const friend = await addFriendById(hit.id);
      await finishAdd(friend);
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Could not add that person.' });
    } finally {
      setAddingId(null);
    }
  };

  const handleSearchSubmit = async () => {
    const raw = query.trim();
    if (normalizeHandle(raw).length < 2) {
      addToast({ type: 'warning', message: 'Type a username like @luna.' });
      return;
    }
    if (looksLikeFriendCode(raw)) {
      await handleConnectCode(raw);
      return;
    }
    const exact = hits.find((hit) => normalizeHandle(hit.handle || '') === normalizeHandle(raw));
    if (exact) {
      await handleAdd(exact);
      return;
    }
    if (hits.length === 1) {
      await handleAdd(hits[0]);
      return;
    }
    setAddingId('search');
    try {
      const friend = await connectByHandle(raw);
      await finishAdd(friend);
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'No one with that username. Pick someone from the list.',
      });
    } finally {
      setAddingId(null);
    }
  };

  const handleRespond = async (row: FriendRow, accept: boolean) => {
    try {
      await respondToFriendRequest(row.id, accept);
      addToast({ type: 'success', message: accept ? `You and ${row.name} are friends.` : 'Request declined.' });
      if (accept) onFriendAdded?.();
      await refresh();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Could not update request.' });
    }
  };

  const handleInvite = async (channel: InviteChannel) => {
    if (channel === 'email' && !inviteEmail.trim()) {
      addToast({ type: 'warning', message: 'Enter an email address, or use WhatsApp / Messages / X.' });
      return;
    }
    if (channel === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())) {
      addToast({ type: 'warning', message: 'That email does not look right.' });
      return;
    }
    setInviteBusy(channel);
    try {
      const { url } = await createFriendInvite(channel, inviteEmail.trim() || undefined);
      if (channel === 'copy') {
        await navigator.clipboard.writeText(url);
        addToast({ type: 'success', message: 'Invite link copied.' });
      } else if (channel === 'native' && navigator.share) {
        await navigator.share({
          title: 'Join me on EverDream',
          text: `${displayName || 'A friend'} invited you to EverDream.`,
          url,
        });
      } else {
        openInviteChannel(channel, url, displayName || 'A friend', inviteEmail.trim() || undefined);
        addToast({ type: 'success', message: 'Invite opened — send it when you are ready.' });
      }
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Could not create invite.' });
    } finally {
      setInviteBusy(null);
    }
  };

  const accepted = friends.filter((f) => f.status === 'accepted');
  const incoming = friends.filter((f) => f.status === 'pending' && f.incoming);
  const outgoing = friends.filter((f) => f.status === 'pending' && !f.incoming);
  const primary = isPearl ? 'bg-[var(--aqua-deep)] text-white' : 'bg-sage text-cream';
  const field = isPearl ? 'bg-white/60 border-[var(--glass-border)]' : 'bg-parchment border-line';

  const myHandle = slugifyHandle(handleDraft || handle || displayName || 'dreamer');

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-4 ${card}`}>
        <h4 className="font-medium text-ink mb-1">Your username</h4>
        <p className="text-xs text-muted mb-3">People find you with this. Share @username, not a code.</p>
        <div className="flex gap-2">
          <div className={`flex-1 flex items-center rounded-xl border px-3 ${field}`}>
            <span className="text-muted text-sm">@</span>
            <input
              value={handleDraft}
              onChange={(e) => setHandleDraft(e.target.value.replace(/^@/, ''))}
              onBlur={() => {
                const next = slugifyHandle(handleDraft || displayName || 'dreamer');
                setHandleDraft(next);
                if (next && next !== handle) onHandleChange?.(next);
              }}
              placeholder="luna"
              className="flex-1 bg-transparent py-2.5 text-sm outline-none"
            />
          </div>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(`@${myHandle}`);
              setCopiedHandle(true);
              addToast({ type: 'success', message: `@${myHandle} copied.` });
              setTimeout(() => setCopiedHandle(false), 2000);
            }}
            className={`p-2 rounded-xl ${primary}`}
            aria-label="Copy username"
          >
            {copiedHandle ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className={`rounded-2xl border p-4 ${card}`}>
        <h4 className="font-medium text-ink mb-1">Add by username</h4>
        <p className="text-xs text-muted mb-3">Search @handle or their name, then tap Add.</p>
        <div className="flex gap-2">
          <div className={`flex-1 flex items-center gap-2 rounded-xl border px-3 ${field}`}>
            <Search className="w-4 h-4 text-muted shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSearchSubmit();
              }}
              placeholder="@luna"
              className="flex-1 bg-transparent py-2.5 text-sm outline-none"
            />
            {searching && <Loader2 className="w-4 h-4 animate-spin text-muted" />}
          </div>
          <button
            type="button"
            disabled={addingId === 'search' || normalizeHandle(query).length < 2}
            onClick={() => void handleSearchSubmit()}
            className={`px-3 py-2 rounded-xl text-sm font-medium ${primary} disabled:opacity-50`}
          >
            {addingId === 'search' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
          </button>
        </div>
        {query.trim().length >= 2 && !searching && hits.length === 0 && (
          <p className="text-xs text-muted mt-3">
            No one on EverDream has that username yet. Invite them below.
          </p>
        )}
        <div className="mt-3 space-y-2">
          {hits.map((hit) => (
            <div key={hit.id} className="flex items-center gap-3">
              {hit.avatarUrl ? (
                <img src={hit.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-sage/15 flex items-center justify-center">
                  <User className="w-5 h-5 text-muted" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{hit.displayName}</p>
                <p className="text-xs text-muted truncate">
                  {hit.handle ? `@${hit.handle}` : 'No username yet'}
                </p>
              </div>
              <button
                type="button"
                disabled={addingId === hit.id}
                onClick={() => void handleAdd(hit)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium ${primary} disabled:opacity-50`}
              >
                {addingId === hit.id ? 'Adding…' : 'Add'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className={`rounded-2xl border p-4 ${card}`}>
        <h4 className="font-medium text-ink mb-1">Invite friends</h4>
        <p className="text-xs text-muted mb-3">
          They do not need an account yet. Send an email or a DM with your invite link.
        </p>
        <div className="flex gap-2 mb-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="friend@email.com"
            className={`flex-1 px-3 py-2 rounded-xl text-sm border outline-none ${field}`}
          />
          <button
            type="button"
            disabled={inviteBusy === 'email'}
            onClick={() => void handleInvite('email')}
            className={`px-3 py-2 rounded-xl text-sm font-medium ${primary} disabled:opacity-50`}
          >
            {inviteBusy === 'email' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { id: 'whatsapp' as const, label: 'WhatsApp', icon: MessageCircle },
              { id: 'sms' as const, label: 'Messages', icon: MessageCircle },
              { id: 'twitter' as const, label: 'X / Twitter', icon: Share2 },
              { id: 'native' as const, label: 'More apps', icon: Share2 },
              { id: 'copy' as const, label: 'Copy link', icon: Copy },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={inviteBusy === item.id}
              onClick={() => void handleInvite(item.id)}
              className="flex items-center gap-2 rounded-xl border border-line bg-parchment/70 px-3 py-2 text-xs font-medium text-ink hover:bg-parchment disabled:opacity-50"
            >
              {inviteBusy === item.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <item.icon className="w-3.5 h-3.5" />
              )}
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`rounded-2xl border p-4 ${card}`}>
        <button
          type="button"
          onClick={() => setShowCode((open) => !open)}
          className="w-full flex items-center justify-between text-left"
        >
          <h4 className="font-medium text-ink">Have a friend code?</h4>
          <span className="text-xs text-muted">{showCode ? 'Hide' : 'Show'}</span>
        </button>
        {showCode && (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-muted">Optional. Username search is the usual way.</p>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleConnectCode();
                }}
                placeholder="DREAM-AB12CD"
                className={`flex-1 px-3 py-2 rounded-xl text-sm font-mono border outline-none ${field}`}
              />
              <button
                type="button"
                disabled={codeBusy}
                onClick={() => void handleConnectCode()}
                className={`px-3 py-2 rounded-xl text-sm font-medium ${primary} disabled:opacity-50`}
              >
                {codeBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect'}
              </button>
            </div>
            {friendCode && (
              <div className="flex items-center gap-2">
                <code className={`flex-1 px-3 py-2 rounded-xl text-xs font-mono ${isPearl ? 'bg-white/60' : 'bg-parchment'}`}>
                  Yours: {friendCode}
                </code>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(friendCode);
                    setCopiedCode(true);
                    addToast({ type: 'success', message: 'Friend code copied.' });
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className={`p-2 rounded-xl ${primary}`}
                >
                  {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={`rounded-2xl border p-4 ${card}`}>
        <h4 className="font-medium text-ink mb-3">Friends</h4>
        {loadingList ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <div className="space-y-4">
            {incoming.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted mb-2">Requests</p>
                {incoming.map((row) => (
                  <div key={row.id} className="flex items-center gap-3">
                    <UserPlus className="w-5 h-5 text-duskDeep" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{row.name}</p>
                      <p className="text-xs text-muted">Wants to connect</p>
                    </div>
                    <button type="button" onClick={() => void handleRespond(row, true)} className={`px-2.5 py-1 rounded-lg text-xs ${primary}`}>
                      Accept
                    </button>
                    <button type="button" onClick={() => void handleRespond(row, false)} className="px-2.5 py-1 rounded-lg text-xs border border-line">
                      Decline
                    </button>
                  </div>
                ))}
              </div>
            )}
            {outgoing.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted mb-2">Waiting</p>
                {outgoing.map((row) => (
                  <div key={row.id} className="flex items-center gap-3 opacity-80">
                    <Plus className="w-5 h-5 text-muted" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{row.name}</p>
                      <p className="text-xs text-muted">Request sent — they still need to accept</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {accepted.map((row) => (
              <div key={row.id} className="flex items-center gap-3">
                {row.avatarUrl ? (
                  <img src={row.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-sage/15 flex items-center justify-center">
                    <User className="w-5 h-5 text-muted" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{row.name}</p>
                  <p className="text-xs text-muted">{row.handle ? `@${row.handle}` : 'Friend'}</p>
                </div>
              </div>
            ))}
            {friends.length === 0 && (
              <p className="text-sm text-muted py-3 text-center">
                No friends yet. Search their @username above, or send an invite.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
