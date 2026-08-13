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
  createFriendInvite,
  listFriendships,
  openInviteChannel,
  respondToFriendRequest,
  searchDreamers,
  sendFriendRequest,
  connectByFriendCode,
  type DreamerHit,
  type FriendRow,
  type InviteChannel,
} from '../../lib/friends';

interface FriendsNetworkProps {
  card: string;
  isPearl: boolean;
  displayName: string;
  friendCode: string;
  onFriendAdded?: () => void;
}

export function FriendsNetwork({
  card,
  isPearl,
  displayName,
  friendCode,
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
  const [copiedCode, setCopiedCode] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setFriends(await listFriendships());
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

  const handleConnectCode = async () => {
    if (!code.trim()) {
      addToast({ type: 'warning', message: 'Paste a friend code like DREAM-AB12CD.' });
      return;
    }
    setCodeBusy(true);
    try {
      const friend = await connectByFriendCode(code);
      addToast({ type: 'success', message: `${friend.displayName} is now in your friends list.` });
      onFriendAdded?.();
      setCode('');
      await refresh();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Could not add that code.' });
    } finally {
      setCodeBusy(false);
    }
  };

  const handleAdd = async (hit: DreamerHit) => {
    setAddingId(hit.id);
    try {
      await sendFriendRequest(hit.id);
      addToast({ type: 'success', message: `Request sent to @${hit.handle || hit.displayName}.` });
      onFriendAdded?.();
      setQuery('');
      setHits([]);
      await refresh();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Could not send request.' });
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

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-4 ${card}`}>
        <h4 className="font-medium text-ink mb-1">Add with a friend code</h4>
        <p className="text-xs text-muted mb-3">This connects you immediately — they already shared their code with you.</p>
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
      </div>

      <div className={`rounded-2xl border p-4 ${card}`}>
        <h4 className="font-medium text-ink mb-1">Find by username</h4>
        <p className="text-xs text-muted mb-3">Search @handle, display name, or a friend code.</p>
        <div className={`flex items-center gap-2 rounded-xl border px-3 ${field}`}>
          <Search className="w-4 h-4 text-muted shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search @luna or DREAM-AB12"
            className="flex-1 bg-transparent py-2.5 text-sm outline-none"
          />
          {searching && <Loader2 className="w-4 h-4 animate-spin text-muted" />}
        </div>
        {query.trim().length >= 2 && !searching && hits.length === 0 && (
          <p className="text-xs text-muted mt-3">
            No one on EverDream matches that yet. Invite them below.
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
                  {hit.handle ? `@${hit.handle}` : hit.friendCode}
                </p>
              </div>
              <button
                type="button"
                disabled={addingId === hit.id}
                onClick={() => void handleAdd(hit)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium ${primary} disabled:opacity-50`}
              >
                {addingId === hit.id ? 'Sending…' : 'Add'}
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
        <h4 className="font-medium text-ink mb-2">Your friend code</h4>
        <div className="flex items-center gap-2">
          <code className={`flex-1 px-3 py-2 rounded-xl text-sm font-mono ${isPearl ? 'bg-white/60' : 'bg-parchment'}`}>
            {friendCode || '—'}
          </code>
          <button
            type="button"
            onClick={async () => {
              if (!friendCode) return;
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
                No friends yet. Search a username or send an invite.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
