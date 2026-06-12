import { useState } from 'react';
import { 
  User, 
  Sparkles, 
  Link as LinkIcon, 
  Users, 
  Settings as SettingsIcon,
  Camera,
  Save,
  Plus,
  Music,
  Instagram,
  Activity,
  Heart,
  Share2,
  LogOut,
  Shield,
  Bell,
  Moon,
  Palette,
  Database,
  Trash2,
  Download,
  ChevronRight,
  Globe
} from 'lucide-react';
import { useSkinFull } from '../contexts/SkinContext';

interface ProfileHubProps {
  onClose: () => void;
  navigate: (screen: string) => void;
}

interface IntegrationCard {
  id: string;
  name: string;
  icon: React.ReactNode;
  connected: boolean;
  color: string;
}

interface Friend {
  id: string;
  name: string;
  avatar?: string;
  sharedDreams: number;
}

export function ProfileHub({ onClose, navigate }: ProfileHubProps) {
  const { isPearl, setSkin } = useSkinFull();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'integrations' | 'network' | 'settings'>('profile');
  const [pseudonym, setPseudonym] = useState('DreamWalker');
  const [bio, setBio] = useState('Exploring the landscapes of sleep and subconscious...');
  const [interests, setInterests] = useState(['Lucid Dreaming', 'Psychology', 'Art', 'Meditation']);
  const [dreamGoals, setDreamGoals] = useState(['Better Sleep', 'Creative Inspiration', 'Self-Discovery']);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendCode, setFriendCode] = useState('');
  
  // Mock data for MVP
  const integrations: IntegrationCard[] = [
    { id: 'spotify', name: 'Spotify', icon: <Music className="w-5 h-5" />, connected: false, color: '#1DB954' },
    { id: 'instagram', name: 'Instagram', icon: <Instagram className="w-5 h-5" />, connected: false, color: '#E4405F' },
    { id: 'apple_health', name: 'Apple Health', icon: <Activity className="w-5 h-5" />, connected: false, color: '#FF2D55' },
    { id: 'oura', name: 'Oura Ring', icon: <Heart className="w-5 h-5" />, connected: false, color: '#7C3AED' },
  ];

  const friends: Friend[] = [
    { id: '1', name: 'Luna', avatar: undefined, sharedDreams: 12 },
    { id: '2', name: 'Orpheus', avatar: undefined, sharedDreams: 8 },
    { id: '3', name: 'Somnus', avatar: undefined, sharedDreams: 5 },
  ];

  const handleConnectIntegration = (id: string) => {
    // Simulate OAuth flow for MVP
    alert(`Connecting to ${id}...\n\n(In production, this would trigger OAuth flow)`);
  };

  const handleAddFriend = () => {
    if (friendCode.trim()) {
      alert(`Adding friend with code: ${friendCode}\n\n(In production, this would send a friend request)`);
      setShowAddFriend(false);
      setFriendCode('');
    }
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      {/* Avatar & Pseudonym */}
      <div className={`rounded-3xl border p-6 text-center ${isPearl ? 'border-[var(--glass-border)] bg-[var(--glass-bg)]' : 'border-line bg-cream'}`}>
        <div className="relative inline-block">
          <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center overflow-hidden ${isPearl ? 'border-[var(--aqua-deep)]/30 bg-gradient-to-br from-[var(--aqua-light)] to-white' : 'border-sage/30 bg-gradient-to-br from-sage/20 to-parchment'}`}>
            <User className="w-12 h-12 text-muted" strokeWidth={1.5} />
          </div>
          <button className="absolute bottom-0 right-0 p-2 rounded-full bg-sage text-cream shadow-lift hover:bg-sageDark transition">
            <Camera className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
        <input
          type="text"
          value={pseudonym}
          onChange={(e) => setPseudonym(e.target.value)}
          className="mt-4 text-xl font-serif font-medium text-ink bg-transparent border-b-2 border-transparent focus:border-sage outline-none text-center w-full"
          placeholder="Your pseudonym"
        />
        <p className="text-xs text-muted mt-1">@{pseudonym.toLowerCase().replace(/\s+/g, '_')}</p>
      </div>

      {/* Bio */}
      <div className={`rounded-2xl border p-4 ${isPearl ? 'border-[var(--glass-border)] bg-[var(--glass-bg)]' : 'border-line bg-cream'}`}>
        <label className="text-xs uppercase tracking-wider text-muted font-medium">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="mt-2 w-full bg-transparent text-sm text-ink leading-relaxed outline-none resize-none"
          rows={3}
          placeholder="Tell us about your dream journey..."
        />
      </div>

      {/* Interests */}
      <div className={`rounded-2xl border p-4 ${isPearl ? 'border-[var(--glass-border)] bg-[var(--glass-bg)]' : 'border-line bg-cream'}`}>
        <label className="text-xs uppercase tracking-wider text-muted font-medium">Interests</label>
        <div className="mt-3 flex flex-wrap gap-2">
          {interests.map((interest) => (
            <span
              key={interest}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${isPearl ? 'bg-[var(--aqua-light)]/30 text-[var(--aqua-deep)]' : 'bg-sage/20 text-sageDark'}`}
            >
              {interest}
            </span>
          ))}
          <button className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 border-dashed ${isPearl ? 'border-[var(--glass-border)] text-muted hover:text-[var(--text-primary)]' : 'border-line text-muted hover:text-ink'}`}>
            <Plus className="w-3 h-3 inline mr-1" />
            Add
          </button>
        </div>
      </div>

      {/* Dream Goals */}
      <div className={`rounded-2xl border p-4 ${isPearl ? 'border-[var(--glass-border)] bg-[var(--glass-bg)]' : 'border-line bg-cream'}`}>
        <label className="text-xs uppercase tracking-wider text-muted font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Dream Goals
        </label>
        <div className="mt-3 space-y-2">
          {dreamGoals.map((goal) => (
            <div key={goal} className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${isPearl ? 'bg-[var(--aqua-deep)]' : 'bg-sage'}`} />
              <span className="text-sm text-ink">{goal}</span>
            </div>
          ))}
          <button className={`mt-2 flex items-center gap-2 text-xs font-medium ${isPearl ? 'text-[var(--aqua-deep)]' : 'text-sage'}`}>
            <Plus className="w-3 h-3" />
            Add a goal
          </button>
        </div>
      </div>
    </div>
  );

  const renderIntegrationsTab = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted">Connect your favorite apps to enrich your dream insights.</p>
      {integrations.map((integration) => (
        <div
          key={integration.id}
          className={`flex items-center gap-4 rounded-2xl border p-4 transition ${isPearl ? 'border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-white/60' : 'border-line bg-cream hover:bg-parchment/80'}`}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: `${integration.color}20` }}
          >
            <div style={{ color: integration.color }}>
              {integration.icon}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-ink">{integration.name}</h4>
            <p className="text-xs text-muted">
              {integration.connected ? 'Connected' : 'Not connected'}
            </p>
          </div>
          <button
            onClick={() => handleConnectIntegration(integration.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              integration.connected
                ? isPearl ? 'bg-[var(--glass-border)] text-[var(--text-primary)]' : 'bg-parchment text-ink'
                : isPearl ? 'bg-[var(--aqua-deep)] text-white hover:bg-[var(--aqua)]' : 'bg-sage text-cream hover:bg-sageDark'
            }`}
          >
            {integration.connected ? 'Manage' : 'Connect'}
          </button>
        </div>
      ))}
    </div>
  );

  const renderNetworkTab = () => (
    <div className="space-y-4">
      {/* Add Friend */}
      <div className={`rounded-2xl border p-4 ${isPearl ? 'border-[var(--glass-border)] bg-[var(--glass-bg)]' : 'border-line bg-cream'}`}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-ink">Friends</h4>
          <button
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
              className={`flex-1 px-3 py-2 rounded-xl text-sm border outline-none focus:ring-2 ${isPearl ? 'bg-white/60 border-[var(--glass-border)] focus:ring-[var(--aqua-deep)]/30' : 'bg-parchment border-line focus:ring-sage/30'}`}
            />
            <button
              onClick={handleAddFriend}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${isPearl ? 'bg-[var(--aqua-deep)] text-white' : 'bg-sage text-cream'}`}
            >
              Send
            </button>
          </div>
        )}

        {/* Friends List */}
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
              <button className={`p-2 rounded-full ${isPearl ? 'hover:bg-[var(--glass-border)]' : 'hover:bg-parchment'}`}>
                <Share2 className="w-4 h-4 text-muted" strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Public Dreams Feed */}
      <div className={`rounded-2xl border p-4 ${isPearl ? 'border-[var(--glass-border)] bg-[var(--glass-bg)]' : 'border-line bg-cream'}`}>
        <h4 className="font-medium text-ink mb-3">Shared Dreams</h4>
        <p className="text-sm text-muted">Dreams shared by your network</p>
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`p-3 rounded-xl ${isPearl ? 'bg-white/40' : 'bg-parchment/60'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-6 h-6 rounded-full ${isPearl ? 'bg-[var(--aqua-light)]/50' : 'bg-sage/30'}`} />
                <span className="text-xs font-medium text-ink">Luna shared a dream</span>
              </div>
              <p className="text-xs text-muted line-clamp-2">
                Flying over crystalline cities with aurora borealis dancing above...
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-4">
      {/* Appearance */}
      <div className={`rounded-2xl border overflow-hidden ${isPearl ? 'border-[var(--glass-border)] bg-[var(--glass-bg)]' : 'border-line bg-cream'}`}>
        <div className={`px-4 py-3 border-b ${isPearl ? 'border-[var(--glass-border)]' : 'border-line'}`}>
          <h4 className="text-xs uppercase tracking-wider text-muted font-medium">Appearance</h4>
        </div>
        <div className="divide-y divide-[var(--glass-border)]">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Palette className="w-5 h-5 text-muted" strokeWidth={1.5} />
              <span className="text-sm text-ink">Pearl Theme</span>
            </div>
            <button
              onClick={() => setSkin(isPearl ? 'default' : 'pearl')}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${isPearl ? 'bg-[var(--aqua-deep)]' : 'bg-sage'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${isPearl ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className={`rounded-2xl border overflow-hidden ${isPearl ? 'border-[var(--glass-border)] bg-[var(--glass-bg)]' : 'border-line bg-cream'}`}>
        <div className={`px-4 py-3 border-b ${isPearl ? 'border-[var(--glass-border)]' : 'border-line'}`}>
          <h4 className="text-xs uppercase tracking-wider text-muted font-medium">Notifications</h4>
        </div>
        <div className="divide-y divide-[var(--glass-border)]">
          {['Dream Reminders', 'Sleep Insights', 'Friend Activity'].map((setting) => (
            <div key={setting} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-muted" strokeWidth={1.5} />
                <span className="text-sm text-ink">{setting}</span>
              </div>
              <button className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${isPearl ? 'bg-[var(--aqua-deep)]' : 'bg-sage'}`}>
                <span className="inline-block h-5 w-5 transform rounded-full bg-white shadow translate-x-6" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy & Data */}
      <div className={`rounded-2xl border overflow-hidden ${isPearl ? 'border-[var(--glass-border)] bg-[var(--glass-bg)]' : 'border-line bg-cream'}`}>
        <div className={`px-4 py-3 border-b ${isPearl ? 'border-[var(--glass-border)]' : 'border-line'}`}>
          <h4 className="text-xs uppercase tracking-wider text-muted font-medium">Privacy & Data</h4>
        </div>
        <div className="divide-y divide-[var(--glass-border)]">
          {[
            { icon: Shield, label: 'Privacy Policy', action: () => navigate('privacy') },
            { icon: Database, label: 'Export My Data', action: () => {} },
            { icon: Download, label: 'Download Archives', action: () => {} },
            { icon: Trash2, label: 'Delete Account', action: () => {}, danger: true },
          ].map(({ icon: Icon, label, action, danger }) => (
            <button
              key={label}
              onClick={action}
              className={`w-full flex items-center justify-between p-4 transition ${danger ? 'text-rose-600' : ''} ${isPearl ? 'hover:bg-white/60' : 'hover:bg-parchment/80'}`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-muted" strokeWidth={1.5} />
                <span className={`text-sm ${danger ? 'text-rose-600' : 'text-ink'}`}>{label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted" strokeWidth={1.5} />
            </button>
          ))}
        </div>
      </div>

      {/* About */}
      <div className={`rounded-2xl border overflow-hidden ${isPearl ? 'border-[var(--glass-border)] bg-[var(--glass-bg)]' : 'border-line bg-cream'}`}>
        <div className={`px-4 py-3 border-b ${isPearl ? 'border-[var(--glass-border)]' : 'border-line'}`}>
          <h4 className="text-xs uppercase tracking-wider text-muted font-medium">About</h4>
        </div>
        <div className="divide-y divide-[var(--glass-border)]">
          {[
            { icon: Globe, label: 'Website' },
            { icon: Share2, label: 'Share App' },
            { icon: Moon, label: 'Version 1.0.0 (MVP)' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className={`flex items-center justify-between p-4 ${isPearl ? 'hover:bg-white/60' : 'hover:bg-parchment/80'}`}>
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-muted" strokeWidth={1.5} />
                <span className="text-sm text-ink">{label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted" strokeWidth={1.5} />
            </div>
          ))}
        </div>
      </div>

      {/* Logout */}
      <button className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition">
        <LogOut className="w-5 h-5" strokeWidth={1.5} />
        <span className="text-sm font-medium">Sign Out</span>
      </button>
    </div>
  );

  return (
    <div className={`fixed inset-0 z-50 ${isPearl ? 'bg-[rgba(247,245,255,0.98)]' : 'bg-cream/98'} backdrop-blur-md`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 border-b ${isPearl ? 'border-[var(--glass-border)] bg-[rgba(247,245,255,0.92)]' : 'border-line bg-cream/95'} backdrop-blur-md`}>
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-sage/10 transition">
            <ChevronRight className="w-6 h-6 text-ink rotate-180" strokeWidth={1.75} />
          </button>
          <h1 className="text-lg font-serif font-medium text-ink">Profile</h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={`sticky top-[61px] z-10 border-b ${isPearl ? 'border-[var(--glass-border)] bg-[rgba(247,245,255,0.98)]' : 'border-line bg-cream/98'} backdrop-blur-md`}>
        <div className="max-w-lg mx-auto px-4">
          <div className="flex gap-1 py-2">
            {[
              { id: 'profile', label: 'Profile', icon: User },
              { id: 'integrations', label: 'Apps', icon: LinkIcon },
              { id: 'network', label: 'Network', icon: Users },
              { id: 'settings', label: 'Settings', icon: SettingsIcon },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as typeof activeTab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-medium transition ${
                  activeTab === id
                    ? isPearl ? 'bg-[var(--aqua-deep)] text-white' : 'bg-sage text-cream'
                    : isPearl ? 'text-[var(--text-label)] hover:text-[var(--text-primary)]' : 'text-muted hover:text-ink'
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={1.75} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-5 pb-8 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
        {activeTab === 'profile' && renderProfileTab()}
        {activeTab === 'integrations' && renderIntegrationsTab()}
        {activeTab === 'network' && renderNetworkTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </div>
    </div>
  );
}
