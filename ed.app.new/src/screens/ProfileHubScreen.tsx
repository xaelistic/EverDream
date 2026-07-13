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
import { slugifyHandle } from '../lib/profileService';

interface ProfileHubProps {
  onClose: () => void;
  navigate: (screen: string) => void;
}

interface ServiceCard {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  screen?: string;
  comingSoon?: boolean;
}

interface Friend {
  id: string;
  name: string;
  sharedDreams: number;
}

const services: ServiceCard[] = [
  {
    id: 'wearables',
    name: 'Wearables',
    description: 'Oura, Apple Watch, Garmin, Fitbit & more',
    icon: <Watch className="w-5 h-5" />,
    color: '#7C3AED',
    screen: 'wearables',
  },
  {
    id: 'spotify',
    name: 'Spotify',
    description: 'Sleep playlists & audio journals',
    icon: <Music className="w-5 h-5" />,
    color: '#1DB954',
    comingSoon: true,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Share reflections & dream visuals',
    icon: <Instagram className="w-5 h-5" />,
    color: '#E4405F',
    comingSoon: true,
  },
];

const friends: Friend[] = [
  { id: '1', name: 'Luna', sharedDreams: 12 },
  { id: '2', name: 'Orpheus', sharedDreams: 8 },
  { id: '3', name: 'Somnus', sharedDreams: 5 },
];

export function ProfileHub({ onClose, navigate }: ProfileHubProps) {
  const { isPearl } = useSkinFull();
  const { addToast } = useToast();
  const { user: authUser, signOut } = useAuth();
  const { profile, loading, saving, updateField, setAvatar, addInterest, addDreamGoal } = useProfile();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'profile' | 'services' | 'network'>('profile');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showShareProfile, setShowShareProfile] = useState(false);
  const [friendCode, setFriendCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [newInterest, setNewInterest] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [showAddInterest, setShowAddInterest] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const card = isPearl ? 'border-[var(--glass-border)] bg-[var(--glass-bg)]' : 'border-line bg-cream';

  const handleServiceAction = (service: ServiceCard) => {
    if (service.screen) {
      onClose();
      navigate(service.screen);
      return;
    }
    if (service.comingSoon) {
      addToast({ type: 'info', message: `${service.name} coming soon!` });
    }
  };

  const handleAddFriend = () => {
    if (!friendCode.trim()) {
      addToast({ type: 'warning', message: 'Please enter a friend code.' });
      return;
    }
    addToast({ type: 'success', message: `Friend request sent to ${friendCode}!` });
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

  const openSettings = () => {
    onClose();
    navigate('settings');
  };

  const handleLogout = async () => {
    try {
      await signOut();
      onClose();
      window.location.hash = '';
    } catch (err) {
      console.error('Logout failed', err);
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
          {profile.avatarUrl ? (
            <img
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
        <div className="mt-3 flex flex-wrap gap-2">
          {profile.interests.map((interest) => (
            <span key={interest} className={`px-3 py-1.5 rounded-full text-xs font-medium ${isPearl ? 'bg-[var(--aqua-light)]/30 text-[var(--aqua-deep)]' : 'bg-sage/20 text-sageDark'}`}>
              {interest}
            </span>
          ))}
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
                await addInterest(newInterest);
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

      <div className={`rounded-2xl border p-4 ${card}`}>
        <label className="text-xs uppercase tracking-wider text-muted font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Dream Goals
        </label>
        <div className="mt-3 space-y-2">
          {profile.dreamGoals.map((goal) => (
            <div key={goal} className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${isPearl ? 'bg-[var(--aqua-deep)]' : 'bg-sage'}`} />
              <span className="text-sm text-ink">{goal}</span>
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

    <>
    {/* Logout button on the profile screen */}
    <div>
      <button
        type="button"
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border border-line text-muted hover:text-rose-600 hover:bg-rose-50/50 transition"
      >
        <LogOut className="w-4 h-4" />
        Log out
      </button>
    </div>
    </>
  );

  const renderServicesTab = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted">Connect services to enrich your dream and sleep insights.</p>
      {services.map((service) => (
        <button
          key={service.id}
          type="button"
          onClick={() => handleServiceAction(service)}
          className={`w-full flex items-center gap-4 rounded-2xl border p-4 text-left transition ${card} hover:bg-parchment/80`}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: `${service.color}20` }}>
            <div style={{ color: service.color }}>{service.icon}</div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-ink">{service.name}</h4>
            <p className="text-xs text-muted">{service.description}</p>
          </div>
          {service.screen ? (
            <ChevronRight className="w-5 h-5 text-muted shrink-0" />
          ) : (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-parchment text-muted shrink-0">Soon</span>
          )}
        </button>
      ))}
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
          {friends.map((friend) => (
            <div key={friend.id} className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPearl ? 'bg-[var(--aqua-light)]/30' : 'bg-sage/20'}`}>
                <User className="w-5 h-5 text-muted" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="text-sm font-medium text-ink truncate">{friend.name}</h5>
                <p className="text-xs text-muted">{friend.sharedDreams} shared dreams</p>
              </div>
            </div>
          ))}
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
              { id: 'profile', label: 'Profile', icon: User },
              { id: 'services', label: 'Services', icon: LinkIcon },
              { id: 'network', label: 'Network', icon: Users },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id as typeof activeTab)}
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

      <div className="max-w-lg mx-auto px-4 py-5 pb-8 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
        {activeTab === 'profile' && renderProfileTab()}
        {activeTab === 'services' && renderServicesTab()}
        {activeTab === 'network' && renderNetworkTab()}
      </div>
    </div>
  );
}
