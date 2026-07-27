import { useRef, useState } from 'react';
import {
  User,
  Sparkles,
  Link as LinkIcon,
  Users,

  Camera,
  Plus,
  Music,
  Instagram,
  Watch,
  Share2,
  ChevronRight,
  Copy,
  Check,
  X,
  Loader2,
  LogOut,
} from 'lucide-react';
import { useSkinFull } from '../contexts/SkinContext';
import { useToast } from '../components/ui/Toast';
import { useProfile } from '../hooks/useProfile';
import { useAuth } from '../hooks/use-auth';
import { slugifyHandle, type InterestSource } from '../lib/profileService';
import {
  isSocialLinked,
  PROFILE_SOCIAL_PROVIDERS,
  type SocialInterestSource,
} from '../lib/social/profileSignals';
import type { RouteScreen } from '../hooks/useHashRoute';

interface ProfileHubProps {
  onClose: () => void;
  navigate: (screen: RouteScreen) => void;
  /** Fired when user successfully sends a friend request (achievements) */
  onFriendAdded?: () => void;
}

interface Friend {
  id: string;
  name: string;
  sharedDreams: number;
}

const friends: Friend[] = []; // real friends only — never placeholders

function sourceBadge(source: InterestSource | undefined): { label: string; className: string } | null {
  if (!source || source === 'manual') return null;
  if (source === 'onboarding') {
    return { label: 'Onboarding', className: 'bg-parchment text-muted border-line' };
  }
  if (source === 'spotify') {
    return { label: 'Spotify', className: 'bg-[#1DB954]/15 text-[#0d8a3a] border-[#1DB954]/30' };
  }
  if (source === 'meta') {
    return { label: 'Meta', className: 'bg-[#1877F2]/12 text-[#166fe5] border-[#1877F2]/30' };
  }
  return null;
}

export function ProfileHub({ onClose, navigate, onFriendAdded }: ProfileHubProps) {
  const { isPearl } = useSkinFull();
  const { addToast } = useToast();
  const { user: authUser, signOut } = useAuth();
  const {
    profile,
    loading,
    saving,
    updateField,
    setAvatar,
    addInterest,
    removeInterest,
    addDreamGoal,
    removeDreamGoal,
    connectSocialAndImport,
    disconnectSocial,
  } = useProfile();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'profile' | 'friends' | 'more'>('profile');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showShareProfile, setShowShareProfile] = useState(false);
  const [friendCode, setFriendCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [newInterest, setNewInterest] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [showAddInterest, setShowAddInterest] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [socialBusy, setSocialBusy] = useState<SocialInterestSource | null>(null);

  const card = isPearl ? 'border-[var(--glass-border)] bg-[var(--glass-bg)]' : 'border-line bg-cream';

  const handleConnectSocial = async (provider: SocialInterestSource) => {
    setSocialBusy(provider);
    try {
      if (isSocialLinked(provider)) {
        await disconnectSocial(provider);
        addToast({ type: 'info', message: `${provider === 'spotify' ? 'Spotify' : 'Meta'} disconnected — related interests removed.` });
      } else {
        const signals = await connectSocialAndImport(provider);
        addToast({
          type: 'success',
          message: `Linked ${provider === 'spotify' ? 'Spotify' : 'Meta'} — added ${signals.length} interest${signals.length === 1 ? '' : 's'} from your tastes.`,
        });
      }
    } catch {
      addToast({ type: 'error', message: 'Could not update social connection.' });
    } finally {
      setSocialBusy(null);
    }
  };

  const handleAddFriend = () => {
    if (!friendCode.trim()) {
      addToast({ type: 'warning', message: 'Please enter a friend code.' });
      return;
    }
    addToast({ type: 'success', message: `Friend request sent to ${friendCode}!` });
    onFriendAdded?.();
    setShowAddFriend(false);
    setFriendCode('');
  };

  const handleCopyFriendCode = async () => {
    if (!profile?.friendCode) return;
    try {
      await navigator.clipboard.writeText(profile.friendCode);
      setCopiedCode(true);
      addToast({ type: 'success', message: 'Friend code copied!' });
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      addToast({ type: 'error', message: 'Could not copy ÔÇö try selecting manually.' });
    }
  };

  const handleShareProfile = async () => {
    if (authUser?.isAnonymous) {
      addToast({
        type: 'warning',
        message: 'Create an account to share your profile publicly.',
      });
      return;
    }
    if (!profile) return;

    const profileUrl = `${window.location.origin}${window.location.pathname}#/profile/${profile.handle}`;
    const shareText = `Check out my EverDream profile: @${profile.displayName}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'My EverDream Profile', text: shareText, url: profileUrl });
        return;
      } catch {
        // cancelled
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareText}\n${profileUrl}`);
      addToast({ type: 'success', message: 'Profile link copied to clipboard!' });
    } catch {
      setShowShareProfile(true);
    }
  };

  const handleAvatarChange = async (file: File) => {
    setUploadingAvatar(true);
    try {
      await setAvatar(file);
      addToast({ type: 'success', message: 'Profile photo updated!' });
    } catch {
      addToast({ type: 'error', message: 'Failed to upload photo.' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      onClose();
      window.location.hash = '';
      window.location.replace(`${window.location.pathname}${window.location.search}`);
      addToast({ type: 'success', message: 'Signed out. See you next time.' });
    } catch (err) {
      console.error('Logout failed', err);
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Could not sign out. Try again.',
      });
    }
  };

  if (loading || !profile) {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center ${isPearl ? 'bg-[rgba(247,245,255,0.98)]' : 'bg-cream/98'}`}>
        <Loader2 className="w-8 h-8 text-sage animate-spin" />
      </div>
    );
  }

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div className={`rounded-3xl border p-6 text-center ${card}`}>
        <div className="relative inline-block">
          {profile.avatarUrl &&
          (!profile.authUserId || !authUser?.id || profile.authUserId === authUser.id) ? (
            <img
              key={`${authUser?.id || 'anon'}-${profile.avatarUrl}`}
              src={profile.avatarUrl}
              alt=""
              className={`w-24 h-24 rounded-full border-4 object-cover ${isPearl ? 'border-[var(--aqua-deep)]/30' : 'border-sage/30'}`}
            />
          ) : (
            <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center overflow-hidden ${isPearl ? 'border-[var(--aqua-deep)]/30 bg-gradient-to-br from-[var(--aqua-light)] to-white' : 'border-sage/30 bg-gradient-to-br from-sage/20 to-parchment'}`}>
              <User className="w-12 h-12 text-muted" strokeWidth={1.5} />
            </div>
          )}
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute bottom-0 right-0 p-2 rounded-full bg-sage text-cream shadow-lift hover:bg-sageDark transition disabled:opacity-50"
          >
            {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" strokeWidth={2} />}
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAvatarChange(file);
              e.target.value = '';
            }}
          />
        </div>
        <input
          type="text"
          value={profile.displayName}
          onChange={(e) => {
            updateField('displayName', e.target.value);
            updateField('handle', slugifyHandle(e.target.value));
          }}
          className="mt-4 text-xl font-serif font-medium text-ink bg-transparent border-b-2 border-transparent focus:border-sage outline-none text-center w-full"
          placeholder="Your pseudonym"
        />
        <p className="text-xs text-muted mt-1">@{profile.handle}</p>
        {saving && <p className="text-xs text-sage mt-1">Saving...</p>}

        <button
          type="button"
          onClick={handleShareProfile}
          className={`mt-4 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium mx-auto ${isPearl ? 'bg-[var(--aqua-deep)] text-white' : 'bg-sage text-cream'}`}
        >
          <Share2 className="w-3.5 h-3.5" />
          Share Profile
        </button>
      </div>

      <div className={`rounded-2xl border p-4 ${card}`}>
        <label className="text-xs uppercase tracking-wider text-muted font-medium">Bio</label>
        <textarea
          value={profile.bio}
          onChange={(e) => updateField('bio', e.target.value)}
          className="mt-2 w-full bg-transparent text-sm text-ink leading-relaxed outline-none resize-none"
          rows={3}
          placeholder="Tell us about your dream journey..."
        />
      </div>

      <div className={`rounded-2xl border p-4 ${card}`}>
        <label className="text-xs uppercase tracking-wider text-muted font-medium">Interests</label>
        <p className="text-[11px] text-muted mt-1 mb-2">
          From onboarding, what you add, and linked social tastes (Spotify / Meta).
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {profile.interests.length === 0 && (
            <p className="w-full text-xs text-muted mb-1">
              No interests yet — complete onboarding, connect Spotify/Meta, or add your own.
            </p>
          )}
          {profile.interests.map((interest) => {
            const badge = sourceBadge(profile.interestSources?.[interest]);
            return (
              <span
                key={interest}
                className={`inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-xs font-medium border ${
                  isPearl
                    ? 'bg-[var(--aqua-light)]/30 text-[var(--aqua-deep)] border-[var(--glass-border)]'
                    : 'bg-sage/15 text-sageDark border-sage/20'
                }`}
              >
                <span>{interest}</span>
                {badge && (
                  <span className={`text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${badge.className}`}>
                    {badge.label}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void removeInterest(interest)}
                  className="p-0.5 rounded-full hover:bg-black/5 text-muted"
                  aria-label={`Remove ${interest}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
          <button
            type="button"
            onClick={() => setShowAddInterest(true)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 border-dashed ${isPearl ? 'border-[var(--glass-border)] text-muted' : 'border-line text-muted'}`}
          >
            <Plus className="w-3 h-3 inline mr-1" />
            Add
          </button>
        </div>
        {showAddInterest && (
          <div className="mt-3 flex gap-2">
            <input
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              placeholder="New interest"
              className={`flex-1 px-3 py-2 rounded-xl text-sm border outline-none ${isPearl ? 'bg-white/60 border-[var(--glass-border)]' : 'bg-parchment border-line'}`}
            />
            <button
              type="button"
              onClick={async () => {
                await addInterest(newInterest, 'manual');
                setNewInterest('');
                setShowAddInterest(false);
              }}
              className={`px-3 py-2 rounded-xl text-sm font-medium ${isPearl ? 'bg-[var(--aqua-deep)] text-white' : 'bg-sage text-cream'}`}
            >
              Add
            </button>
          </div>
        )}
      </div>

      {/* Social tastes — Tinder-style import */}
      <div className={`rounded-2xl border p-4 ${card}`}>
        <label className="text-xs uppercase tracking-wider text-muted font-medium flex items-center gap-2">
          <LinkIcon className="w-3.5 h-3.5" />
          Social tastes
        </label>
        <p className="text-[11px] text-muted mt-1 mb-3">
          Connect accounts to pull genres and categories onto your profile — like Spotify interests on Tinder.
        </p>
        <div className="space-y-2">
          {PROFILE_SOCIAL_PROVIDERS.map((p) => {
            const linked = isSocialLinked(p.id);
            const busy = socialBusy === p.id;
            const Icon = p.id === 'spotify' ? Music : Instagram;
            const color = p.id === 'spotify' ? '#1DB954' : '#1877F2';
            return (
              <button
                key={p.id}
                type="button"
                disabled={!!socialBusy}
                onClick={() => void handleConnectSocial(p.id)}
                className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                  linked ? 'border-sage/40 bg-sage/5' : 'border-line hover:bg-parchment/60'
                }`}
              >
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `${color}18`, color }}
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-ink">{p.name}</span>
                  <span className="block text-[11px] text-muted">{p.description}</span>
                </span>
                <span
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                    linked ? 'bg-sage text-cream' : 'bg-parchment text-muted'
                  }`}
                >
                  {linked ? 'Connected' : 'Connect'}
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => {
            onClose();
            navigate('wearables');
          }}
          className="mt-3 w-full flex items-center gap-3 rounded-xl border border-line p-3 text-left hover:bg-parchment/60 transition"
        >
          <span className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-500/10 text-purple-700 shrink-0">
            <Watch className="w-4 h-4" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-medium text-ink">Wearables</span>
            <span className="block text-[11px] text-muted">Sleep data from Oura, Apple Watch, and more</span>
          </span>
          <ChevronRight className="w-4 h-4 text-muted" />
        </button>
      </div>

      <div className={`rounded-2xl border p-4 ${card}`}>
        <label className="text-xs uppercase tracking-wider text-muted font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Dream Goals
        </label>
        <p className="text-[11px] text-muted mt-1 mb-2">
          Filled from onboarding — edit anytime.
        </p>
        <div className="mt-2 space-y-2">
          {profile.dreamGoals.length === 0 && (
            <p className="text-xs text-muted">No goals yet — finish onboarding or add one below.</p>
          )}
          {profile.dreamGoals.map((goal) => (
            <div key={goal} className="flex items-center gap-3 group">
              <div className={`w-2 h-2 rounded-full shrink-0 ${isPearl ? 'bg-[var(--aqua-deep)]' : 'bg-sage'}`} />
              <span className="text-sm text-ink flex-1">{goal}</span>
              <button
                type="button"
                onClick={() => void removeDreamGoal(goal)}
                className="p-1 rounded-full text-muted opacity-60 hover:opacity-100 hover:bg-parchment"
                aria-label={`Remove ${goal}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setShowAddGoal(true)}
            className={`mt-2 flex items-center gap-2 text-xs font-medium ${isPearl ? 'text-[var(--aqua-deep)]' : 'text-sage'}`}
          >
            <Plus className="w-3 h-3" />
            Add a goal
          </button>
        </div>
        {showAddGoal && (
          <div className="mt-3 flex gap-2">
            <input
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              placeholder="New dream goal"
              className={`flex-1 px-3 py-2 rounded-xl text-sm border outline-none ${isPearl ? 'bg-white/60 border-[var(--glass-border)]' : 'bg-parchment border-line'}`}
            />
            <button
              type="button"
              onClick={async () => {
                await addDreamGoal(newGoal);
                setNewGoal('');
                setShowAddGoal(false);
              }}
              className={`px-3 py-2 rounded-xl text-sm font-medium ${isPearl ? 'bg-[var(--aqua-deep)] text-white' : 'bg-sage text-cream'}`}
            >
              Add
            </button>
          </div>
        )}
      </div>

    </div>
  );

  const renderNetworkTab = () => (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-4 ${card}`}>
        <h4 className="font-medium text-ink mb-2">Your Friend Code</h4>
        <p className="text-xs text-muted mb-3">Share this code so friends can connect with you.</p>
        <div className="flex items-center gap-2">
          <code className={`flex-1 px-3 py-2 rounded-xl text-sm font-mono ${isPearl ? 'bg-white/60' : 'bg-parchment'}`}>
            {profile.friendCode}
          </code>
          <button type="button" onClick={handleCopyFriendCode} className={`p-2 rounded-xl ${isPearl ? 'bg-[var(--aqua-deep)] text-white' : 'bg-sage text-cream'}`}>
            {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className={`rounded-2xl border p-4 ${card}`}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-ink">Friends</h4>
          <button
            type="button"
            onClick={() => setShowAddFriend(!showAddFriend)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium ${isPearl ? 'bg-[var(--aqua-deep)] text-white' : 'bg-sage text-cream'}`}
          >
            <Plus className="w-3 h-3" />
            Add Friend
          </button>
        </div>
        {showAddFriend && (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={friendCode}
              onChange={(e) => setFriendCode(e.target.value)}
              placeholder="Enter friend code"
              className={`flex-1 px-3 py-2 rounded-xl text-sm border outline-none ${isPearl ? 'bg-white/60 border-[var(--glass-border)]' : 'bg-parchment border-line'}`}
            />
            <button type="button" onClick={handleAddFriend} className={`px-4 py-2 rounded-xl text-sm font-medium ${isPearl ? 'bg-[var(--aqua-deep)] text-white' : 'bg-sage text-cream'}`}>
              Send
            </button>
          </div>
        )}
        <div className="mt-4 space-y-3">
          {friends.length === 0 ? (
            <p className="text-sm text-muted py-4 text-center">
              No friends connected yet. Share your friend code when you&apos;re ready — we never show fake people here.
            </p>
          ) : (
            friends.map((friend) => (
              <div key={friend.id} className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPearl ? 'bg-[var(--aqua-light)]/30' : 'bg-sage/20'}`}>
                  <User className="w-5 h-5 text-muted" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-medium text-ink truncate">{friend.name}</h5>
                  <p className="text-xs text-muted">{friend.sharedDreams} shared dreams</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`fixed inset-0 z-50 ${isPearl ? 'bg-[rgba(247,245,255,0.98)]' : 'bg-cream/98'} backdrop-blur-md`}>
      {showShareProfile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className={`rounded-2xl border p-5 max-w-sm w-full ${card}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-ink">Share Profile</h3>
              <button type="button" onClick={() => setShowShareProfile(false)} className="p-1 rounded-full hover:bg-sage/10">
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>
            <code className="block text-xs p-2 rounded-lg bg-parchment break-all">
              {`${window.location.origin}${window.location.pathname}#/profile/${profile.handle}`}
            </code>
            <button
              type="button"
              onClick={async () => {
                const url = `${window.location.origin}${window.location.pathname}#/profile/${profile.handle}`;
                await navigator.clipboard.writeText(url);
                addToast({ type: 'success', message: 'Link copied!' });
                setShowShareProfile(false);
              }}
              className={`mt-3 w-full py-2 rounded-xl text-sm font-medium ${isPearl ? 'bg-[var(--aqua-deep)] text-white' : 'bg-sage text-cream'}`}
            >
              Copy Link
            </button>
          </div>
        </div>
      )}

      <div className={`sticky top-0 z-10 border-b backdrop-blur-md ${isPearl ? 'border-[var(--glass-border)] bg-[rgba(247,245,255,0.92)]' : 'border-line bg-cream/95'}`}>
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-sage/10 transition">
            <ChevronRight className="w-6 h-6 text-ink rotate-180" strokeWidth={1.75} />
          </button>
          <h1 className="text-lg font-serif font-medium text-ink">Profile</h1>
          <div className="w-10" aria-hidden /> {/* balance for hidden cog */}
        </div>
      </div>

      <div className={`sticky top-[61px] z-10 border-b backdrop-blur-md ${isPearl ? 'border-[var(--glass-border)] bg-[rgba(247,245,255,0.98)]' : 'border-line bg-cream/98'}`}>
        <div className="max-w-lg mx-auto px-4">
          <div className="flex gap-1 py-2">
            {[
              { id: 'profile' as const, label: 'Profile', icon: User },
              { id: 'friends' as const, label: 'Friends', icon: Users },
              { id: 'more' as const, label: 'More', icon: LinkIcon },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (id === 'more') {
                    onClose();
                    navigate('more');
                    return;
                  }
                  setActiveTab(id);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-medium transition ${
                  activeTab === id
                    ? isPearl ? 'bg-[var(--aqua-deep)] text-white' : 'bg-sage text-cream'
                    : isPearl ? 'text-[var(--text-label)]' : 'text-muted hover:text-ink'
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={1.75} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto flex flex-col" style={{ height: 'calc(100vh - 140px)' }}>
        <div className="flex-1 overflow-y-auto px-4 py-5">
          {activeTab === 'profile' && renderProfileTab()}
          {activeTab === 'friends' && renderNetworkTab()}
        </div>

        <div className={`shrink-0 px-4 py-4 border-t ${isPearl ? 'border-[var(--glass-border)] bg-[rgba(247,245,255,0.98)]' : 'border-line bg-cream/98'}`}>
          <button
            type="button"
            onClick={handleLogout}
            className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-semibold transition shadow-paper ${
              isPearl
                ? 'border-2 border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                : 'border-2 border-rose-200/80 bg-rose-50/90 text-rose-700 hover:bg-rose-100 hover:border-rose-300'
            }`}
          >
            <LogOut className="w-4 h-4" strokeWidth={2} />
            Log out
          </button>
          <p className="text-center text-[11px] text-muted mt-2">
            Returns you to the sign-in screen
          </p>
        </div>
      </div>
    </div>
  );
}
