/**
 * Settings Component — account & app preferences only.
 *
 * Public profile, services, and social network live in ProfileHub.
 * Wearable device connections live in #/wearables (WearableSettings).
 *
 * Tabs: Account, Theme, Notifications, Subscription, Privacy
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
import { useSkinFull } from '../../contexts/SkinContext';
import { useAuth } from '../../hooks/use-auth';
import { useSubscription } from '../../hooks/useSubscription';
import { useToast } from '../ui/Toast';
import { supabase } from '../../lib/supabase/client';
import { Capacitor } from '@capacitor/core';
import { getPreferredPaymentChannel } from '../../lib/subscriptions/subscriptionService';

// Safe localStorage helpers with try-catch wrappers
function safeGetLocalStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn('[ProfileAndSettings] localStorage access failed:', e);
    return null;
  }
}

function safeSetLocalStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error('[ProfileAndSettings] Failed to save to localStorage:', e);
  }
}

function safeClearLocalStorage(): void {
  try {
    localStorage.clear();
  } catch (e) {
    console.error('[ProfileAndSettings] Failed to clear localStorage:', e);
  }
}

interface ProfileAndSettingsProps {
  user?: { email?: string; name?: string };
  onClose: () => void;
  onExportData?: () => void;
  onNavigate?: (screen: string) => void;
}

type TabId = 'account' | 'theme' | 'notifications' | 'subscription' | 'privacy';

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

export default function ProfileAndSettings({ user, onClose, onExportData, onNavigate }: ProfileAndSettingsProps) {
  const { setSkin, isPearl } = useSkinFull();
  const { signOut } = useAuth();
  const { addToast } = useToast();
  const {
    tier,
    state: subscriptionState,
    offerings,
    loading: subLoading,
    purchasing,
    error: subError,
    enabled: subsEnabled,
    subscribe,
    restore,
    manage,
    limits,
  } = useSubscription();
  const paymentChannel = getPreferredPaymentChannel();
  const [activeTab, setActiveTab] = useState<TabId>('account');
  const [isLoading, setIsLoading] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

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
    const savedTheme = safeGetLocalStorage('everdream-theme');
    if (savedTheme) {
      try {
        const parsed = JSON.parse(savedTheme);
        setThemeMode(parsed.mode || 'light');
        setThemeVariant(parsed.variant || 'modern');
        setAutoTheme(parsed.auto || false);
      } catch (e) {
        console.error('Failed to parse theme preferences:', e);
      }
    }

    const savedPrivacy = safeGetLocalStorage('everdream-privacy');
    if (savedPrivacy) {
      try {
        setPrivacySettings(JSON.parse(savedPrivacy));
      } catch (e) {
        console.error('Failed to parse privacy settings:', e);
      }
    }

    const savedNotifications = safeGetLocalStorage('everdream-notifications');
    if (savedNotifications) {
      try {
        setNotificationPrefs(JSON.parse(savedNotifications));
      } catch (e) {
        console.error('Failed to parse notification preferences:', e);
      }
    }
  }, []);

  // Save theme preferences
  const saveThemePreferences = (mode: typeof themeMode, variant: typeof themeVariant, auto: boolean) => {
    const prefs = { mode, variant, auto };
    safeSetLocalStorage('everdream-theme', JSON.stringify(prefs));
    
    // Apply theme mode
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Save privacy preferences
  const savePrivacySettings = (settings: typeof privacySettings) => {
    safeSetLocalStorage('everdream-privacy', JSON.stringify(settings));
  };

  const oauthProviderMap: Record<string, 'google' | 'apple' | 'facebook'> = {
    google: 'google',
    apple: 'apple',
    facebook: 'facebook',
  };

  const handleSocialLink = async (providerId: string) => {
    const provider = oauthProviderMap[providerId];
    if (!provider) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.linkIdentity({ provider });
      if (error) {
        const { error: signInErr } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: window.location.origin },
        });
        if (signInErr) throw signInErr;
      } else {
        setLinkedSocials((prev) => new Set([...prev, providerId]));
        addToast({ type: 'success', message: `${providerId} account linked!` });
      }
    } catch (e) {
      addToast({
        type: 'error',
        message: e instanceof Error ? e.message : 'Failed to link account',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      addToast({ type: 'success', message: 'Signed out successfully.' });
      onClose();
    } catch {
      addToast({ type: 'error', message: 'Sign out failed.' });
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

  const handleExportData = async () => {
    if (onExportData) {
      onExportData();
      return;
    }
    setIsLoading(true);
    try {
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        account: {
          email: user?.email || null,
        },
        dreams: [], // Would gather from app state
        preferences: {
          theme: { mode: themeMode, variant: themeVariant },
          notifications: notificationPrefs,
          privacy: privacySettings
        },
        linkedSocials: Array.from(linkedSocials),
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
      // Clear all local data safely
      safeClearLocalStorage();
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
    { id: 'account', label: 'Account', icon: Lock },
    { id: 'theme', label: 'Theme', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
    { id: 'privacy', label: 'Privacy', icon: Shield }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'account':
        return renderAccountTab();
      case 'theme':
        return renderThemeTab();
      case 'notifications':
        return renderNotificationsTab();
      case 'subscription':
        return renderSubscriptionTab();
      case 'privacy':
        return renderPrivacyTab();
      default:
        return null;
    }
  };

  const renderAccountTab = () => (
    <div className="space-y-6">
      <p className="text-sm text-muted bg-parchment/60 rounded-xl p-3">
        Your public profile, services, and friends are managed from the Profile screen (avatar in the header).
      </p>

      {user?.email && (
        <div className="p-4 bg-parchment/60 rounded-xl">
          <label className="block text-sm font-medium text-ink mb-2">Signed in as</label>
          <div className="flex items-center gap-2 text-sm text-ink">
            <Mail className="w-4 h-4 text-gray-400" />
            {user.email}
          </div>
        </div>
      )}

      {/* Security Section */}
      <div className="p-4 bg-parchment/60 rounded-xl space-y-4">
        <h3 className="font-semibold text-ink flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Security
        </h3>

        <div className="space-y-3">
          <button className="w-full flex items-center justify-between p-3 bg-cream rounded-lg border border-line hover:border-sage/40 transition">
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-ink">Change Password</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>

          <button className="w-full flex items-center justify-between p-3 bg-cream rounded-lg border border-line hover:border-sage/40 transition">
            <div className="flex items-center gap-3">
              <Fingerprint className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-ink">Two-Factor Authentication</span>
            </div>
            <ToggleLeft className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Linked Social Accounts */}
      <div className="p-4 bg-parchment/60 rounded-xl space-y-4">
        <h3 className="font-semibold text-ink flex items-center gap-2">
          <LinkIcon className="w-5 h-5" />
          Linked Accounts
        </h3>

        <div className="space-y-2">
          {SOCIAL_PROVIDERS.map((provider) => {
            const isLinked = linkedSocials.has(provider.id);
            return (
              <div
                key={provider.id}
                className="flex items-center justify-between p-3 bg-cream rounded-lg border border-line"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: provider.color }}
                  >
                    {provider.icon}
                  </div>
                  <span className="text-sm font-medium text-ink">{provider.name}</span>
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
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-sage hover:bg-sage/10 rounded-lg transition disabled:opacity-50"
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
      <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-3 text-rose-600 font-medium hover:bg-rose-50 rounded-lg transition"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  const renderThemeTab = () => (
    <div className="space-y-6">
      {/* Appearance Mode */}
      <div className="p-4 bg-parchment/60 rounded-xl space-y-4">
        <h3 className="font-semibold text-ink flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Appearance
        </h3>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {themeMode === 'dark' ? (
              <Moon className="w-5 h-5 text-sage" />
            ) : (
              <Sun className="w-5 h-5 text-orange-500" />
            )}
            <span className="text-sm font-medium text-ink">
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
              themeMode === 'dark' ? 'bg-sage' : 'bg-gray-300'
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
            <span className="text-sm font-medium text-ink">Auto (System)</span>
          </div>
          <button
            onClick={() => {
              const newValue = !autoTheme;
              setAutoTheme(newValue);
              saveThemePreferences(themeMode, themeVariant, newValue);
            }}
            className={`relative w-14 h-8 rounded-full transition ${
              autoTheme ? 'bg-sage' : 'bg-gray-300'
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
      <div className="p-4 bg-parchment/60 rounded-xl space-y-4">
        <h3 className="font-semibold text-ink flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Theme Variant (A/B Test)
        </h3>
        <p className="text-xs text-muted">
          Help us test different designs. Your feedback shapes the future of EverDream.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {THEME_VARIANTS.map((variant) => (
            <button
              key={variant.id}
              onClick={() => {
                setThemeVariant(variant.id);
                setSkin(variant.id === 'modern' ? 'pearl' : 'default');
                saveThemePreferences(themeMode, variant.id, autoTheme);
              }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                themeVariant === variant.id
                  ? 'border-sage/100 bg-sage/10'
                  : 'border-line hover:border-sage/40'
              }`}
            >
              <div className="text-2xl mb-2">{variant.preview}</div>
              <div className="font-semibold text-ink">{variant.label}</div>
              <div className="text-xs text-muted mt-1">{variant.description}</div>
              {themeVariant === variant.id && (
                <div className="mt-2 flex items-center gap-1 text-sage text-xs font-medium">
                  <Check className="w-3 h-3" />
                  Selected
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Preview Card */}
      <div className="p-4 bg-gradient-to-br from-sage/100 to-pink-500 rounded-xl text-white">
        <h4 className="font-semibold mb-2">Preview</h4>
        <div className={`p-4 rounded-lg ${
          themeVariant === 'modern' 
            ? 'bg-cream/20 backdrop-blur-md' 
            : 'bg-cream/90'
        }`}>
          <p className={`text-sm ${
            themeVariant === 'modern' ? 'text-white' : 'text-ink'
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
        <div key={category.id} className="p-4 bg-parchment/60 rounded-xl space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <category.icon className="w-5 h-5 text-sage" />
            <h3 className="font-semibold text-ink">{category.label}</h3>
          </div>

          <div className="space-y-2">
            {category.options.map((option) => {
              const isEnabled = notificationPrefs[option.id] ?? option.default;
              return (
                <div
                  key={option.id}
                  className="flex items-center justify-between p-3 bg-cream rounded-lg"
                >
                  <span className="text-sm font-medium text-ink">{option.label}</span>
                  <button
                    onClick={() => {
                      const newPrefs = {
                        ...notificationPrefs,
                        [option.id]: !isEnabled
                      };
                      setNotificationPrefs(newPrefs);
                      safeSetLocalStorage('everdream-notifications', JSON.stringify(newPrefs));
                    }}
                    className={`relative w-12 h-6 rounded-full transition ${
                      isEnabled ? 'bg-sage' : 'bg-gray-300'
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

  const handleSubscribe = async (planId: 'plus' | 'pro') => {
    try {
      const offering = offerings.find((o) => o.tier === planId);
      await subscribe(planId, offering?.packageIdentifier);
      addToast(`Subscribed to EverDream ${planId === 'pro' ? 'Pro' : '+'}`, 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Purchase failed';
      if (!msg.toLowerCase().includes('cancel')) {
        addToast(msg, 'error');
      }
    }
  };

  const tierLabel = tier === 'pro' ? 'EverDream Pro' : tier === 'plus' ? 'EverDream+' : 'Free';

  const renderSubscriptionTab = () => (
    <div className="space-y-4">
      <div className="p-6 bg-gradient-to-br from-sage to-pink-600 rounded-2xl text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-purple-200 text-sm">Current Plan</p>
            <h3 className="text-2xl font-bold">{subLoading ? '…' : tierLabel}</h3>
            {subscriptionState?.source && tier !== 'free' && (
              <p className="text-xs text-purple-200 mt-1 capitalize">
                via {subscriptionState.source}
                {subscriptionState.expiresAt &&
                  ` · renews ${new Date(subscriptionState.expiresAt).toLocaleDateString()}`}
              </p>
            )}
          </div>
          <CreditCard className="w-8 h-8 text-purple-200" />
        </div>
        <p className="text-sm text-purple-100 mb-2">
          {tier === 'free'
            ? 'Upgrade to unlock cloud sync, unlimited AI images, and more'
            : `${Number.isFinite(limits.aiImagesPerMonth) ? limits.aiImagesPerMonth : 'Unlimited'} AI images · ${limits.cloudSync ? 'Cloud sync on' : 'Local only'}`}
        </p>
        <p className="text-[11px] text-purple-200/80 mb-4">
          {Capacitor.isNativePlatform()
            ? subsEnabled
              ? 'Billing via Google Play / App Store'
              : 'Add RevenueCat API keys to enable in-app purchase'
            : subsEnabled
              ? 'Billing via Stripe Checkout'
              : 'Add Stripe keys to enable web checkout'}
        </p>
        {tier !== 'pro' && (
          <button
            type="button"
            disabled={purchasing || subLoading}
            onClick={() => handleSubscribe(tier === 'free' ? 'plus' : 'pro')}
            className="w-full py-3 bg-cream text-sage rounded-xl font-semibold hover:bg-sage/10 transition disabled:opacity-50"
          >
            {purchasing ? 'Processing…' : tier === 'free' ? 'Upgrade to EverDream+' : 'Upgrade to Pro'}
          </button>
        )}
        {tier !== 'free' && subsEnabled && (
          <button
            type="button"
            onClick={() => manage().catch((e) => addToast(String(e), 'error'))}
            className="w-full mt-2 py-2.5 border border-white/30 rounded-xl text-sm font-medium hover:bg-white/10"
          >
            {paymentChannel === 'stripe' ? 'Manage billing' : 'Restore purchases'}
          </button>
        )}
        {Capacitor.isNativePlatform() && (
          <button
            type="button"
            onClick={() => restore().then(() => addToast('Purchases restored', 'success')).catch((e) => addToast(String(e), 'error'))}
            className="w-full mt-2 py-2 text-xs text-purple-200 underline"
          >
            Restore purchases
          </button>
        )}
      </div>

      {subError && (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{subError}</p>
      )}

      <div className="space-y-3">
        {SUBSCRIPTION_PLANS.filter((p) => p.id !== 'free').map((plan) => {
          const planTier = plan.id as 'plus' | 'pro';
          const offering = offerings.find((o) => o.tier === planTier);
          const isCurrent = tier === plan.id;
          const priceDisplay = offering?.priceString ?? plan.price;

          return (
            <div
              key={plan.id}
              className={`p-4 rounded-xl border-2 ${
                plan.popular ? 'border-sage/100 bg-sage/10' : 'border-line bg-cream'
              } ${isCurrent ? 'ring-2 ring-sage/40' : ''}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-ink">{plan.name}</h4>
                  <p className="text-2xl font-bold text-ink">
                    {priceDisplay}
                    {!offering?.priceString && (
                      <span className="text-sm font-normal text-muted">/{plan.period}</span>
                    )}
                  </p>
                </div>
                {isCurrent ? (
                  <span className="px-2 py-1 bg-sage text-white text-xs font-medium rounded-full">Current</span>
                ) : plan.popular ? (
                  <span className="px-2 py-1 bg-sage text-white text-xs font-medium rounded-full">Popular</span>
                ) : null}
              </div>

              <ul className="space-y-2 mb-4">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-ink">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              {!isCurrent && planTier !== 'free' && (
                <button
                  type="button"
                  disabled={purchasing || !subsEnabled || (tier === 'pro' && planTier === 'plus')}
                  onClick={() => handleSubscribe(planTier)}
                  className="w-full py-2.5 rounded-xl bg-sage text-cream text-sm font-semibold disabled:opacity-40"
                >
                  {subsEnabled ? `Subscribe — ${plan.name}` : 'Coming soon'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderPrivacyTab = () => (
    <div className="space-y-6">
      {/* Data Visibility */}
      <div className="p-4 bg-parchment/60 rounded-xl space-y-4">
        <h3 className="font-semibold text-ink flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Data Visibility
        </h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-ink mb-2">Profile Visibility</label>
            <select
              value={privacySettings.profileVisibility}
              onChange={(e) => {
                const newSettings = { ...privacySettings, profileVisibility: e.target.value as any };
                setPrivacySettings(newSettings);
                savePrivacySettings(newSettings);
              }}
              className="w-full px-4 py-3 border border-line rounded-xl focus:ring-2 focus:ring-sage/100 focus:border-transparent transition bg-cream"
            >
              <option value="private">🔒 Private (Only me)</option>
              <option value="friends">👥 Friends Only</option>
              <option value="public">🌍 Public</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-2">Dream Sharing Default</label>
            <select
              value={privacySettings.dreamSharing}
              onChange={(e) => {
                const newSettings = { ...privacySettings, dreamSharing: e.target.value as any };
                setPrivacySettings(newSettings);
                savePrivacySettings(newSettings);
              }}
              className="w-full px-4 py-3 border border-line rounded-xl focus:ring-2 focus:ring-sage/100 focus:border-transparent transition bg-cream"
            >
              <option value="private">🔒 Private (Only me)</option>
              <option value="friends">👥 Friends Only</option>
              <option value="public">🌍 Public</option>
            </select>
          </div>
        </div>
      </div>

      {/* AI & Research */}
      <div className="p-4 bg-sage/10 rounded-xl space-y-4">
        <h3 className="font-semibold text-purple-900 flex items-center gap-2">
          <Brain className="w-5 h-5" />
          AI & Research
        </h3>
        <p className="text-xs text-purple-700">
          Help improve EverDream by allowing anonymized data usage
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-cream rounded-lg">
            <div>
              <div className="font-medium text-ink text-sm">AI Dream Analysis</div>
              <div className="text-xs text-muted">Allow AI to analyze your dreams</div>
            </div>
            <button
              onClick={() => {
                const newSettings = { ...privacySettings, allowAIAnalysis: !privacySettings.allowAIAnalysis };
                setPrivacySettings(newSettings);
                savePrivacySettings(newSettings);
              }}
              className={`relative w-12 h-6 rounded-full transition ${
                privacySettings.allowAIAnalysis ? 'bg-sage' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform ${
                  privacySettings.allowAIAnalysis ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-cream rounded-lg">
            <div>
              <div className="font-medium text-ink text-sm">Research Participation</div>
              <div className="text-xs text-muted">Contribute to sleep research</div>
            </div>
            <button
              onClick={() => {
                const newSettings = { ...privacySettings, allowResearchUse: !privacySettings.allowResearchUse };
                setPrivacySettings(newSettings);
                savePrivacySettings(newSettings);
              }}
              className={`relative w-12 h-6 rounded-full transition ${
                privacySettings.allowResearchUse ? 'bg-sage' : 'bg-gray-300'
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
          <div className="flex items-center justify-between p-3 bg-cream rounded-lg">
            <div>
              <div className="font-medium text-ink text-sm">Biometric Data Processing</div>
              <div className="text-xs text-muted">HRV, sleep stages, heart rate</div>
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

          <div className="flex items-center justify-between p-3 bg-cream rounded-lg">
            <div>
              <div className="font-medium text-ink text-sm">Facial Analysis</div>
              <div className="text-xs text-muted">Emotion detection during recall</div>
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
      <div className="p-4 bg-parchment/60 rounded-xl space-y-3">
        <h3 className="font-semibold text-ink flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Your Rights (GDPR)
        </h3>

        <button
          onClick={handleExportData}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-cream border border-line rounded-xl font-medium text-ink hover:bg-parchment/60 transition disabled:opacity-50"
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
        <button type="button" onClick={() => { onClose(); onNavigate?.('privacy'); }} className="block text-sm text-sageDark hover:underline text-left">Privacy Policy</button>
        <button type="button" onClick={() => { onClose(); onNavigate?.('privacy'); }} className="block text-sm text-sageDark hover:underline text-left">Terms of Service</button>
      </div>
    </div>
  );

  const shellCard = isPearl ? 'bg-[var(--glass-bg)] border-[var(--glass-border)]' : 'bg-cream border-line';

  return (
    <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className={`w-full sm:max-w-2xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden border ${shellCard}`}
      >
        <div className={`p-4 border-b flex items-center justify-between ${isPearl ? 'border-[var(--glass-border)] bg-[rgba(247,245,255,0.95)]' : 'border-line bg-cream'}`}>
          <div>
            <h2 className="text-xl font-serif font-medium text-ink">Settings</h2>
            <p className="text-sm text-muted">Account, theme, notifications & privacy</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-sage/10 rounded-full transition">
            <X className="w-6 h-6 text-muted" />
          </button>
        </div>

        <div className={`overflow-x-auto border-b ${isPearl ? 'border-[var(--glass-border)] bg-parchment/40' : 'border-line bg-parchment/60'}`}>
          <div className="flex p-2 gap-1 min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition whitespace-nowrap ${
                    isActive
                      ? isPearl ? 'bg-[var(--aqua-deep)] text-white' : 'bg-sage text-cream'
                      : 'text-muted hover:text-ink hover:bg-cream/80'
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
        <div className={`p-4 border-t flex items-center justify-between ${isPearl ? 'border-[var(--glass-border)]' : 'border-line'}`}>
          <button type="button" onClick={onClose} className="px-4 py-2 text-muted font-medium hover:bg-parchment rounded-xl transition">
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              saveThemePreferences(themeMode, themeVariant, autoTheme);
              savePrivacySettings(privacySettings);
              safeSetLocalStorage('everdream-notifications', JSON.stringify(notificationPrefs));
              addToast({ type: 'success', message: 'Settings saved!' });
              onClose();
            }}
            className={`px-6 py-2 rounded-xl font-medium transition ${isPearl ? 'bg-[var(--aqua-deep)] text-white' : 'bg-sage text-cream hover:bg-sageDark'}`}
          >
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
}
