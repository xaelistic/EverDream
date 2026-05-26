/**
 * Profile & Settings Component
 * EverDream V2 MVP - Complete Settings Hub
 * 
 * 7 Tabs: Profile, Account, Theme, Notifications, Devices, Subscription, Privacy
 * 
 * Features:
 * - A/B Theme Variants (Classic vs Modern)
 * - Light/Dark Mode Toggle
 * - Wearable Integrations (Oura, Whoop, Apple Health, etc.)
 * - Social Account Linking (Google, Apple, Facebook)
 * - Privacy Controls (Data Export, Account Deletion, AI Training Opt-in/out)
 * - Notification Preferences
 * - Subscription Management
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Shield, Bell, Palette, Smartphone, CreditCard, Lock,
  Mail, Phone, Calendar, Globe, Eye, EyeOff, Check, X,
  ChevronRight, Download, Trash2, LogOut, Sparkles, Moon, Sun,
  Zap, Activity, Heart, Watch, Link as LinkIcon, Unlink,
  ToggleLeft, ToggleRight, AlertTriangle, Info, ExternalLink,
  Camera, Mic, Video, Database, Cloud, HardDrive, Key,
  Fingerprint, MessageSquare, Sleep, Brain, TrendingUp
} from 'lucide-react';
import { useSkinFull } from '../contexts/SkinContext';

interface ProfileAndSettingsProps {
  user?: any;
  onClose: () => void;
}

type TabId = 'profile' | 'account' | 'theme' | 'notifications' | 'devices' | 'subscription' | 'privacy';

interface ThemeVariant {
  id: 'classic' | 'modern';
  label: string;
  description: string;
  preview: string;
}

const THEME_VARIANTS: ThemeVariant[] = [
  {
    id: 'classic',
    label: 'Classic',
    description: 'Standard layout, high contrast, traditional navigation',
    preview: '📐'
  },
  {
    id: 'modern',
    label: 'Modern',
    description: 'Heavy glassmorphism, larger typography, immersive gradients',
    preview: '✨'
  }
];

const WEARABLE_PROVIDERS = [
  { id: 'oura', name: 'Oura Ring', icon: '💍', color: '#7C3AED' },
  { id: 'whoop', name: 'WHOOP', icon: '💪', color: '#000000' },
  { id: 'apple_health', name: 'Apple Health', icon: '❤️', color: '#FF2D55' },
  { id: 'garmin', name: 'Garmin Connect', icon: '⌚', color: '#007CC3' },
  { id: 'fitbit', name: 'Fitbit', icon: '🏃', color: '#00B0B9' },
  { id: 'google_fit', name: 'Google Fit', icon: '👟', color: '#4285F4' },
  { id: 'samsung_health', name: 'Samsung Health', icon: '📱', color: '#1428A0' },
  { id: 'withings', name: 'Withings', icon: '⚖️', color: '#FF5F5F' },
  { id: 'polar', name: 'Polar', icon: '❄️', color: '#E30613' },
  { id: 'amazfit', name: 'Amazfit', icon: '🎯', color: '#00BCF2' }
];

const SOCIAL_PROVIDERS = [
  { id: 'google', name: 'Google', icon: 'G', color: '#DB4437' },
  { id: 'apple', name: 'Apple', icon: '', color: '#000000' },
  { id: 'facebook', name: 'Facebook', icon: 'f', color: '#1877F2' }
];

const NOTIFICATION_CATEGORIES = [
  {
    id: 'dream_reminders',
    label: 'Dream Reminders',
    icon: Moon,
    options: [
      { id: 'bedtime_reminder', label: 'Bedtime Reminder', default: true },
      { id: 'wake_up_prompt', label: 'Wake-up Dream Capture', default: true },
      { id: 'recall_practice', label: 'Recall Practice Tips', default: false }
    ]
  },
  {
    id: 'insights',
    label: 'Insights & Analysis',
    icon: Brain,
    options: [
      { id: 'weekly_summary', label: 'Weekly Dream Summary', default: true },
      { id: 'pattern_alerts', label: 'Pattern Detection Alerts', default: true },
      { id: 'ai_insights', label: 'AI-Generated Insights', default: true }
    ]
  },
  {
    id: 'social',
    label: 'Social & Community',
    icon: MessageSquare,
    options: [
      { id: 'shared_dreams', label: 'Shared Dream Updates', default: false },
      { id: 'community_highlights', label: 'Community Highlights', default: false },
      { id: 'friend_activity', label: 'Friend Activity', default: false }
    ]
  },
  {
    id: 'wellness',
    label: 'Sleep & Wellness',
    icon: Heart,
    options: [
      { id: 'sleep_goals', label: 'Sleep Goal Progress', default: true },
      { id: 'wearable_sync', label: 'Wearable Sync Status', default: true },
      { id: 'health_tips', label: 'Wellness Tips', default: false }
    ]
  }
];

const SUBSCRIPTION_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: [
      'Unlimited dream entries',
      'Basic AI analysis',
      'Local storage',
      '5 AI images/month',
      'Basic sleep tracking'
    ],
    limitations: [
      'No advanced analytics',
      'Limited export options',
      'No priority support'
    ]
  },
  {
    id: 'plus',
    name: 'EverDream+',
    price: '$4.99',
    period: 'month',
    popular: true,
    features: [
      'Everything in Free',
      'Advanced AI analysis',
      'Cloud backup & sync',
      'Unlimited AI images',
      'Wearable integration',
      'Export to JSON/PDF',
      'Priority support'
    ]
  },
  {
    id: 'pro',
    name: 'EverDream Pro',
    price: '$9.99',
    period: 'month',
    features: [
      'Everything in Plus',
      'Lucid dreaming tools',
      'VR dream visualization',
      'API access',
      'Custom AI models',
      'Research participation',
      'Early feature access'
    ]
  }
];

export default function ProfileAndSettings({ user, onClose }: ProfileAndSettingsProps) {
  const { skin, setSkin, isPearl } = useSkinFull();
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Profile State
  const [profileData, setProfileData] = useState({
    displayName: user?.name || 'Dreamer',
    email: user?.email || '',
    phone: '',
    avatar: null as string | null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: 'en',
    dateOfBirth: ''
  });

  // Theme State
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  const [themeVariant, setThemeVariant] = useState<'classic' | 'modern'>('modern');
  const [autoTheme, setAutoTheme] = useState(true);

  // Notifications State
  const [notificationPrefs, setNotificationPrefs] = useState<Record<string, boolean>>({
    bedtime_reminder: true,
    wake_up_prompt: true,
    weekly_summary: true,
    pattern_alerts: true,
    ai_insights: true,
    sleep_goals: true,
    wearable_sync: true
  });

  // Devices State
  const [connectedWearables, setConnectedWearables] = useState<Set<string>>(new Set());
  const [linkedSocials, setLinkedSocials] = useState<Set<string>>(new Set());

  // Privacy State
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'private' as 'private' | 'friends' | 'public',
    dreamSharing: 'private' as 'private' | 'friends' | 'public',
    allowAIAnalysis: true,
    allowResearchUse: false,
    allowDataSync: true,
    biometricConsent: true,
    facialAnalysisConsent: true
  });

  // Load saved preferences on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('everdream-theme');
      if (savedTheme) {
        const parsed = JSON.parse(savedTheme);
        setThemeMode(parsed.mode || 'light');
        setThemeVariant(parsed.variant || 'modern');
        setAutoTheme(parsed.auto || false);
      }

      const savedPrivacy = localStorage.getItem('everdream-privacy');
      if (savedPrivacy) {
        setPrivacySettings(JSON.parse(savedPrivacy));
      }

      const savedNotifications = localStorage.getItem('everdream-notifications');
      if (savedNotifications) {
        setNotificationPrefs(JSON.parse(savedNotifications));
      }
    } catch (e) {
      console.error('Failed to load preferences:', e);
    }
  }, []);

  // Save theme preferences
  const saveThemePreferences = (mode: typeof themeMode, variant: typeof themeVariant, auto: boolean) => {
    const prefs = { mode, variant, auto };
    localStorage.setItem('everdream-theme', JSON.stringify(prefs));
    
    // Apply theme mode
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Save privacy preferences
  const savePrivacySettings = (settings: typeof privacySettings) => {
    localStorage.setItem('everdream-privacy', JSON.stringify(settings));
  };

  // Handle wearable connection
  const handleWearableConnect = async (providerId: string) => {
    setIsLoading(true);
    try {
      // Simulate OAuth flow
      await new Promise(resolve => setTimeout(resolve, 1500));
      setConnectedWearables(prev => new Set([...prev, providerId]));
    } catch (e) {
      console.error('Failed to connect wearable:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle wearable disconnect
  const handleWearableDisconnect = (providerId: string) => {
    setConnectedWearables(prev => {
      const next = new Set(prev);
      next.delete(providerId);
      return next;
    });
  };

  // Handle social account linking
  const handleSocialLink = async (providerId: string) => {
    setIsLoading(true);
    try {
      // Simulate OAuth flow
      await new Promise(resolve => setTimeout(resolve, 1500));
      setLinkedSocials(prev => new Set([...prev, providerId]));
    } catch (e) {
      console.error('Failed to link social account:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle social account unlinking
  const handleSocialUnlink = (providerId: string) => {
    setLinkedSocials(prev => {
      const next = new Set(prev);
      next.delete(providerId);
      return next;
    });
  };

  // Export data
  const handleExportData = async () => {
    setIsLoading(true);
    try {
      // Gather all user data
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        profile: profileData,
        dreams: [], // Would gather from app state
        preferences: {
          theme: { mode: themeMode, variant: themeVariant },
          notifications: notificationPrefs,
          privacy: privacySettings
        },
        wearables: Array.from(connectedWearables),
        social: Array.from(linkedSocials)
      };

      // Create downloadable file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `everdream-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete account
  const handleDeleteAccount = async () => {
    if (!confirm('Are you absolutely sure? This action cannot be undone.')) return;
    if (!confirm('Final warning: All your dreams, data, and settings will be permanently deleted.')) return;
    
    setIsLoading(true);
    try {
      // Clear all local data
      localStorage.clear();
      // In production, would call API to delete server-side data
      await new Promise(resolve => setTimeout(resolve, 2000));
      window.location.reload();
    } catch (e) {
      console.error('Deletion failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs: Array<{ id: TabId; label: string; icon: any }> = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'account', label: 'Account', icon: Lock },
    { id: 'theme', label: 'Theme', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'devices', label: 'Devices', icon: Smartphone },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
    { id: 'privacy', label: 'Privacy', icon: Shield }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      case 'account':
        return renderAccountTab();
      case 'theme':
        return renderThemeTab();
      case 'notifications':
        return renderNotificationsTab();
      case 'devices':
        return renderDevicesTab();
      case 'subscription':
        return renderSubscriptionTab();
      case 'privacy':
        return renderPrivacyTab();
      default:
        return null;
    }
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      {/* Avatar Section */}
      <div className="flex flex-col items-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
            {profileData.displayName.charAt(0).toUpperCase()}
          </div>
          <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition">
            <Camera className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <h3 className="mt-4 text-xl font-semibold text-gray-900">{profileData.displayName}</h3>
        <p className="text-sm text-gray-500">Dream Journal Member</p>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Display Name</label>
          <input
            type="text"
            value={profileData.displayName}
            onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone (Optional)</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="tel"
              value={profileData.phone}
              onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+1 (555) 000-0000"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
            <select
              value={profileData.timezone}
              onChange={(e) => setProfileData(prev => ({ ...prev, timezone: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition bg-white"
            >
              <option value={profileData.timezone}>{profileData.timezone}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
            <select
              value={profileData.language}
              onChange={(e) => setProfileData(prev => ({ ...prev, language: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition bg-white"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="ja">日本語</option>
            </select>
          </div>
        </div>
      </div>

      <button
        onClick={() => {
          // Save profile
          console.log('Profile saved:', profileData);
        }}
        className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:shadow-lg transition"
      >
        Save Changes
      </button>
    </div>
  );

  const renderAccountTab = () => (
    <div className="space-y-6">
      {/* Security Section */}
      <div className="p-4 bg-gray-50 rounded-xl space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Security
        </h3>

        <div className="space-y-3">
          <button className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition">
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Change Password</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>

          <button className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition">
            <div className="flex items-center gap-3">
              <Fingerprint className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Two-Factor Authentication</span>
            </div>
            <ToggleLeft className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Linked Social Accounts */}
      <div className="p-4 bg-gray-50 rounded-xl space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <LinkIcon className="w-5 h-5" />
          Linked Accounts
        </h3>

        <div className="space-y-2">
          {SOCIAL_PROVIDERS.map((provider) => {
            const isLinked = linkedSocials.has(provider.id);
            return (
              <div
                key={provider.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: provider.color }}
                  >
                    {provider.icon}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{provider.name}</span>
                </div>
                {isLinked ? (
                  <button
                    onClick={() => handleSocialUnlink(provider.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Unlink className="w-4 h-4" />
                    Unlink
                  </button>
                ) : (
                  <button
                    onClick={() => handleSocialLink(provider.id)}
                    disabled={isLoading}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition disabled:opacity-50"
                  >
                    <LinkIcon className="w-4 h-4" />
                    Link
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Account Actions */}
      <div className="p-4 bg-red-50 rounded-xl space-y-3">
        <button className="w-full flex items-center justify-center gap-2 py-3 text-red-600 font-medium hover:bg-red-100 rounded-lg transition">
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  const renderThemeTab = () => (
    <div className="space-y-6">
      {/* Appearance Mode */}
      <div className="p-4 bg-gray-50 rounded-xl space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Appearance
        </h3>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {themeMode === 'dark' ? (
              <Moon className="w-5 h-5 text-purple-600" />
            ) : (
              <Sun className="w-5 h-5 text-orange-500" />
            )}
            <span className="text-sm font-medium text-gray-700">
              {themeMode === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </span>
          </div>
          <button
            onClick={() => {
              const newMode = themeMode === 'light' ? 'dark' : 'light';
              setThemeMode(newMode);
              saveThemePreferences(newMode, themeVariant, autoTheme);
            }}
            className={`relative w-14 h-8 rounded-full transition ${
              themeMode === 'dark' ? 'bg-purple-600' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                themeMode === 'dark' ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-yellow-500" />
            <span className="text-sm font-medium text-gray-700">Auto (System)</span>
          </div>
          <button
            onClick={() => {
              const newValue = !autoTheme;
              setAutoTheme(newValue);
              saveThemePreferences(themeMode, themeVariant, newValue);
            }}
            className={`relative w-14 h-8 rounded-full transition ${
              autoTheme ? 'bg-purple-600' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                autoTheme ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Theme Variant (A/B Testing) */}
      <div className="p-4 bg-gray-50 rounded-xl space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Theme Variant (A/B Test)
        </h3>
        <p className="text-xs text-gray-500">
          Help us test different designs. Your feedback shapes the future of EverDream.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {THEME_VARIANTS.map((variant) => (
            <button
              key={variant.id}
              onClick={() => {
                setThemeVariant(variant.id);
                saveThemePreferences(themeMode, variant.id, autoTheme);
              }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                themeVariant === variant.id
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              <div className="text-2xl mb-2">{variant.preview}</div>
              <div className="font-semibold text-gray-900">{variant.label}</div>
              <div className="text-xs text-gray-600 mt-1">{variant.description}</div>
              {themeVariant === variant.id && (
                <div className="mt-2 flex items-center gap-1 text-purple-600 text-xs font-medium">
                  <Check className="w-3 h-3" />
                  Selected
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Preview Card */}
      <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl text-white">
        <h4 className="font-semibold mb-2">Preview</h4>
        <div className={`p-4 rounded-lg ${
          themeVariant === 'modern' 
            ? 'bg-white/20 backdrop-blur-md' 
            : 'bg-white/90'
        }`}>
          <p className={`text-sm ${
            themeVariant === 'modern' ? 'text-white' : 'text-gray-900'
          }`}>
            {themeVariant === 'modern' 
              ? 'Modern variant with heavy glassmorphism and larger typography' 
              : 'Classic variant with standard layout and high contrast'}
          </p>
        </div>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-4">
      {NOTIFICATION_CATEGORIES.map((category) => (
        <div key={category.id} className="p-4 bg-gray-50 rounded-xl space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <category.icon className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">{category.label}</h3>
          </div>

          <div className="space-y-2">
            {category.options.map((option) => {
              const isEnabled = notificationPrefs[option.id] ?? option.default;
              return (
                <div
                  key={option.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg"
                >
                  <span className="text-sm font-medium text-gray-700">{option.label}</span>
                  <button
                    onClick={() => {
                      const newPrefs = {
                        ...notificationPrefs,
                        [option.id]: !isEnabled
                      };
                      setNotificationPrefs(newPrefs);
                      localStorage.setItem('everdream-notifications', JSON.stringify(newPrefs));
                    }}
                    className={`relative w-12 h-6 rounded-full transition ${
                      isEnabled ? 'bg-purple-600' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform ${
                        isEnabled ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  const renderDevicesTab = () => (
    <div className="space-y-6">
      {/* Wearables */}
      <div className="p-4 bg-gray-50 rounded-xl space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Watch className="w-5 h-5" />
          Wearable Devices
        </h3>
        <p className="text-xs text-gray-500">
          Connect your fitness tracker for enhanced sleep analysis
        </p>

        <div className="space-y-2">
          {WEARABLE_PROVIDERS.map((provider) => {
            const isConnected = connectedWearables.has(provider.id);
            return (
              <div
                key={provider.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{provider.icon}</div>
                  <div>
                    <div className="font-medium text-gray-900">{provider.name}</div>
                    {isConnected && (
                      <div className="text-xs text-green-600 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Connected
                      </div>
                    )}
                  </div>
                </div>
                {isConnected ? (
                  <button
                    onClick={() => handleWearableDisconnect(provider.id)}
                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => handleWearableConnect(provider.id)}
                    disabled={isLoading}
                    className="px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition disabled:opacity-50"
                  >
                    Connect
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Biometric Permissions */}
      <div className="p-4 bg-blue-50 rounded-xl space-y-3">
        <h3 className="font-semibold text-blue-900 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Biometric Data
        </h3>
        <p className="text-xs text-blue-700">
          Control how biometric data is used for analysis
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-white rounded-lg">
            <span className="text-sm font-medium text-gray-700">Heart Rate Analysis</span>
            <ToggleRight className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex items-center justify-between p-3 bg-white rounded-lg">
            <span className="text-sm font-medium text-gray-700">Sleep Stage Detection</span>
            <ToggleRight className="w-5 h-5 text-purple-600" />
          </div>
        </div>
      </div>
    </div>
  );

  const renderSubscriptionTab = () => (
    <div className="space-y-4">
      {/* Current Plan */}
      <div className="p-6 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-purple-200 text-sm">Current Plan</p>
            <h3 className="text-2xl font-bold">Free</h3>
          </div>
          <CreditCard className="w-8 h-8 text-purple-200" />
        </div>
        <p className="text-sm text-purple-100 mb-4">
          Upgrade to unlock advanced features
        </p>
        <button className="w-full py-3 bg-white text-purple-600 rounded-xl font-semibold hover:bg-purple-50 transition">
          Upgrade Now
        </button>
      </div>

      {/* Plan Options */}
      <div className="space-y-3">
        {SUBSCRIPTION_PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`p-4 rounded-xl border-2 ${
              plan.popular
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                <p className="text-2xl font-bold text-gray-900">
                  {plan.price}
                  <span className="text-sm font-normal text-gray-500">/{plan.period}</span>
                </p>
              </div>
              {plan.popular && (
                <span className="px-2 py-1 bg-purple-600 text-white text-xs font-medium rounded-full">
                  Most Popular
                </span>
              )}
            </div>

            <ul className="space-y-2 mb-4">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            {plan.limitations && (
              <ul className="space-y-2">
                {plan.limitations.map((limitation, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-500">
                    <X className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    {limitation}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderPrivacyTab = () => (
    <div className="space-y-6">
      {/* Data Visibility */}
      <div className="p-4 bg-gray-50 rounded-xl space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Data Visibility
        </h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Profile Visibility</label>
            <select
              value={privacySettings.profileVisibility}
              onChange={(e) => {
                const newSettings = { ...privacySettings, profileVisibility: e.target.value as any };
                setPrivacySettings(newSettings);
                savePrivacySettings(newSettings);
              }}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition bg-white"
            >
              <option value="private">🔒 Private (Only me)</option>
              <option value="friends">👥 Friends Only</option>
              <option value="public">🌍 Public</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Dream Sharing Default</label>
            <select
              value={privacySettings.dreamSharing}
              onChange={(e) => {
                const newSettings = { ...privacySettings, dreamSharing: e.target.value as any };
                setPrivacySettings(newSettings);
                savePrivacySettings(newSettings);
              }}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition bg-white"
            >
              <option value="private">🔒 Private (Only me)</option>
              <option value="friends">👥 Friends Only</option>
              <option value="public">🌍 Public</option>
            </select>
          </div>
        </div>
      </div>

      {/* AI & Research */}
      <div className="p-4 bg-purple-50 rounded-xl space-y-4">
        <h3 className="font-semibold text-purple-900 flex items-center gap-2">
          <Brain className="w-5 h-5" />
          AI & Research
        </h3>
        <p className="text-xs text-purple-700">
          Help improve EverDream by allowing anonymized data usage
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white rounded-lg">
            <div>
              <div className="font-medium text-gray-900 text-sm">AI Dream Analysis</div>
              <div className="text-xs text-gray-500">Allow AI to analyze your dreams</div>
            </div>
            <button
              onClick={() => {
                const newSettings = { ...privacySettings, allowAIAnalysis: !privacySettings.allowAIAnalysis };
                setPrivacySettings(newSettings);
                savePrivacySettings(newSettings);
              }}
              className={`relative w-12 h-6 rounded-full transition ${
                privacySettings.allowAIAnalysis ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform ${
                  privacySettings.allowAIAnalysis ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-white rounded-lg">
            <div>
              <div className="font-medium text-gray-900 text-sm">Research Participation</div>
              <div className="text-xs text-gray-500">Contribute to sleep research</div>
            </div>
            <button
              onClick={() => {
                const newSettings = { ...privacySettings, allowResearchUse: !privacySettings.allowResearchUse };
                setPrivacySettings(newSettings);
                savePrivacySettings(newSettings);
              }}
              className={`relative w-12 h-6 rounded-full transition ${
                privacySettings.allowResearchUse ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform ${
                  privacySettings.allowResearchUse ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Biometric Consent */}
      <div className="p-4 bg-green-50 rounded-xl space-y-4">
        <h3 className="font-semibold text-green-900 flex items-center gap-2">
          <Heart className="w-5 h-5" />
          Biometric Consent
        </h3>
        <p className="text-xs text-green-700">
          Required for wearable integration and facial analysis
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white rounded-lg">
            <div>
              <div className="font-medium text-gray-900 text-sm">Biometric Data Processing</div>
              <div className="text-xs text-gray-500">HRV, sleep stages, heart rate</div>
            </div>
            <button
              onClick={() => {
                const newSettings = { ...privacySettings, biometricConsent: !privacySettings.biometricConsent };
                setPrivacySettings(newSettings);
                savePrivacySettings(newSettings);
              }}
              className={`relative w-12 h-6 rounded-full transition ${
                privacySettings.biometricConsent ? 'bg-green-600' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform ${
                  privacySettings.biometricConsent ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-white rounded-lg">
            <div>
              <div className="font-medium text-gray-900 text-sm">Facial Analysis</div>
              <div className="text-xs text-gray-500">Emotion detection during recall</div>
            </div>
            <button
              onClick={() => {
                const newSettings = { ...privacySettings, facialAnalysisConsent: !privacySettings.facialAnalysisConsent };
                setPrivacySettings(newSettings);
                savePrivacySettings(newSettings);
              }}
              className={`relative w-12 h-6 rounded-full transition ${
                privacySettings.facialAnalysisConsent ? 'bg-green-600' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform ${
                  privacySettings.facialAnalysisConsent ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* GDPR Actions */}
      <div className="p-4 bg-gray-50 rounded-xl space-y-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Your Rights (GDPR)
        </h3>

        <button
          onClick={handleExportData}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
        >
          <Download className="w-5 h-5" />
          Export My Data (Article 15)
        </button>

        <button
          onClick={handleDeleteAccount}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition disabled:opacity-50"
        >
          <Trash2 className="w-5 h-5" />
          Delete My Account (Article 17)
        </button>
      </div>

      {/* Legal Links */}
      <div className="p-4 space-y-2">
        <a href="#" className="block text-sm text-purple-600 hover:underline">Privacy Policy</a>
        <a href="#" className="block text-sm text-purple-600 hover:underline">Terms of Service</a>
        <a href="#" className="block text-sm text-purple-600 hover:underline">Cookie Policy</a>
        <a href="#" className="block text-sm text-purple-600 hover:underline">Data Processing Agreement</a>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="bg-white w-full sm:max-w-2xl sm:rounded-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          <div>
            <h2 className="text-xl font-bold">Settings</h2>
            <p className="text-sm text-purple-200">Manage your account and preferences</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="overflow-x-auto border-b border-gray-200 bg-gray-50">
          <div className="flex p-2 gap-1 min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              // Save all settings
              console.log('All settings saved');
              onClose();
            }}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:shadow-lg transition"
          >
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
}
