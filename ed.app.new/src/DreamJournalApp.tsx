import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Moon,
  Calendar,
  Sparkles,
  X,
  Upload,
  Zap,
  Heart,
  Award,
  MessageCircle,
  Brain,
  Eye,
  Shield,
  Download,
  Cpu,
  Activity,
  Watch,
  ArrowLeft,
  ChevronRight,
  Palette,
  Camera,
  Check,
  LineChart,
  Star,
} from 'lucide-react';
import Shell from './components/Shell';
import { TrackerScreen } from './components/tracker/TrackerScreen';
import { HomeScreen } from './screens/HomeScreen';

import { JournalScreen } from './screens/JournalScreen';
import { InsightsScreen } from './screens/InsightsScreen';
import { MoreScreen } from './screens/MoreScreen';
import { RecordScreen } from './screens/RecordScreen';
import { EducationDetailScreen } from './screens/EducationDetailScreen';
import { AchievementsScreen } from './screens/AchievementsScreen';
import { useHashRoute } from './hooks/useHashRoute';
import {
  evaluateDreamAchievements,
  unlockAchievement,
  type UnlockedAchievement,
} from './lib/achievements';
import {
  captureReferralFromUrl,
  consumePendingReferral,
  applyReferralCode,
} from './lib/referral';
import { SLEEP_EDUCATION_CONTENT } from './lib/sleepEducation';
import { getCategoryBadgeClass, getEmotionEmoji } from './utils/dreamPresentation';
import {
  loadFavouriteIds,
  saveFavouriteIds,
  toggleFavouriteId,
} from './lib/favourites';
import PhotoUploadFlow from './components/photo-upload/PhotoUploadFlow';
import type { ExtractedDreamEntry } from './components/photo-upload/PhotoUploadFlow';
import { generateDreamImage } from './modules/sleep/dreamAssetGenerator';
import { generateParallaxVideo } from './lib/assets/pipeline';
import type { EmotionCapture } from './components/face/FacialEmotionDetector';
import {
  transcribeAudio as transcribeWithWhisper,
  transcribeWithWebSpeech,
  isSpeechRecognitionSupported,
} from './lib/transcriptionWhisper';
import { processVideoJournal, processTextJournal, processAudioJournal } from './lib/videoJournalProcessor';
import { stopCaptureMedia } from './lib/stopCaptureMedia';
import { WearableSettings } from './components/wearables/WearableSettings';
import type { WearableConfig, WearableProvider, WearableSleepRecord } from './lib/wearables';
import { DEFAULT_WEARABLE_CONFIGS } from './lib/defaultWearableConfigs';
import { getWearableClientIdMap, getWearableRedirectUri } from './lib/wearableClientIds';
import { loadWearableConfigs, parseWearableOAuthFromUrl, saveWearableConfigs } from './lib/wearableConnectionStore';
import { exchangeWearableOAuthCode } from './lib/wearableOAuth';
import AdminDashboard from './components/admin/AdminDashboard';
import { useSkinFull } from './contexts/SkinContext';
import { trackScreenView, startSession, endSession } from './lib/analytics';
import { initPerformanceMonitor, startAPICall, endAPICall } from './lib/performance';
import { AppLoadingScreen, ErrorBanner, LoadingOverlay } from './components/ui';
import { useToast } from './components/ui/Toast';
import { TermsModal } from './components/modal';
import { ProfileHub } from './screens/ProfileHubScreen';
import { getOrCreateWallet, createDreamNFT, mintNFT, saveNFT, type DreamNFT, type WalletIdentity } from './lib/nft';
import DreamCapture from './components/dreams/DreamCapture';
import { DreamDetailScreen } from './screens/DreamDetailScreen';
import ShareModal from './components/dreams/ShareModal';
import { VideoJournalScreen } from './screens/VideoJournalScreen';
import { PrivacyScreen } from './screens/PrivacyScreen';
import { analyzeDream, type DreamAnalysis } from './lib/dream-analyzer';
import { coerceNarrativeText, sanitizeDreamForUI } from './lib/normalizeDreamAnalysis';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import { DailyReflectionCard } from './components/reflection/DailyReflectionCard';
import { getDailyQuote, getPersonalizedDailyEducation } from './lib/dailyContent';
import { educationInputsFromProfile } from './lib/onboarding/saveOnboarding';
import { isOnboardedLocally, markOnboardedLocally } from './lib/onboarding/model';
import { loadUserProfile } from './lib/profileService';
import {
  shouldShowDailyReflection,
  shouldRouteToJournalOnOpen,
  incrementTodayOpenCount,
  dismissReflectionForToday,
} from './lib/dailySession';
import LoadingScreen from './components/loading-screen';
import type { DreamAsset } from './modules/sleep/types';
import { initDreamService, syncFromSupabase } from './lib/dreamService';
import { generateDreamId, toDreamsUpsertRow } from './lib/dreamsRecord';
import { persistUserMedia } from './lib/mediaPersist';
import { mediaStorageManager } from './lib/mediaStorage';
import { 
  updateUserProfileFromDream, 
  enrichAnalysisWithProfile, 
  enrichImagePromptWithProfile,
  loadCurrentUserProfile 
} from './lib/userProfile';
import { supabase as supabaseClient, getCurrentUser, getProfile } from './lib/supabase/client';
import { useAuth } from './hooks/use-auth';
import { useSubscription } from './hooks/use-subscription';
import { FEATURE_NFT_UI_ENABLED } from './config/features';
import {
  loadDailyCheckin,
  saveDailyCheckin,
  energyLevelFromValue,
  type EnergyLevel,
} from './lib/dailyCheckin';

const DreamJournalApp = () => {
  const { addToast } = useToast();
  const { route, navigate } = useHashRoute();
  const { skin, isThemed } = useSkinFull();
  const { user } = useAuth();
  const {
    isAdmin,
    profile: userProfile,
    loading: subscriptionLoading,
    refresh: refreshSubscriptionProfile,
  } = useSubscription();

  // ── Dream type ──────────────────────────────────────────────
  type Dream = {
    id: string;
    date: string;
    content: string;
    category: string;
    themes: string[];
    emotion: string;
    symbols: string[];
    narrative: string;
    nugget: string;
    interpretation: {
      symbols: Record<string, string>;
      meaning: string;
      commonPattern: string;
    };
    sleepData?: {
      bedtime?: string;
      wakeTime?: string;
      sleepDuration?: number;
      estimatedREM?: number;
      movementScore?: number;
      quality?: number;
      source?: string;
      stages?: { phase: string; duration: number; start?: string }[];
      sleepQuality?: number;
      remDuration?: number;
      deepDuration?: number;
      heartRate?: { avg: number; min: number; max: number };
      hrv?: number;
      movement?: number;
    };
    generatedImage?: {
      url: string;
      prompt: string;
      style: string;
      generatedAt: string;
      source?: string;
    };
    parallaxVideoUrl?: string | null;
    watermark?: {
      userId: string;
      dreamId: string;
      timestamp: string;
      signature: string;
      version: string;
      rights: {
        creator: string;
        license: string;
        revocable: boolean;
        duration: string;
      };
    };
    assetMetadata?: {
      rarityScore: number;
      uniquenessScore: number;
      culturalContext: string;
      potentialValue: string;
    };
    sourceAudio?: string | null;
    audioCapture?: { url?: string; path?: string; capturedAt?: string; duration?: number; mediaId?: string } | null;
    videoCapture?: { url: string; path?: string; capturedAt: string; duration?: number; thumbnail?: string; mediaId?: string } | null;
    mediaStoragePath?: string | null;
    captureMode?: string;
    capturedEmotions?: EmotionCapture | null;
    context?: {
      mood: string;
      yesterdayEvents: string;
      sleepQuality: number;
    };
    isSample?: boolean;
    moodValence?: number;
    sourcePhotos?: string[];
    audioFile?: string;
    scenes?: { id: string; title: string; summary: string; prompt: string }[];
    storyboardImages?: { url: string; title: string; prompt: string }[];
  };

  const [dreams, setDreams] = useState<Dream[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [currentEntry, setCurrentEntry] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [settings, setSettings] = useState({
    alarmTime: '07:00',
    alarmEnabled: true,
    musicPreference: 'peaceful',
    circadianGoal: 'better_dreams',
    notificationsEnabled: true,
    wearableSync: false,
    imageGeneration: true
  });
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [audioFiles, setAudioFiles] = useState<string[]>([]);
  const [pendingTranscription, setPendingTranscription] = useState<{ text: string; audioFile: string; timestamp: string } | null>(null);
  const [captureMode, setCaptureMode] = useState<'text' | 'audio' | 'video'>('text');
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [videoChunks, setVideoChunks] = useState<Blob[]>([]);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [reflectionMood, setReflectionMood] = useState('');
  const [reflectionEnergy, setReflectionEnergy] = useState(50);
  const [reflectionEnergyLevel, setReflectionEnergyLevel] = useState<EnergyLevel | ''>('');
  const [checkInSaved, setCheckInSaved] = useState(false);
  const reflectionQuote = useMemo(() => getDailyQuote(), []);
  const [showDailyReflection, setShowDailyReflection] = useState(false);
  const [hasRoutedToday, setHasRoutedToday] = useState(false);

  const lastDream = useMemo(
    () => dreams.find((d) => !d.isSample) ?? null,
    [dreams],
  );
  const [filterCategory, setFilterCategory] = useState('all');
  const [favouriteIds, setFavouriteIds] = useState<string[]>([]);
  const [achievements, setAchievements] = useState<UnlockedAchievement[]>([]);
  const [showAchievement, setShowAchievement] = useState<{
    id: string;
    title: string;
    description: string;
    icon: string;
  } | null>(null);
  const [educationModuleOverride, setEducationModuleOverride] = useState<string | null>(null);
  const [contextData, setContextData] = useState({
    mood: '',
    yesterdayEvents: '',
    sleepQuality: 3
  });
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading your dreams...');
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isLoadingDreams, setIsLoadingDreams] = useState(true);
  const [dreamError, setDreamError] = useState<string | null>(null);
  const [showAssetInfo, setShowAssetInfo] = useState(false);
  const [showMintModal, setShowMintModal] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [mintedNFT, setMintedNFT] = useState<DreamNFT | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletIdentity | null>(null);
  const [capturedEmotions, setCapturedEmotions] = useState<EmotionCapture | null>(null);
  const [wearableData, setWearableData] = useState<WearableSleepRecord[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [educationProfile, setEducationProfile] = useState<{
    goalIds: import('./lib/onboarding/model').OnboardingGoalId[];
    interestIds: import('./lib/onboarding/model').InterestId[];
    interestLabels: string[];
  }>({ goalIds: [], interestIds: [], interestLabels: [] });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const local = await loadUserProfile();
        const fromLocal = educationInputsFromProfile({
          interests: local.interests,
          dream_goals: local.dreamGoals,
        });
        // Prefer Supabase subscription profile when present
        const fromSub = userProfile
          ? educationInputsFromProfile({
              onboarding_goals: (userProfile as { onboarding_goals?: string[] }).onboarding_goals,
              interests: (userProfile as { interests?: string[] }).interests,
              dream_goals: (userProfile as { dream_goals?: string[] }).dream_goals,
            })
          : null;
        if (cancelled) return;
        setEducationProfile({
          goalIds: fromSub?.goalIds?.length ? fromSub.goalIds : fromLocal.goalIds,
          interestIds: (fromSub?.interestIds?.length ? fromSub.interestIds : fromLocal.interestIds),
          interestLabels:
            (fromSub?.interestLabels?.length ? fromSub.interestLabels : fromLocal.interestLabels) ||
            local.interests ||
            [],
        });
      } catch {
        /* keep defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userProfile]);

  const dailyEducation = useMemo(
    () =>
      getPersonalizedDailyEducation({
        goalIds: educationProfile.goalIds,
        interestIds: educationProfile.interestIds,
        interestLabels: educationProfile.interestLabels,
      }),
    [educationProfile],
  );
  const [wearableConfigs, setWearableConfigsState] = useState<WearableConfig[]>(() =>
    loadWearableConfigs(DEFAULT_WEARABLE_CONFIGS),
  );
  const [wearableConnectProvider, setWearableConnectProvider] = useState<WearableProvider | null>(null);
  const [wearableOAuthError, setWearableOAuthError] = useState<string | null>(null);
  const wearableClientIdMap = useMemo(() => getWearableClientIdMap(), []);
  const wearableRedirectUri = useMemo(() => getWearableRedirectUri(), []);

  const setWearableConfigs = useCallback((configs: WearableConfig[]) => {
    setWearableConfigsState(configs);
    saveWearableConfigs(configs);
  }, []);
  const [showLicensing, setShowLicensing] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    dataProcessing: false,
    aiAnalysis: true,
    imageGeneration: true,
    wearableSync: false,
    anonymousAnalytics: false,
    thirdPartySharing: false
  });

  const reflectionSleepData = useMemo(() => {
    if (wearableData.length > 0) {
      return wearableData[0];
    }
    const lastDream = dreams.find((d) => !d.isSample && d.sleepData);
    return lastDream?.sleepData || null;
  }, [wearableData, dreams]);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);

  // Auto-show onboarding for first-time users (after terms).
  // Local flag + remote onboarded_at both count — prevents re-trap after explore/save glitches.
  useEffect(() => {
    const force = localStorage.getItem('forceOnboarding') === '1';
    if (force && !showOnboarding) {
      setShowOnboarding(true);
      localStorage.removeItem('forceOnboarding');
      return;
    }

    if (!hasAcceptedTerms || showOnboarding || subscriptionLoading) return;
    if (!user || user.isAnonymous) return;
    if (isOnboardedLocally() || userProfile?.onboarded_at) return;
    // Only prompt on home (not mid-record / journal / other flows)
    if (userProfile && (route.screen === 'home' || route.screen === 'reflection')) {
      setShowOnboarding(true);
    }
  }, [hasAcceptedTerms, showOnboarding, subscriptionLoading, user, userProfile, route.screen]);

  const detailDream = useMemo(() => {
    if (route.screen !== 'dream' || !route.dreamId) return null;
    return dreams.find((d) => d.id === route.dreamId) ?? null;
  }, [dreams, route.screen, route.dreamId]);

  // Sample dream for first-time users
  const SAMPLE_DREAM = {
    id: 'sample-1',
    date: new Date(Date.now() - 86400000).toISOString(),
    content: "I was flying over a vast ocean at sunset. The water was impossibly blue and gold. I felt completely free, like I could go anywhere. Then I noticed dolphins swimming below me, and they started jumping up to meet me. We flew together for what felt like hours.",
    category: 'peaceful',
    themes: ['flying', 'ocean', 'freedom', 'dolphins', 'sunset'],
    emotion: 'joy',
    symbols: ['flying', 'ocean', 'dolphins'],
    narrative: "I found myself soaring high above an endless ocean painted in impossible shades of blue and gold by the setting sun. The sensation was intoxicating—complete freedom coursed through my body as I realized I could go anywhere, do anything. Below, the water sparkled like liquid light. That's when I noticed them: dolphins, dozens of them, their sleek bodies cutting through the waves. As if sensing my presence, they began to leap from the water, higher and higher, until they were flying beside me. We moved as one, a joyous dance between sky and sea, and time seemed to stop. The moment stretched on forever, pure and perfect.",
    nugget: "Flying with dolphins over a golden ocean, feeling completely free and at peace with the universe",
    interpretation: {
      symbols: {
        'flying': 'Represents freedom, transcendence, and rising above daily concerns',
        'ocean': 'Symbolizes the unconscious mind, emotions, and vast possibilities',
        'dolphins': 'Intelligence, playfulness, and spiritual guidance'
      },
      meaning: 'This dream suggests you\'re entering a period of emotional freedom and spiritual growth. The dolphins represent guidance from your intuition.',
      commonPattern: 'Flying dreams often occur during times of personal growth or when overcoming obstacles.'
    },
    sleepData: {
      bedtime: new Date(Date.now() - 94400000).toISOString(),
      wakeTime: new Date(Date.now() - 86400000).toISOString(),
      sleepDuration: 480,
      estimatedREM: 120,
      movementScore: 35,
      quality: 85,
      source: 'simulated'
    },
    generatedImage: {
      url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800', // Static sample image for demo
      prompt: 'Surreal dreamscape of flying over a golden ocean at sunset with dolphins leaping into the sky',
      style: 'dreamlike',
      generatedAt: new Date(Date.now() - 86400000).toISOString()
    },
    watermark: {
      userId: 'sample_user',
      dreamId: 'sample-1',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      signature: 'SHA256:a1b2c3d4e5f6...',
      version: '1.0',
      rights: {
        creator: 'sample_user',
        license: 'loan',
        revocable: true,
        duration: 'perpetual_unless_revoked'
      }
    },
    assetMetadata: {
      rarityScore: 0.75,
      uniquenessScore: 0.82,
      culturalContext: 'sample',
      potentialValue: 'medium'
    },
    context: {
      mood: 'peaceful',
      yesterdayEvents: 'Sample dream to show what your journal will look like',
      sleepQuality: 4
    },
    isSample: true
  };

  const handleReflectionMood = (mood: string) => {
    setReflectionMood(mood);
    const level = reflectionEnergyLevel || energyLevelFromValue(reflectionEnergy);
    saveDailyCheckin({ mood, energy: reflectionEnergy, energyLevel: level });
    setCheckInSaved(true);
  };

  const handleReflectionEnergyLevel = (level: EnergyLevel, value: number) => {
    setReflectionEnergy(value);
    setReflectionEnergyLevel(level);
    saveDailyCheckin({
      mood: reflectionMood,
      energy: value,
      energyLevel: level,
    });
    setCheckInSaved(true);
  };

  useEffect(() => {
    const saved = loadDailyCheckin();
    if (saved) {
      setReflectionMood(saved.mood);
      setReflectionEnergy(saved.energy);
      setReflectionEnergyLevel(saved.energyLevel);
      setCheckInSaved(Boolean(saved.mood || saved.energyLevel));
    }
  }, []);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const stored = await window.storage?.get('dreams');
        if (stored?.value) {
          const loadedDreams = (JSON.parse(stored.value) as Dream[]).map((dream) =>
            sanitizeDreamForUI(dream) as Dream,
          );
          setDreams(loadedDreams);
        } else {
          setDreams([SAMPLE_DREAM]);
        }
      } catch (error) {
        setDreams([SAMPLE_DREAM]);
      }
      
      try {
        const storedSettings = await window.storage?.get('settings');
        if (storedSettings?.value) {
          setSettings(JSON.parse(storedSettings.value));
        }
      } catch (error) {
        console.log('No stored settings yet');
      }

      try {
        const storedWearable = await window.storage?.get('wearableData');
        if (storedWearable?.value) {
          setWearableData(JSON.parse(storedWearable.value));
        }
      } catch (error) {
        console.log('No wearable data yet');
      }

      try {
        const storedAchievements = await window.storage?.get('achievements');
        if (storedAchievements?.value) {
          const parsed = JSON.parse(storedAchievements.value);
          if (Array.isArray(parsed)) {
            setAchievements(
              parsed.map((a: { id: string; unlockedAt?: string }) => ({
                id: a.id,
                unlockedAt: a.unlockedAt || new Date().toISOString(),
              })),
            );
          }
        }
      } catch (error) {
        console.log('No achievements yet');
      }

      try {
        const favs = await loadFavouriteIds();
        setFavouriteIds(favs);
      } catch {
        console.log('No favourites yet');
      }
      try {
        captureReferralFromUrl();
        const pendingRef = consumePendingReferral();
        if (pendingRef) {
          applyReferralCode(pendingRef);
        }
      } catch {
        /* ignore referral capture errors */
      }

      try {
        const storedPrivacy = await window.storage?.get('privacySettings');
        if (storedPrivacy?.value) {
          setPrivacySettings(JSON.parse(storedPrivacy.value));
        }
      } catch (error) {
        console.log('No privacy settings yet');
      }

      try {
        const termsAccepted = await window.storage?.get('termsAccepted');
        if (termsAccepted?.value) {
          setHasAcceptedTerms(JSON.parse(termsAccepted.value));
        } else {
          // Show terms on first launch
          setShowTerms(true);
        }
      } catch (error) {
        setShowTerms(true);
      }
    };
    loadData();

    // Initialize Supabase (async, non-blocking)
    initDreamService().then((supabaseReady) => {
      if (supabaseReady) {
        console.log('[App] Supabase initialized — syncing from cloud');
        syncFromSupabase().then(async (merged) => {
          if (merged > 0) {
            console.log(`[App] Merged ${merged} dreams from Supabase`);
            try {
              const raw = localStorage.getItem('everdream_dreams');
              if (raw) {
                const mergedDreams = (JSON.parse(raw) as Dream[]).map((dream) =>
                  sanitizeDreamForUI(dream) as Dream,
                );
                setDreams(mergedDreams);
              }
            } catch { /* ignore */ }
          }
          try {
            const stored = await window.storage?.get('dreams');
            const local = stored?.value
              ? (JSON.parse(stored.value) as Dream[]).filter((d) => !d.isSample)
              : [];
            for (const dream of local) {
              await syncDreamToSupabase(dream);
            }
          } catch (err) {
            console.warn('[App] Local dream backfill failed:', err);
          }
          try {
            const stored = await window.storage?.get('dreams');
            const local = stored?.value ? (JSON.parse(stored.value) as Dream[]) : [];
            for (const dream of local) {
              const stuck = /processing your/i.test(dream.content || '') || /processing in progress/i.test(dream.narrative || '');
              if (!stuck) continue;
              const mediaId = dream.videoCapture?.mediaId || dream.audioCapture?.mediaId;
              if (!mediaId) continue;
              const media = await mediaStorageManager.getMedia(mediaId);
              if (!media?.blob) continue;
              if (dream.captureMode === 'video' || dream.videoCapture) {
                const uploaded = await persistUserMedia({ blob: media.blob, kind: 'video', dreamId: dream.id });
                const { dream: processed } = await processVideoJournal({
                  videoBlob: media.blob,
                  duration: dream.videoCapture?.duration || 0,
                  mediaId,
                  thumbnail: dream.videoCapture?.thumbnail,
                });
                const nextDream = {
                  ...processed,
                  id: dream.id,
                  videoCapture: {
                    ...processed.videoCapture,
                    url: uploaded?.url || processed.videoCapture.url,
                    path: uploaded?.path,
                    mediaId,
                  },
                  mediaStoragePath: uploaded?.path || dream.mediaStoragePath,
                };
                setDreams((prev) => {
                  const next = prev.map((d) => (d.id === dream.id ? nextDream : d));
                  saveDreamsToStorage(next).catch(console.error);
                  return next;
                });
                syncDreamToSupabase(nextDream).catch(console.error);
              }
            }
          } catch (err) {
            console.warn('[App] Stuck dream reprocess failed:', err);
          }
        });
      } else {
        console.log('[App] Supabase not configured — local mode only');
      }
    });
    // Signal loading complete after data is fetched
    const loadingTimer = setTimeout(() => {
      setIsAppLoading(false);
      setIsLoadingDreams(false);
    }, 600);
    return () => clearTimeout(loadingTimer);
  }, []);

  // Initialize analytics & performance monitoring
  useEffect(() => {
    const session = startSession();
    initPerformanceMonitor(session.id);

    return () => {
      endSession();
    };
  }, []);

  // Complete wearable OAuth when returning from provider sign-in
  useEffect(() => {
    const pending = parseWearableOAuthFromUrl();
    if (!pending) return;

    navigate('wearables');
    setWearableConnectProvider(pending.provider);
    setWearableOAuthError(null);

    exchangeWearableOAuthCode(pending.provider, pending.code, wearableRedirectUri)
      .then((auth) => {
        setWearableConfigsState((prev) => {
          const updated = [
            ...prev.filter((c) => c.provider !== pending.provider),
            { provider: pending.provider, enabled: true, auth },
          ];
          saveWearableConfigs(updated);
          return updated;
        });
        setWearableOAuthError(null);
        addToast({ type: 'success', message: `${pending.provider.replace(/_/g, ' ')} connected. Tap Sync to import sleep data.` });
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'OAuth sign-in could not be completed';
        setWearableOAuthError(message);
        addToast({ type: 'warning', message });
      });
  }, [navigate, wearableRedirectUri, addToast]);

  // Track screen views on route change
  useEffect(() => {
    trackScreenView(route.screen);
  }, [route.screen]);

  // Daily routing: first open → journal; return visit or dream today → reflection card
  useEffect(() => {
    if (isAppLoading || !hasAcceptedTerms || showOnboarding || hasRoutedToday) return;

    const hash = window.location.hash.replace(/^#\/?/, '').trim();
    const isColdStart = !hash || hash === 'home' || hash === 'reflection';

    if (!isColdStart) {
      setHasRoutedToday(true);
      incrementTodayOpenCount();
      return;
    }

    if (shouldShowDailyReflection(dreams)) {
      setShowDailyReflection(true);
      navigate('home');
    } else if (shouldRouteToJournalOnOpen(dreams)) {
      navigate('journal');
    }

    incrementTodayOpenCount();
    setHasRoutedToday(true);
  }, [isAppLoading, hasAcceptedTerms, showOnboarding, hasRoutedToday, dreams, navigate]);

  // Save dreams to Supabase cloud (non-blocking helper)
  const syncDreamToSupabase = async (dream: Dream): Promise<void> => {
    try {
      const user = await getCurrentUser();
      if (!user) return; // not logged in, skip cloud sync

      // Get or create profile
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      const userId = profile?.id;
      if (!userId) {
        console.warn('[Supabase] No profile found for user, skipping cloud sync');
        return;
      }

      const record = toDreamsUpsertRow(dream, userId);
      const { error } = await supabaseClient.from('dreams').upsert(record);
      if (error) {
        console.error('[Supabase] upsert error:', error);
        throw new Error(error.message);
      }
      console.log('[Supabase] Dream synced:', dream.id, 'as', record.id);
    } catch (err) {
      console.error('[Supabase] sync error:', err);
      throw err;
    }
  };

  // Save dreams
  const saveDreamsToStorage = async (dreamsToSave: Dream[]) => {
    try {
      await window.storage?.set('dreams', JSON.stringify(dreamsToSave));
    } catch (error) {
      console.error('Storage error:', error);
    }
  };

  const generateDreamImageAsync = async (dreamData: any) => {
    setIsGeneratingImage(true);
    const perfCall = startAPICall('image_gen', 'generate-image', 'POST', route.screen);
    try {
      let basePrompt = dreamData.narrative || dreamData.nugget || dreamData.content || 'a surreal dreamscape';

      try {
        const profile = await loadCurrentUserProfile();
        basePrompt = enrichImagePromptWithProfile(basePrompt, profile);
      } catch (e) {
        console.warn('[Intelligence] Profile enrichment for image failed (non-blocking)');
      }

      const asset = await generateDreamImage(basePrompt);
      endAPICall(perfCall, 200);
      return {
        url: asset.url,
        prompt: asset.prompt,
        style: asset.style,
        generatedAt: asset.generatedAt,
        source: asset.source,
      };
    } catch (error) {
      endAPICall(perfCall, 0, String(error));
      console.error('Image generation error:', error);
      addToast({
        type: 'warning',
        message: 'Image generation failed. Open the dream and tap Generate to try again.',
      });
      return null;
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Create cryptographic watermark
  const createWatermark = (userId, dreamId) => {
    const timestamp = new Date().toISOString();
    const data = `${userId}:${dreamId}:${timestamp}`;
    
    // Simulated signature (in production, use actual crypto)
    const signature = `SHA256:${btoa(data).substring(0, 20)}...`;
    
    return {
      userId,
      dreamId,
      timestamp,
      signature,
      version: '1.0',
      rights: {
        creator: userId,
        license: 'loan', // not transfer
        revocable: true,
        duration: 'perpetual_unless_revoked'
      }
    };
  };

  // Calculate asset metadata
  const calculateAssetMetadata = (dreamData) => {
    // Rarity based on theme uniqueness
    const allThemes = dreams.flatMap(d => d.themes || []);
    const themeFrequency = dreamData.themes.reduce((sum, theme) => {
      const frequency = allThemes.filter(t => t === theme).length;
      return sum + (1 / (frequency + 1));
    }, 0) / dreamData.themes.length;
    
    const rarityScore = Math.min(themeFrequency, 1);
    
    // Uniqueness based on narrative complexity
    const uniquenessScore = Math.min(coerceNarrativeText(dreamData.narrative).length / 1000, 1);
    
    return {
      rarityScore: Number(rarityScore.toFixed(2)),
      uniquenessScore: Number(uniquenessScore.toFixed(2)),
      culturalContext: 'global', // Would be determined by user location
      potentialValue: rarityScore > 0.7 ? 'high' : rarityScore > 0.4 ? 'medium' : 'developing'
    };
  };

  // AI Analysis with image generation — uses dream-analyzer module (edge function + fallback)
  // Intelligence layer enhancement: load progressive user profile and enrich analysis
  // (client-side for now; full LLM referral will happen in intelligence edge per SPEC-16)
  const runDreamAnalysis = async (text: string) => {
    setIsProcessing(true);
    const perfCall = startAPICall('dream-analyzer', 'analyze-dream', 'POST', route.screen);
    try {
      const result = await analyzeDream(text);

      // Enrich with user profile (refers back to what we know about the user)
      try {
        const profile = await loadCurrentUserProfile();
        const enriched = enrichAnalysisWithProfile(result, profile);
        Object.assign(result, enriched);
        console.log('[Intelligence] Analysis enriched with user profile');
      } catch (profileErr) {
        console.warn('[Intelligence] Profile enrichment for analysis failed:', profileErr);
      }

      endAPICall(perfCall, 200);
      return result;
    } catch (error) {
      endAPICall(perfCall, 0, String(error));
      console.error('[runDreamAnalysis] Analysis error:', error);
      return {
        category: 'uncategorized',
        themes: ['dream', 'experience'],
        emotion: 'neutral',
        symbols: [],
        narrative: text,
        nugget: text.substring(0, 100),
        valence: 0,
        interpretation: {
          symbols: {},
          meaning: 'Analysis unavailable',
          commonPattern: ''
        }
      };
    } finally {
      setIsProcessing(false);
    }
  };

  // Speech transcription helper
  const startSpeechRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      addToast({ type: 'error', message: 'Voice recognition not supported. Please use Chrome or Edge browser.' });
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setCurrentEntry(transcript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setIsRecording(false);
      addToast({ type: 'error', message: `Voice recording error: ${event.error}` });
    };

    recognition.onend = () => setIsRecording(false);

    recognition.start();
    (window as any).currentRecognition = recognition;
  };

  const stopSpeechRecording = () => {
    const anyWindow = window as any;
    if (anyWindow.currentRecognition) {
      anyWindow.currentRecognition.stop();
      anyWindow.currentRecognition = null;
    }
    setIsRecording(false);
  };

  const startVideoCapture = async () => {
    console.log('[VideoCapture] Starting video capture...');
    if (!navigator.mediaDevices?.getUserMedia) {
      console.error('[VideoCapture] getUserMedia not supported');
      addToast({ type: 'error', message: 'Video capture is not supported in this browser.' });
      return;
    }

    try {
      console.log('[VideoCapture] Requesting camera/mic permissions...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true,
      });
      console.log('[VideoCapture] Stream obtained, tracks:', stream.getTracks().map(t => t.kind));

      setVideoStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log('[VideoCapture] Video element attached');
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus',
      });
      const chunks: Blob[] = [];
      let recordingStartTime = Date.now();
      console.log('[VideoCapture] MediaRecorder created with mime type:', recorder.mimeType);

      recorder.ondataavailable = (event) => {
        console.log('[VideoCapture] Data available:', event.data.size, 'bytes');
        if (event.data.size) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        console.log('[VideoCapture] Recorder stopped, total chunks:', chunks.length);
        const blob = new Blob(chunks, { type: 'video/webm' });
        console.log('[VideoCapture] Video blob created:', blob.size, 'bytes');
        const url = URL.createObjectURL(blob);
        console.log('[VideoCapture] Object URL created:', url.substring(0, 50));
        const duration = Math.floor((Date.now() - recordingStartTime) / 1000);
        setVideoDuration(duration);
        setRecordedVideoUrl(url);
        setVideoChunks(chunks);
        setIsVideoRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        setVideoStream(null);
        setMediaRecorder(null);
        console.log('[VideoCapture] Cleanup complete, duration:', duration, 'seconds');
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsVideoRecording(true);
      setVideoChunks([]);
      setRecordedVideoUrl(null);
      setVideoDuration(0);
      console.log('[VideoCapture] Recording started');
      startSpeechRecording();
    } catch (error) {
      console.error('[VideoCapture] Error:', error);
      addToast({ type: 'error', message: 'Unable to access camera. Please check permissions.' });
    }
  };

  const stopVideoCapture = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }

    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      setVideoStream(null);
    }

    stopSpeechRecording();
    setIsVideoRecording(false);
    setMediaRecorder(null);
  };

  const clearVideoCapture = () => {
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
    }
    stopVideoCapture();
    setRecordedVideoUrl(null);
    setVideoChunks([]);
  };

  useEffect(() => {
    if (captureMode !== 'video' && videoStream) {
      stopVideoCapture();
    }
  }, [captureMode]);

  useEffect(() => {
    return () => {
      stopVideoCapture();
      stopSpeechRecording();
    };
  }, []);

  // Handle audio import
  const handleAudioImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      addToast({ type: 'error', message: 'Please select an audio file.' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast({ type: 'error', message: 'File too large. Please select a file under 5MB.' });
      return;
    }

    setIsTranscribing(true);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const audioData = {
          id: Date.now(),
          name: file.name,
          data: e.target.result,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString()
        };

        const newAudioFiles = [audioData, ...audioFiles];
        setAudioFiles(newAudioFiles);
        
        try {
          await window.storage.set('audioFiles', JSON.stringify(newAudioFiles));
        } catch (error) {
          console.error('Audio storage error:', error);
        }

        await transcribeImportedAudio(audioData);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Import error:', error);
      addToast({ type: 'error', message: 'Error importing audio file. Please try again.' });
      setIsTranscribing(false);
    }
  };

  const transcribeImportedAudio = async (audioData: { name: string; size: number; data: string; type: string }) => {
    console.log('[DreamJournal] Starting audio transcription for:', audioData.name, 'size:', audioData.size);
    try {
      console.log('[DreamJournal] Fetching audio data...');
      const response = await fetch(audioData.data);
      const blob = await response.blob();
      console.log('[DreamJournal] Audio blob created:', blob.size, 'bytes, type:', blob.type);

      try {
        console.log('[DreamJournal] Attempting Whisper transcription...');
        const result = await transcribeWithWhisper(blob, {
          language: 'en',
          onProgress: (status) => console.log('[Transcription]', status),
        });

        console.log('[DreamJournal] Whisper result:', result.text?.length, 'chars, source:', result.source);

        if (result.text && result.text.length > 5) {
          setPendingTranscription({
            text: result.text,
            audioFile: audioData.name,
            timestamp: new Date().toISOString(),
          });
          setCurrentEntry(result.text);
          setIsTranscribing(false);
          return;
        }
        console.warn('[DreamJournal] Whisper returned empty or short text');
      } catch (err) {
        console.warn('[DreamJournal] Whisper failed:', err);
      }

      if (isSpeechRecognitionSupported()) {
        try {
          console.log('[DreamJournal] Falling back to Web Speech API...');
          const file = new File([blob], audioData.name, { type: audioData.type });
          const result = await transcribeWithWebSpeech(file);

          console.log('[DreamJournal] Web Speech result:', result.text?.length, 'chars');

          setPendingTranscription({
            text: result.text,
            audioFile: audioData.name,
            timestamp: new Date().toISOString(),
          });
          setCurrentEntry(result.text);
          setIsTranscribing(false);
          return;
        } catch (err) {
          console.warn('[DreamJournal] Web Speech failed:', err);
        }
      } else {
        console.warn('[DreamJournal] Web Speech API not supported');
      }

      console.warn('[DreamJournal] All transcription methods failed');
      setPendingTranscription({
        text: '',
        audioFile: audioData.name,
        timestamp: new Date().toISOString(),
      });
      setCurrentEntry('');
      setIsTranscribing(false);
      addToast({ type: 'warning', message: 'Could not transcribe audio automatically. Please type your dream manually.' });
    } catch (error) {
      console.error('[DreamJournal] Transcription error:', error);
      addToast({ type: 'error', message: 'Error transcribing audio. Please try again.' });
      setIsTranscribing(false);
    }
  };

  // Generate mock sleep data from wearable
  const generateMockSleepData = () => {
    return {
      bedtime: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      wakeTime: new Date().toISOString(),
      sleepDuration: 420 + Math.floor(Math.random() * 120),
      estimatedREM: 90 + Math.floor(Math.random() * 60),
      movementScore: Math.floor(Math.random() * 40) + 20,
      quality: Math.floor(Math.random() * 30) + 65,
      source: settings.wearableSync ? 'apple_watch' : 'estimated',
      stages: [
        { phase: 'awake', duration: 15 },
        { phase: 'light', duration: 180 },
        { phase: 'deep', duration: 90 },
        { phase: 'rem', duration: 105 },
        { phase: 'light', duration: 60 }
      ]
    };
  };

  // Real wearable sync using the library + service (wired from SPEC-13)
  const syncWearableData = async () => {
    try {
      const profile = await getProfile(); // from supabase client helpers
      if (!profile?.id) {
        addToast({ type: 'error', message: 'Please sign in to sync wearables.' });
        return;
      }

      // Load saved configs (in real app, load from user_settings or wearable_connections)
      // For now use the state wearableConfigs which can hold tokens from settings UI
      const enabledConfigs = wearableConfigs.filter(c => c.enabled && c.auth?.accessToken);

      if (enabledConfigs.length === 0) {
        addToast({ type: 'warning', message: 'No wearables connected. Go to Wearables settings to connect.' });
        return;
      }

      const { syncAndPersistWearableData } = await import('./lib/wearableService');
      const records = await syncAndPersistWearableData(profile.id, enabledConfigs, 30);

      if (records.length > 0) {
        setWearableData(records);
        try {
          await window.storage.set('wearableData', JSON.stringify(records));
        } catch {}
        addToast({ type: 'success', message: `Synced ${records.length} nights from wearable(s)! Data saved to your sleep log.` });
      } else {
        addToast({ type: 'info', message: 'No new wearable data found for the last 30 days.' });
      }
    } catch (error) {
      console.error('Wearable sync error:', error);
      addToast({ type: 'error', message: `Wearable sync failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  };

  // Correlate dreams with sleep data
  const getDreamSleepCorrelations = () => {
    const realDreams = dreams.filter(d => !d.isSample && d.sleepData);
    if (realDreams.length < 3) return null;

    const correlations = {
      remAndLucid: 0,
      deepAndPeaceful: 0,
      poorQualityAndNightmare: 0,
      highQualityAndPositive: 0
    };

    realDreams.forEach(dream => {
      if (dream.sleepData.estimatedREM > 100 && dream.category === 'lucid') {
        correlations.remAndLucid++;
      }
      if (dream.sleepData.quality > 80 && ['peaceful', 'adventure'].includes(dream.category)) {
        correlations.highQualityAndPositive++;
      }
      if (dream.sleepData.quality < 60 && dream.category === 'nightmare') {
        correlations.poorQualityAndNightmare++;
      }
    });

    const insights = [];
    if (correlations.remAndLucid > 0) {
      insights.push('Your lucid dreams tend to occur during longer REM periods');
    }
    if (correlations.highQualityAndPositive > 1) {
      insights.push('Better sleep quality correlates with more positive dreams');
    }
    if (correlations.poorQualityAndNightmare > 0) {
      insights.push('Poor sleep quality may trigger more intense or anxious dreams');
    }

    return insights.length > 0 ? insights : null;
  };

  const saveDream = async () => {
    console.log('[SaveDream] Starting save process...');
    console.log('[SaveDream] Current entry length:', currentEntry?.length);
    console.log('[SaveDream] Recorded video URL:', recordedVideoUrl ? 'present' : 'none');
    console.log('[SaveDream] Capture mode:', captureMode);
    
    const captureText = currentEntry.trim() || (recordedVideoUrl ? 'Video capture saved from the last session.' : '');
    if (!captureText && !recordedVideoUrl) {
      console.warn('[SaveDream] No content to save');
      return;
    }

    // Step 1: AI Analysis
    console.log('[SaveDream] Running dream analysis...');
    const analysis = await runDreamAnalysis(captureText);
    console.log('[SaveDream] Analysis complete, themes:', analysis.themes?.length);

    // Persist the journal entry before optional image work so a slow/failed
    // render cannot drop the dream.
    const dreamId = generateDreamId();
    const userId = 'user_' + Math.random().toString(36).substr(2, 9);

    // Step 4: Create watermark
    const watermark = createWatermark(userId, dreamId);

    // Step 5: Generate sleep data
    const sleepData = generateMockSleepData();
    
    console.log('[SaveDream] Creating dream object...');
    const newDream = {
      id: dreamId,
      date: new Date().toISOString(),
      content: currentEntry,
      ...analysis,
      sleepData,
      generatedImage: null,
      parallaxVideoUrl: null,
      watermark,
      assetMetadata: calculateAssetMetadata(analysis),
      sourceAudio: pendingTranscription?.audioFile || null,
      videoCapture: recordedVideoUrl ? { url: recordedVideoUrl, capturedAt: new Date().toISOString(), duration: videoDuration } : null,
      captureMode,
      capturedEmotions: capturedEmotions || null,
      context: contextData
    };

    // Feed emotional recognition outputs into the analysis flow / narrative
    if (capturedEmotions && capturedEmotions.dominantEmotion && newDream.interpretation) {
      const emoNote = ` (Facial emotion during entry: ${capturedEmotions.dominantEmotion})`;
      if (newDream.interpretation.meaning) newDream.interpretation.meaning += emoNote;
      if (newDream.narrative) newDream.narrative += emoNote;
      newDream.emotion = capturedEmotions.dominantEmotion;
      console.log('[SaveDream] Emotional recog output merged into narrative/emotion');
    }

    console.log('[SaveDream] Dream object created with videoCapture:', newDream.videoCapture ? 'yes' : 'no');
    
    const updatedDreams = [newDream, ...dreams.filter(d => !d.isSample)];
    console.log('[SaveDream] Updating dreams array, total count:', updatedDreams.length);
    setDreams(updatedDreams);
    
    console.log('[SaveDream] Saving to storage...');
    await saveDreamsToStorage(updatedDreams);
    console.log('[SaveDream] Storage save complete');

    syncDreamToSupabase(newDream).catch((err: unknown) => {
      console.warn('[SaveDream] Supabase sync error:', err);
      addToast({ type: 'warning', message: 'Saved on this device, but cloud sync failed.' });
    });

    if (settings.imageGeneration) {
      generateDreamImageAsync(analysis).then(async (generatedImage) => {
        let parallaxVideoUrl = null;
        if (generatedImage?.url && !generatedImage.url.startsWith('data:')) {
          try {
            parallaxVideoUrl = await generateParallaxVideo(
              generatedImage.url,
              generatedImage.url,
              { duration: 5, fps: 24, amplitude: 0.1, direction: 'circular' },
            );
          } catch (err) {
            console.warn('[SaveDream] Parallax video generation failed:', err);
          }
        }
        const withImage = { ...newDream, generatedImage, parallaxVideoUrl };
        setDreams((prev) => {
          const next = prev.map((d) => (d.id === dreamId ? withImage : d));
          saveDreamsToStorage(next).catch(console.error);
          return next;
        });
        syncDreamToSupabase(withImage).catch(console.error);
      }).catch((err) => {
        console.warn('[SaveDream] Background image failed:', err);
      });
    }

    // Update iterative profile (client-side merge, no AI yet)
    try {
      const user = await getCurrentUser();
      if (user) {
        const { data: profile } = await supabaseClient.from('profiles').select('id').eq('auth_user_id', user.id).single();
        if (profile?.id) {
          await updateUserProfileFromDream(profile.id, newDream, newDream.sleepData, newDream.generatedImage);
        }
      }
    } catch (e) {
      console.warn('[Profile] Non-blocking update failed:', e);
    }

    await checkAchievements(updatedDreams);
    
    setCurrentEntry('');
    setPendingTranscription(null);
    setRecordedVideoUrl(null);
    setCapturedEmotions(null);
    setCaptureMode('text');
    setContextData({ mood: '', yesterdayEvents: '', sleepQuality: 3 });
    console.log('[SaveDream] Navigating to journal...');
    navigate('journal');

    // Show gentle confirmation
    setShowAchievement({
      id: 'asset_created',
      title: 'Journal entry saved',
      description: `Pattern depth ${newDream.assetMetadata.rarityScore}`,
      icon: '💎'
    });
    setTimeout(() => setShowAchievement(null), 3000);
    console.log('[SaveDream] Save complete!');
  };

  // Handle extracted dream entries from photo upload
  const handleDreamsExtracted = async (entries: ExtractedDreamEntry[]) => {
    const currentDreams = dreams;
    const newDreams: typeof currentDreams = [];

    for (const entry of entries) {
      const dreamId = generateDreamId();
      const userId = 'user_' + Math.random().toString(36).substr(2, 9);
      const sleepData = generateMockSleepData();
      const analysis = entry.analysis;

      // Generate image if enabled
      let generatedImage = null;
      if (settings.imageGeneration && analysis) {
        try {
          generatedImage = await generateDreamImageAsync(analysis);
        } catch (err) {
          console.error('Image generation failed for photo import:', err);
        }
      }

      const newDream = {
        id: dreamId,
        date: entry.dreamDate || new Date().toISOString(),
        content: entry.editedText,
        category: analysis?.category || 'uncategorized',
        themes: analysis?.themes || [],
        emotion: analysis?.emotion || 'neutral',
        symbols: analysis?.symbols || [],
        narrative: analysis?.narrative || entry.editedText,
        nugget: analysis?.nugget || entry.editedText.substring(0, 100),
        interpretation: analysis?.interpretation || {
          symbols: {},
          meaning: 'Analysis unavailable',
          commonPattern: '',
        },
        sleepData,
        generatedImage,
        watermark: createWatermark(userId, dreamId),
        assetMetadata: calculateAssetMetadata({
          themes: analysis?.themes || [],
          narrative: analysis?.narrative || entry.editedText,
        }),
        sourcePhotos: entry.photoIds,
        captureMode: 'photo' as const,
        context: contextData,
        isSample: false,
      };

      newDreams.push(newDream);
    }

    const updatedDreams = [...newDreams, ...currentDreams.filter((d: any) => !d.isSample)];
    setDreams(updatedDreams);
    await saveDreamsToStorage(updatedDreams);
    await checkAchievements(updatedDreams);

    // Sync imported dreams to Supabase (non-blocking)
    for (const nd of newDreams) {
      syncDreamToSupabase(nd).catch((err: unknown) => {
        console.warn('[PhotoImport] Supabase sync error:', err);
      });
    }

    setShowAchievement({
      id: 'photo_import',
      title: `${newDreams.length} dream${newDreams.length !== 1 ? 's' : ''} imported`,
      description: 'From your journal photos',
      icon: '📸',
    });
    setTimeout(() => setShowAchievement(null), 3000);

    navigate('journal');
  };

  const cancelDream = () => {
    setCurrentEntry('');
    setPendingTranscription(null);
    setRecordedVideoUrl(null);
    setVideoChunks([]);
    setCaptureMode('text');
    stopVideoCapture();
    stopSpeechRecording();
    navigate('home');
  };

  const persistAchievements = async (updated: UnlockedAchievement[]) => {
    setAchievements(updated);
    try {
      await window.storage?.set('achievements', JSON.stringify(updated));
    } catch (error) {
      console.error('Achievement storage error:', error);
    }
  };

  const unlockAndNotify = async (id: string) => {
    const result = unlockAchievement(achievements, id);
    if (result.newlyUnlocked.length === 0) return;
    await persistAchievements(result.unlocked);
    const first = result.newlyUnlocked[0];
    setShowAchievement({
      id: first.id,
      title: first.title,
      description: first.description,
      icon: first.icon,
    });
    setTimeout(() => setShowAchievement(null), 3000);
  };

  // Check achievements after journal / dream updates
  const checkAchievements = async (newDreams) => {
    const result = evaluateDreamAchievements(achievements, newDreams, calculateStreak);
    if (result.newlyUnlocked.length === 0) return;

    await persistAchievements(result.unlocked);
    const first = result.newlyUnlocked[0];
    setShowAchievement({
      id: first.id,
      title: first.title,
      description: first.description,
      icon: first.icon,
    });
    setTimeout(() => setShowAchievement(null), 3000);
  };

  const findSimilarDreams = (dream) => {
    return dreams
      .filter(d => d.id !== dream.id && !d.isSample)
      .map(d => {
        const sharedThemes = dream.themes?.filter(t => d.themes?.includes(t)).length || 0;
        const sameCategory = d.category === dream.category ? 1 : 0;
        const similarity = sharedThemes + sameCategory;
        return { dream: d, similarity };
      })
      .filter(item => item.similarity > 0)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);
  };

  const getSleepInsights = () => {
    const realDreams = dreams.filter(d => !d.isSample);
    if (realDreams.length === 0) return null;

    const categories = realDreams.reduce((acc, d) => {
      acc[d.category] = (acc[d.category] || 0) + 1;
      return acc;
    }, {});

    const allThemes = realDreams.flatMap(d => d.themes || []);
    const themeCount = allThemes.reduce((acc, t) => {
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});

    const topThemes = Object.entries(themeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const avgSleepQuality = realDreams.reduce((sum, d) => sum + (d.sleepData?.quality || 0), 0) / realDreams.length;
    const avgREMTime = realDreams.reduce((sum, d) => sum + (d.sleepData?.estimatedREM || 0), 0) / realDreams.length;
    const avgRarity = realDreams.reduce((sum, d) => sum + (d.assetMetadata?.rarityScore || 0), 0) / realDreams.length;

    const moodTimeline = realDreams.slice(0, 7).reverse().map(d => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      emotion: d.emotion,
      quality: d.sleepData?.quality || 0
    }));

    return {
      totalDreams: realDreams.length,
      mostCommonCategory: Object.entries(categories).sort((a, b) => b[1] - a[1])[0],
      topThemes,
      avgSleepQuality: Math.round(avgSleepQuality),
      avgREMTime: Math.round(avgREMTime),
      avgRarity: avgRarity.toFixed(2),
      currentStreak: calculateStreak(realDreams),
      moodTimeline,
      totalAssetValue: realDreams.length * 10 // Simulated value
    };
  };

  const calculateStreak = (dreamsList) => {
    if (dreamsList.length === 0) return 0;
    let streak = 1;
    const sortedDreams = [...dreamsList].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    for (let i = 1; i < sortedDreams.length; i++) {
      const prevDate = new Date(sortedDreams[i - 1].date);
      const currDate = new Date(sortedDreams[i].date);
      const diffDays = Math.floor((prevDate - currDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 1) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const getCircadianRecommendations = () => {
    const wakeTime = new Date(`2024-01-01T${settings.alarmTime}`);
    const recommendations = [];
    
    const cycles = settings.circadianGoal === 'better_dreams' ? [6, 5] : [5, 6];
    
    cycles.forEach(cycleCount => {
      const totalMinutes = cycleCount * 90 + 15;
      const bedtime = new Date(wakeTime.getTime() - totalMinutes * 60000);
      
      recommendations.push({
        cycles: cycleCount,
        totalHours: (totalMinutes / 60).toFixed(1),
        bedtime: bedtime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        wakeTime: wakeTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        quality: cycleCount >= 5 ? 'optimal' : 'good',
        remPrediction: cycleCount * 20
      });
    });
    
    return recommendations;
  };

  const shareDream = (dream) => {
    setSelectedDream(dream);
    setShowShareModal(true);
  };

  // ── NFT Minting ──────────────────────────────────────────────
  const handleOpenMintModal = (dream) => {
    setMintError(null);
    setMintedNFT(null);
    const w = getOrCreateWallet();
    setWallet(w);
    setShowMintModal(true);
  };

  const handleMintNFT = async (dream) => {
    if (!wallet) return;
    setMintError(null);
    setIsMinting(true);

    try {
      const nft = createDreamNFT(
        {
          id: dream.id,
          content: dream.content,
          category: dream.category,
          themes: dream.themes || [],
          emotion: dream.emotion || 'neutral',
          symbols: dream.symbols || [],
          narrative: dream.narrative || dream.content,
          nugget: dream.nugget || dream.content.substring(0, 100),
          generatedImage: dream.generatedImage ? { url: dream.generatedImage.url } : undefined,
        },
        wallet
      );

      const minted = await mintNFT(nft);
      saveNFT(minted);
      setMintedNFT(minted);
    } catch (err) {
      setMintError(err instanceof Error ? err.message : 'Minting failed');
    } finally {
      setIsMinting(false);
    }
  };

  const saveSettingsToStorage = async (settingsToSave) => {
    try {
      await window.storage.set('settings', JSON.stringify(settingsToSave));
    } catch (error) {
      console.error('Settings storage error:', error);
    }
  };

  const savePrivacySettings = async (settings) => {
    try {
      await window.storage.set('privacySettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Privacy settings error:', error);
    }
  };

  const acceptTerms = async () => {
    try {
      await window.storage.set('termsAccepted', JSON.stringify(true));
      setHasAcceptedTerms(true);
      setShowTerms(false);
    } catch (error) {
      console.error('Terms acceptance error:', error);
    }
  };

  // Full data deletion (GDPR Right to be Forgotten)
  const deleteAllUserData = async () => {
    if (!confirm('⚠️ DELETE ALL DATA?\n\nThis will permanently delete:\n• All dreams and assets\n• All metadata and analysis\n• Wearable data\n• Settings and preferences\n• NFT watermarks\n\nThis action CANNOT be undone and complies with GDPR Article 17 (Right to Erasure).\n\nType DELETE to confirm.')) {
      return;
    }

    const confirmation = prompt('Type DELETE to confirm permanent deletion:');
    if (confirmation !== 'DELETE') {
      addToast({ type: 'info', message: 'Deletion cancelled.' });
      return;
    }

    try {
      // Delete all stored data
      await window.storage.delete('dreams');
      await window.storage.delete('wearableData');
      await window.storage.delete('achievements');
      await window.storage.delete('settings');
      await window.storage.delete('privacySettings');
      await window.storage.delete('audioFiles');
      await window.storage.delete('termsAccepted');
      await window.storage.delete('photoUploads');
      await window.storage.delete('ocrResults');
      await window.storage.delete('sleep_sessions');
      await window.storage.delete('sleep_settings');
      await window.storage.delete('sleep_privacy_consent');
      await window.storage.delete('sleep_completed_sessions');

      // Reset state
      setDreams([]);
      setWearableData([]);
      setAchievements([]);
      setAudioFiles([]);
      setHasAcceptedTerms(false);
      
      addToast({ type: 'success', message: 'All data deleted. Your data has been permanently removed from storage.' });
      
      // Show terms again for fresh start
      setShowTerms(true);
    } catch (error) {
      console.error('Deletion error:', error);
      addToast({ type: 'error', message: 'Error during deletion. Some data may remain.' });
    }
  };

  // Export all data (GDPR Right to Data Portability)
  const exportAllData = async () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      license: 'User owns all data under CC-BY-4.0 or chosen license',
      dreams: dreams.filter(d => !d.isSample),
      wearableData,
      achievements,
      settings,
      privacySettings,
      metadata: {
        totalDreams: dreams.filter(d => !d.isSample).length,
        totalAssets: dreams.filter(d => !d.isSample && d.generatedImage).length,
        dataProcessors: ['Claude AI (Anthropic)', 'Local Browser Storage'],
        storageLocation: 'Browser IndexedDB (local device)',
        encryption: 'At rest (browser security)',
        transmissionProtocol: 'HTTPS/TLS 1.3'
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dreamscape-full-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    addToast({ type: 'success', message: 'Full data export complete. Your data has been downloaded.' });
  };

  // Get NFT component breakdown
  const getNFTComponents = (dream) => {
    return [
      {
        id: `${dream.id}-narrative`,
        type: 'Primary Asset',
        component: 'Dream Narrative',
        description: 'AI-expanded narrative text',
        size: `${dream.narrative?.length || 0} characters`,
        ownership: 'User (100%)',
        license: 'Loan, revocable',
        onChain: false,
        readyForMinting: true
      },
      {
        id: `${dream.id}-image`,
        type: 'Visual Asset',
        component: 'Generated Image',
        description: 'AI-generated visual representation',
        size: 'Varies (image file)',
        ownership: 'User (100%)',
        license: 'Loan, revocable',
        onChain: false,
        readyForMinting: !!dream.generatedImage
      },
      {
        id: `${dream.id}-metadata`,
        type: 'Metadata',
        component: 'Analysis & Themes',
        description: 'Categories, symbols, emotions, interpretation',
        size: `${JSON.stringify(dream.interpretation || {}).length} bytes`,
        ownership: 'User (100%)',
        license: 'Loan, revocable',
        onChain: false,
        readyForMinting: true
      },
      {
        id: `${dream.id}-biometric`,
        type: 'Biometric Data',
        component: 'Sleep Data',
        description: 'Wearable sleep tracking data',
        size: `${JSON.stringify(dream.sleepData || {}).length} bytes`,
        ownership: 'User (100%)',
        license: 'Private (not shared)',
        onChain: false,
        readyForMinting: false,
        note: 'Biometric data typically not included in public NFT'
      },
      {
        id: `${dream.id}-watermark`,
        type: 'Provenance',
        component: 'Cryptographic Watermark',
        description: 'Signature proving ownership',
        size: '256 bytes',
        ownership: 'User (immutable)',
        license: 'Public verification',
        onChain: false,
        readyForMinting: true
      }
    ];
  };

  const filteredDreams = dreams.filter((dream) => {
    const matchesCategory = filterCategory === 'all' || dream.category === filterCategory;
    return matchesCategory;
  });

  const favouriteDreams = useMemo(
    () => dreams.filter((d) => favouriteIds.includes(d.id)),
    [dreams, favouriteIds],
  );

  const handleToggleFavourite = useCallback((dreamId: string) => {
    setFavouriteIds((prev) => {
      const next = toggleFavouriteId(prev, dreamId);
      void saveFavouriteIds(next);
      return next;
    });
  }, []);

  const insights = getSleepInsights();
  const recommendations = getCircadianRecommendations();
  const correlations = getDreamSleepCorrelations();

  return (
    <>
      {isAppLoading && <AppLoadingScreen message={loadingMessage} />}
    <Shell
      active={route.screen}
      onNavigate={navigate}
      onOpenProfile={() => setShowProfile(true)}
    >


      {(isProcessing || isGeneratingImage) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-cream/95 p-6 shadow-2xl shadow-ink/10">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-muted">Saving dream</p>
                <h3 className="text-xl font-semibold text-ink">{isProcessing ? 'Reconstructing your experience…' : 'Painting your dream visualization…'}</h3>
              </div>
              <div className="w-12 h-12 rounded-3xl bg-sage/10 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-sage border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
            <div className="space-y-3 text-sm text-muted">
              <p>{isProcessing ? 'Finding themes, tone, and symbols in your entry.' : 'Rendering the mood, color, and composition for your dream image.'}</p>
              <div className="rounded-2xl border border-line bg-parchment/90 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted mb-2">What we are doing</div>
                <ul className="space-y-2">
                  <li>• Identifying the story and emotion</li>
                  <li>• Verifying what feels true to you</li>
                  <li>• Preparing a visual companion if enabled</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-10 pb-6">
        {route.screen === 'home' && (
          <HomeScreen
            navigate={navigate}
            insights={insights}
            filteredDreams={filteredDreams}
            lastDream={lastDream}
            reflectionQuote={reflectionQuote}
            reflectionMood={reflectionMood}
            setReflectionMood={handleReflectionMood}
            reflectionEnergyLevel={reflectionEnergyLevel}
            onReflectionEnergyLevel={handleReflectionEnergyLevel}
            checkInSaved={checkInSaved}
            reflectionSleepData={reflectionSleepData}
            dailyEducation={dailyEducation}
            getCategoryBadgeClass={getCategoryBadgeClass}
            getEmotionEmoji={getEmotionEmoji}
          />
        )}

        {showDailyReflection && (
          <DailyReflectionCard
            quote={reflectionQuote}
            education={dailyEducation}
            lastDream={lastDream}
            sleep={
              reflectionSleepData
                ? {
                    durationMinutes: reflectionSleepData.sleepDuration,
                    quality: reflectionSleepData.quality || reflectionSleepData.sleepQuality,
                    remMinutes: reflectionSleepData.estimatedREM,
                    source: reflectionSleepData.source,
                  }
                : null
            }
            onDismiss={() => {
              dismissReflectionForToday();
              setShowDailyReflection(false);
            }}
            onOpenDream={(dreamId) => {
              setShowDailyReflection(false);
              navigate('dream', dreamId);
            }}
            onJournalAboutQuote={() => {
              setShowDailyReflection(false);
              dismissReflectionForToday();
              navigate('record');
            }}
            onGoHome={() => {
              dismissReflectionForToday();
              setShowDailyReflection(false);
              navigate('home');
            }}
          />
        )}

        {route.screen === 'journal' && (
          <JournalScreen
            dreams={dreams}
            filterCategory={filterCategory}
            setFilterCategory={setFilterCategory}
            isLoadingDreams={isLoadingDreams}
            dreamError={dreamError}
            onDismissError={() => setDreamError(null)}
            onRetry={() => {
              setDreamError(null);
              setIsLoadingDreams(true);
              window.location.reload();
            }}
            onNavigate={navigate}
            onShare={shareDream}
            favouriteIds={favouriteIds}
            onToggleFavourite={handleToggleFavourite}
            getCategoryBadgeClass={getCategoryBadgeClass}
            getEmotionEmoji={getEmotionEmoji}
            ErrorBanner={ErrorBanner}
            LoadingOverlay={LoadingOverlay}
          />
        )}

        {route.screen === 'favourites' && (
          <JournalScreen
            dreams={favouriteDreams}
            filterCategory="all"
            setFilterCategory={() => {}}
            isLoadingDreams={isLoadingDreams}
            dreamError={dreamError}
            onDismissError={() => setDreamError(null)}
            onRetry={() => {
              setDreamError(null);
              setIsLoadingDreams(true);
              window.location.reload();
            }}
            onNavigate={navigate}
            onShare={shareDream}
            favouriteIds={favouriteIds}
            onToggleFavourite={handleToggleFavourite}
            getCategoryBadgeClass={getCategoryBadgeClass}
            getEmotionEmoji={getEmotionEmoji}
            ErrorBanner={ErrorBanner}
            LoadingOverlay={LoadingOverlay}
            title="Favourites"
            subtitle="Dreams you have starred for quick return."
            hideFilter
          />
        )}

        {route.screen === 'education' && (
          <EducationDetailScreen
            education={
              (educationModuleOverride
                ? SLEEP_EDUCATION_CONTENT.find((m) => m.id === educationModuleOverride)
                : null) || dailyEducation
            }
            onBack={() => {
              setEducationModuleOverride(null);
              navigate('home');
            }}
            onSelectModule={(mod) => setEducationModuleOverride(mod.id)}
          />
        )}

        {route.screen === 'tracker' && (
          <TrackerScreen
            dreams={dreams}
            settings={settings}
            wearableData={wearableData}
            onOpenDream={(dreamId) => navigate('dream', dreamId)}
            onConnectTracker={() => navigate('wearables')}
            onOpenEducation={() => navigate('education')}
            onLogDream={(dateKey) => {
              // Actually log a dream for this tracker date (fixes non-working + symbol / log from tracker)
              const dreamId = generateDreamId();
              const newDream: any = {
                id: dreamId,
                date: dateKey,
                content: `Dream logged via tracker on ${dateKey}`,
                category: 'personal',
                themes: [],
                emotion: 'neutral',
                symbols: ['🌙'],
                narrative: 'Dream entry created from sleep tracker.',
                nugget: 'Tracked dream',
                interpretation: {
                  symbols: {},
                  meaning: 'Logged directly from the sleep performance tracker.',
                  commonPattern: '',
                },
                isSample: false,
                captureMode: 'text',
              };
              const updatedDreams = [newDream, ...dreams];
              setDreams(updatedDreams);
              saveDreamsToStorage(updatedDreams).catch(console.error);
              // Attach to summary if possible (via hook logic on next render)
              navigate('dream', dreamId);
            }}
          />
        )}

        {route.screen === 'assets' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Your Dream Assets</h2>
            
            {/* Asset Overview */}
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">Asset Portfolio</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-3xl font-bold">{dreams.filter(d => !d.isSample).length}</div>
                  <div className="text-sm text-purple-100">Total Assets</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">{insights?.avgRarity || '0.00'}</div>
                  <div className="text-sm text-purple-100">Avg Rarity</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">${insights?.totalAssetValue || 0}</div>
                  <div className="text-sm text-purple-100">Est. Value</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">{dreams.filter(d => !d.isSample && d.generatedImage).length}</div>
                  <div className="text-sm text-purple-100">With Images</div>
                </div>
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-10">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-300" />
                Asset Rights & Provenance
              </h3>
              <div className="text-sm space-y-2 text-purple-200">
                <p>• Every dream is cryptographically watermarked</p>
                <p>• You retain full ownership and control</p>
                <p>• Dreams are licensed, never sold</p>
                <p>• Revocable at any time</p>
                <p>• NFT minting ready when you choose</p>
              </div>
            </div>

            {/* Dream Assets Grid */}
            <div>
              <h3 className="font-semibold mb-3">Your Dream Assets</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dreams.filter(d => !d.isSample).map(dream => (
                  <div 
                    key={dream.id}
                    onClick={() => {
                      setSelectedDream(dream);
                      setShowAssetInfo(true);
                    }}
                    className="bg-white bg-opacity-10 rounded-xl overflow-hidden cursor-pointer hover:bg-opacity-15 transition"
                  >
                    {dream.generatedImage && (
                      <img 
                        src={dream.generatedImage.url} 
                        alt="Dream visualization"
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`${getCategoryBadgeClass(dream.category)} px-2 py-1 rounded text-xs font-semibold`}>
                          {dream.category}
                        </span>
                        <div className="flex items-center gap-1 text-xs">
                          <Shield className="w-3 h-3" />
                          Rarity: {dream.assetMetadata?.rarityScore}
                        </div>
                      </div>
                      <p className="text-sm italic">"{dream.nugget?.substring(0, 60)}..."</p>
                      <div className="text-xs text-purple-200 mt-2">
                        {new Date(dream.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {(route.screen === 'insights' || route.screen === 'dashboard') && (
          <InsightsScreen
            insights={insights}
            correlations={correlations}
            EmptyState={EmptyState}
            InsightCard={InsightCard}
          />
        )}

        {route.screen === 'wearables' && (
          <div className="space-y-5">
            <div>
              <h2 className="font-serif text-2xl font-medium text-ink">Wearables</h2>
              <p className="text-sm text-muted mt-1">Connect your sleep devices for automatic tracking</p>
            </div>

            {/* Quick test helper for wearable integrations */}
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                const sampleRecords = Array.from({ length: 5 }).map((_, i) => {
                  const d = new Date(today.getTime() - i * 86400000);
                  const dateStr = d.toISOString().split('T')[0];
                  return {
                    date: dateStr,
                    bedtime: new Date(d.getTime() - 8 * 3600 * 1000).toISOString(),
                    wakeTime: d.toISOString(),
                    durationMinutes: 450 + Math.floor(Math.random() * 60),
                    remMinutes: 80 + Math.floor(Math.random() * 30),
                    deepMinutes: 70 + Math.floor(Math.random() * 25),
                    lightMinutes: 200,
                    awakeMinutes: 20,
                    efficiency: 85 + Math.floor(Math.random() * 10),
                    score: 75 + Math.floor(Math.random() * 20),
                    source: ['oura', 'fitbit', 'garmin'][i % 3] as any,
                  };
                });
                setWearableData(sampleRecords);
                window.storage?.set?.('wearableData', JSON.stringify(sampleRecords)).catch(() => {});
                addToast({ type: 'success', message: 'Loaded sample wearable data for testing integrations.' });
              }}
              className="text-xs px-3 py-1 rounded-full border border-line bg-parchment hover:bg-cream text-muted"
            >
              Load sample data (test integrations)
            </button>

            {/* Wearable connection settings */}
            <WearableSettings
              configs={wearableConfigs}
              onConfigsChange={setWearableConfigs}
              onSleepDataReceived={(records) => {
                setWearableData(records);
                window.storage.set('wearableData', JSON.stringify(records)).catch(console.error);
              }}
              clientIdMap={wearableClientIdMap}
              redirectUri={wearableRedirectUri}
              initialConnectProvider={wearableConnectProvider}
              onInitialConnectHandled={() => {
                setWearableConnectProvider(null);
                setWearableOAuthError(null);
              }}
              oauthError={wearableOAuthError}
            />

            {/* Recent Sleep Sessions from wearables */}
            {wearableData.length > 0 && (
              <div className="rounded-2xl border border-line bg-cream p-4 shadow-paper">
                <h3 className="font-semibold text-ink mb-3 text-sm">Recent Sleep Sessions</h3>
                <div className="space-y-2">
                  {wearableData.slice(0, 7).map((session, i) => (
                    <div key={`${session.date}-${i}`} className="rounded-xl border border-line bg-parchment p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-ink">
                          {new Date(session.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-[10px] uppercase tracking-wide text-muted bg-parchment border border-line px-2 py-0.5 rounded">
                          {session.source}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div>
                          <div className="text-muted">Duration</div>
                          <div className="font-semibold text-ink">{Math.floor(session.durationMinutes / 60)}h {session.durationMinutes % 60}m</div>
                        </div>
                        <div>
                          <div className="text-muted">REM</div>
                          <div className="font-semibold text-ink">{session.remMinutes}m</div>
                        </div>
                        <div>
                          <div className="text-muted">Deep</div>
                          <div className="font-semibold text-ink">{session.deepMinutes}m</div>
                        </div>
                        <div>
                          <div className="text-muted">Score</div>
                          <div className="font-semibold text-ink">{session.score}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {route.screen === 'achievements' && (
          <AchievementsScreen
            achievements={achievements}
            onShareReferral={() => {
              // Sharing invite counts toward social virality (not first asset share)
            }}
          />
        )}

        {route.screen === 'privacy' && (
          <PrivacyScreen
            privacySettings={privacySettings}
            setPrivacySettings={setPrivacySettings}
            savePrivacySettings={savePrivacySettings}
            exportAllData={exportAllData}
            deleteAllUserData={deleteAllUserData}
            setShowLicensing={setShowLicensing}
            setShowTerms={setShowTerms}
          />
        )}

      {/* Record (full page) — uses DreamCapture with pipeline progress */}
      {(route.screen === 'record' || route.screen === 'capture') && (
        <RecordScreen
          onComplete={async (result, text) => {
            let newDream;

            // Audio pipeline already built the XAEL (record or audio upload)
            if (result.id && result.captureMode === 'audio' && result.narrative) {
              newDream = result;
            } else if (result.uploadedText && text.trim().length >= 10) {
              const dreamId = generateDreamId();
              const sourceText = text.trim();
              newDream = {
                id: dreamId,
                date: new Date().toISOString(),
                content: sourceText,
                category: 'uncategorized',
                themes: ['imported'],
                emotion: 'neutral',
                symbols: [],
                narrative: sourceText,
                nugget: sourceText.slice(0, 90) + (sourceText.length > 90 ? '…' : ''),
                interpretation: {
                  symbols: {},
                  meaning: 'Analysing your uploaded dream…',
                  commonPattern: '',
                },
                captureMode: 'text',
                sourceFile: result.fileName,
                generatedImage: null,
                isSample: false,
              };
              const uploadedDreams = [newDream, ...dreams.filter((d) => !d.isSample)];
              setDreams(uploadedDreams);
              await saveDreamsToStorage(uploadedDreams);
              syncDreamToSupabase(newDream).catch((err: unknown) => {
                console.warn('[Upload] Supabase sync error:', err);
              });
              navigate('dream', dreamId);
              addToast({ type: 'info', message: 'Dream saved. Running analysis and image generation…' });

              (async () => {
                try {
                  const { analysis, generatedImage, scenes } = await processTextJournal(sourceText);
                  let image = generatedImage;
                  if (image?.url?.startsWith('data:')) {
                    try {
                      const stored = await persistUserMedia({
                        blob: await (await fetch(image.url)).blob(),
                        kind: 'image',
                        dreamId,
                      });
                      if (stored?.url) image = { ...image, url: stored.url };
                    } catch (err) {
                      console.warn('[Upload] image persist failed:', err);
                    }
                  }
                  const finalDream = {
                    ...newDream,
                    ...analysis,
                    content: sourceText,
                    generatedImage: image,
                    scenes,
                  };
                  setDreams((prev) => {
                    const next = prev.map((d) => (d.id === dreamId ? finalDream : d));
                    saveDreamsToStorage(next).catch(console.error);
                    return next;
                  });
                  syncDreamToSupabase(finalDream).catch(console.error);
                  addToast({ type: 'success', message: 'Analysis and image are ready.' });
                } catch (err) {
                  console.error('[Upload] processing failed:', err);
                  addToast({
                    type: 'warning',
                    message: err instanceof Error ? err.message : 'Saved the text, but analysis/image failed. Try Regenerate.',
                  });
                }
              })();
              return;
            } else if (result.videoUrl || result.videoBlob) {
              stopCaptureMedia();
              const dreamId = generateDreamId();
              const localVideoUrl = result.videoUrl || (result.videoBlob ? URL.createObjectURL(result.videoBlob) : '');
              const uploaded = result.videoBlob
                ? await persistUserMedia({ blob: result.videoBlob, kind: 'video', dreamId })
                : null;
              newDream = {
                id: dreamId,
                date: new Date().toISOString(),
                content: 'Processing your video dream…',
                category: 'video-journal',
                themes: ['video', 'personal-recording'],
                emotion: 'neutral',
                symbols: [],
                narrative: 'Video journal recording (processing in progress)',
                nugget: `Video journal (${Math.floor(result.duration / 60)}:${(result.duration % 60).toString().padStart(2, '0')})`,
                interpretation: { symbols: {}, meaning: 'Processing your recording', commonPattern: '' },
                captureMode: 'video',
                videoCapture: {
                  url: uploaded?.url || localVideoUrl,
                  path: uploaded?.path,
                  capturedAt: new Date().toISOString(),
                  duration: result.duration,
                  thumbnail: result.thumbnail,
                  mediaId: result.mediaId,
                },
                mediaStoragePath: uploaded?.path || null,
                generatedImage: result.thumbnail
                  ? { url: result.thumbnail, prompt: 'Video thumbnail', style: 'photo', generatedAt: new Date().toISOString(), source: 'video-capture' }
                  : null,
                isSample: false,
              };

              const updatedDreams = [newDream, ...dreams];
              setDreams(updatedDreams);
              await saveDreamsToStorage(updatedDreams);
              syncDreamToSupabase(newDream).catch((err: unknown) => {
                console.warn('[RecordScreen] Supabase sync error:', err);
              });
              navigate('journal');
              addToast({
                type: 'info',
                message: uploaded?.path
                  ? 'Video saved. Transcribing and generating your image…'
                  : 'Video saved on this device. Cloud upload failed — processing locally.',
              });

              (async () => {
                try {
                  const { dream: processedDream } = await processVideoJournal({
                    videoBlob: result.videoBlob,
                    videoUrl: uploaded?.url || localVideoUrl,
                    thumbnail: result.thumbnail,
                    duration: result.duration,
                    mediaId: result.mediaId,
                    hasAudio: result.hasAudio,
                  });

                  let image = processedDream.generatedImage;
                  if (image?.url?.startsWith('data:')) {
                    const storedImage = await persistUserMedia({
                      blob: await (await fetch(image.url)).blob(),
                      kind: 'image',
                      dreamId,
                    });
                    if (storedImage?.url) image = { ...image, url: storedImage.url };
                  }

                  const finalDream = {
                    ...processedDream,
                    id: dreamId,
                    videoCapture: {
                      ...processedDream.videoCapture,
                      url: uploaded?.url || processedDream.videoCapture.url,
                      path: uploaded?.path,
                      mediaId: result.mediaId,
                    },
                    mediaStoragePath: uploaded?.path || null,
                    generatedImage: image,
                  };

                  setDreams((prev) => {
                    const next = prev.map((d) => (d.id === dreamId ? finalDream : d));
                    saveDreamsToStorage(next).catch(console.error);
                    return next;
                  });
                  syncDreamToSupabase(finalDream).catch(console.error);
                  addToast({ type: 'success', message: 'Your video dream is ready in the journal.' });
                } catch (error) {
                  console.error('[RecordScreen] Video journal processing failed:', error);
                  addToast({ type: 'warning', message: 'Video is saved. Transcription or image generation failed — open the dream to retry.' });
                } finally {
                  stopCaptureMedia();
                }
              })();
              return;
            } else if (result.audioBlob || result.audioUrl) {
              stopCaptureMedia();
              const audioDuration = result.duration || 0;
              const dreamId = generateDreamId();
              newDream = {
                id: dreamId,
                date: new Date().toISOString(),
                content: 'Processing your audio dream…',
                category: 'audio-journal',
                themes: ['audio', 'personal-recording'],
                emotion: 'neutral',
                symbols: [],
                narrative: 'Audio journal recording (processing in progress)',
                nugget: `Audio journal (${Math.floor(audioDuration / 60)}:${(audioDuration % 60).toString().padStart(2, '0')})`,
                interpretation: { symbols: {}, meaning: 'Processing your recording', commonPattern: '' },
                captureMode: 'audio',
                audioCapture: {
                  url: result.audioUrl,
                  capturedAt: new Date().toISOString(),
                  duration: audioDuration,
                  mediaId: result.mediaId,
                },
                generatedImage: null,
                isSample: false,
              };

              const updatedDreams = [newDream, ...dreams];
              setDreams(updatedDreams);
              await saveDreamsToStorage(updatedDreams);
              syncDreamToSupabase(newDream).catch((err: unknown) => {
                console.warn('[RecordScreen] Supabase sync error:', err);
              });
              navigate('journal');
              addToast({ type: 'info', message: 'Recording saved. Transcribing your dream…' });

              if (result.audioBlob) {
                (async () => {
                  try {
                    const { dream: processedDream } = await processAudioJournal({
                      audioBlob: result.audioBlob,
                      audioUrl: result.audioUrl,
                      duration: audioDuration,
                      mediaId: result.mediaId,
                    });
                    const finalDream = { ...processedDream, id: dreamId };
                    setDreams((prev) => {
                      const next = prev.map((d) => (d.id === dreamId ? finalDream : d));
                      saveDreamsToStorage(next).catch(console.error);
                      return next;
                    });
                    syncDreamToSupabase(finalDream).catch(console.error);
                    addToast({ type: 'success', message: 'Your audio dream is ready in the journal.' });
                  } catch (e) {
                    console.warn('[AudioRecord] Background processing error:', e);
                    addToast({ type: 'warning', message: 'Audio saved, but transcription failed. You can edit it in your journal.' });
                  } finally {
                    stopCaptureMedia();
                  }
                })();
              }
              return;
            } else {
              // Text capture result from DreamCapture
              const analysis = result.analysis;
              const imageAsset = result.image;

              newDream = {
                id: generateDreamId(),
                date: new Date().toISOString(),
                content: text,
                category: analysis.category || 'uncategorized',
                themes: analysis.themes || [],
                emotion: analysis.emotion || 'neutral',
                symbols: analysis.symbols || [],
                narrative: analysis.narrative || text,
                nugget: analysis.nugget || text.substring(0, 100),
                interpretation: analysis.interpretation || {
                  symbols: {},
                  meaning: 'Analysis unavailable',
                  commonPattern: '',
                },
                moodValence: analysis.valence,
                generatedImage: imageAsset
                  ? {
                      url: imageAsset.url,
                      prompt: imageAsset.prompt,
                      style: imageAsset.style,
                      generatedAt: imageAsset.generatedAt,
                      source: imageAsset.source,
                    }
                  : null,
                captureMode: 'text',
                isSample: false,
              };
            }

            // Save to state
            const updatedDreams = [newDream, ...dreams];
            setDreams(updatedDreams);
            await saveDreamsToStorage(updatedDreams);

            // Sync to Supabase (non-blocking)
            syncDreamToSupabase(newDream).catch((err: unknown) => {
              console.warn('[RecordScreen] Supabase sync error:', err);
            });

            // Navigate to the new dream detail
            navigate('dream', newDream.id);
          }}
          onCancel={() => {
            stopCaptureMedia();
            navigate('home');
          }}
        />
      )}

      {/* Video Journal Screen */}
      {route.screen === 'video-journal' && (
        <VideoJournalScreen
          onComplete={async (videoUrl, thumbnailUrl, duration, videoBlob, capturedEmotionFromVideo) => {
            if (!videoBlob) {
              addToast({ type: 'error', message: 'Video data missing — please try recording again.' });
              return;
            }

            setIsProcessing(true);
            try {
              const { dream: newDream } = await processVideoJournal({
                videoBlob,
                videoUrl,
                thumbnail: thumbnailUrl || undefined,
                duration,
                capturedEmotion: capturedEmotionFromVideo,
              });

              const updatedDreams = [newDream, ...dreams];
              setDreams(updatedDreams);
              await saveDreamsToStorage(updatedDreams);
              syncDreamToSupabase(newDream).catch((err: unknown) => {
                console.warn('[VideoJournal] Supabase sync error:', err);
              });
              navigate('dream', newDream.id);
            } catch (error) {
              console.error('[VideoJournal] Processing failed:', error);
              addToast({ type: 'error', message: 'Failed to process video journal. Please try again.' });
            } finally {
              setIsProcessing(false);
            }
          }}
          onCancel={() => navigate('more')}
        />
      )}

      {/* Photo import flow */}
      {route.screen === 'import-photos' && (
        <PhotoUploadFlow
          onClose={() => navigate('more')}
          onDreamsExtracted={handleDreamsExtracted}
          analyzeDream={analyzeDream}
        />
      )}

      {/* Dream entry */}
      {route.screen === 'dream' && detailDream && (
        <DreamDetailScreen
          key={detailDream.id}
          detailDream={detailDream}
          navigate={navigate}
          shareDream={shareDream}
          handleOpenMintModal={handleOpenMintModal}
          findSimilarDreams={findSimilarDreams}
          getCategoryBadgeClass={getCategoryBadgeClass}
          getEmotionEmoji={getEmotionEmoji}
          isFavourite={favouriteIds.includes(detailDream.id)}
          onToggleFavourite={() => handleToggleFavourite(detailDream.id)}
          onImageGenerated={(asset) => {
            const generatedImage = {
              url: asset.url,
              prompt: asset.prompt,
              style: asset.style,
              generatedAt: asset.generatedAt,
              source: asset.source,
            };
            setDreams((prev) => {
              const next = prev.map((d) =>
                d.id === detailDream.id ? { ...d, generatedImage } : d,
              );
              saveDreamsToStorage(next).catch(console.error);
              return next;
            });
            syncDreamToSupabase({ ...detailDream, generatedImage }).catch(console.error);
          }}
          onUpdateDream={(patch) => {
            setDreams((prev) => {
              const next = prev.map((d) =>
                d.id === detailDream.id ? { ...d, ...patch } : d,
              );
              saveDreamsToStorage(next).catch(console.error);
              return next;
            });
            syncDreamToSupabase({ ...detailDream, ...patch }).catch(console.error);
          }}
        />
      )}

      {route.screen === 'dream' && route.dreamId && !detailDream && (
        <div className="text-center py-16 space-y-4">
          <p className="text-muted">This journal entry is no longer here.</p>
          <button
            type="button"
            onClick={() => navigate('journal')}
            className="inline-flex items-center gap-2 text-sageDark font-semibold underline underline-offset-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to journal
          </button>
        </div>
      )}

      {route.screen === 'more' && (
        <MoreScreen
          skin={skin}
          isThemed={isThemed}
          navigate={navigate}
        />
      )}

      {route.screen === 'admin' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl font-medium text-ink">Analytics Dashboard</h2>
            <button
              type="button"
              onClick={() => navigate('more')}
              className="p-2 rounded-full border border-line bg-cream hover:bg-parchment transition"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 text-muted" strokeWidth={1.5} />
            </button>
          </div>
          {isAdmin ? (
            <AdminDashboard onClose={() => navigate('more')} />
          ) : (
            <div className="rounded-2xl border border-line bg-cream p-6 text-center text-muted">
              <Shield className="w-8 h-8 mx-auto mb-3 text-muted" strokeWidth={1.5} />
              <p className="font-medium text-ink mb-1">Admin access required</p>
              <p className="text-sm">Sign in with <code className="text-xs">admin@everdream.test</code> to view analytics.</p>
            </div>
          )}
        </div>
      )}

      </div>

      {/* Asset Info Modal */}
      {showAssetInfo && selectedDream && (
        <Modal onClose={() => setShowAssetInfo(false)}>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Dream Asset Details</h2>
            
            {selectedDream.generatedImage && (
              <img 
                src={selectedDream.generatedImage.url} 
                alt="Dream visualization"
                className="w-full h-48 object-cover rounded-xl"
              />
            )}

            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Asset Metadata</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-purple-200">Asset ID:</span>
                  <span className="font-mono text-xs">{selectedDream.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-200">Created:</span>
                  <span>{new Date(selectedDream.date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-200">Rarity Score:</span>
                  <span className="font-bold">{selectedDream.assetMetadata?.rarityScore}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-200">Uniqueness:</span>
                  <span className="font-bold">{selectedDream.assetMetadata?.uniquenessScore}</span>
                </div>
              </div>
            </div>

            {/* NFT Component Breakdown */}
            <div className="bg-blue-600 bg-opacity-20 rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                NFT Component Breakdown
              </h3>
              <div className="space-y-3">
                {getNFTComponents(selectedDream).map((component, i) => (
                  <div key={component.id} className="bg-blue-700 bg-opacity-30 rounded p-3">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <div className="text-sm font-semibold text-blue-200">{component.component}</div>
                        <div className="text-xs text-blue-300">{component.type}</div>
                      </div>
                      {component.readyForMinting && (
                        <span className="text-xs bg-green-500 px-2 py-0.5 rounded">Ready</span>
                      )}
                    </div>
                    <div className="text-xs space-y-1 mt-2">
                      <div className="text-blue-200">{component.description}</div>
                      <div className="flex justify-between text-blue-300">
                        <span>Size: {component.size}</span>
                        <span>License: {component.license}</span>
                      </div>
                      <div className="text-green-300 font-semibold">Ownership: {component.ownership}</div>
                      {component.note && (
                        <div className="text-yellow-300 text-xs mt-1">ℹ️ {component.note}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-blue-200 bg-blue-700 bg-opacity-30 p-2 rounded">
                💡 Each component can be minted separately or bundled into a single NFT. You control the composition.
              </div>
            </div>

            {selectedDream.watermark && (
              <div className="bg-cyan-600 bg-opacity-20 rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Cryptographic Watermark
                </h3>
                <div className="text-xs space-y-1 font-mono">
                  <div>Signature: {selectedDream.watermark.signature}</div>
                  <div>Timestamp: {new Date(selectedDream.watermark.timestamp).toLocaleString()}</div>
                  <div>Rights: {selectedDream.watermark.rights.license.toUpperCase()}</div>
                  <div>Revocable: {selectedDream.watermark.rights.revocable ? 'Yes' : 'No'}</div>
                </div>
              </div>
            )}

            <div className="bg-green-600 bg-opacity-20 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Your Rights</h3>
              <div className="text-sm space-y-1 text-green-100">
                <div>✓ Full ownership retained (100%)</div>
                <div>✓ Licensed, never sold</div>
                <div>✓ Revocable at any time</div>
                <div>✓ NFT-ready for blockchain minting</div>
                <div>✓ Choose your license: CC-BY, CC-BY-SA, All Rights Reserved</div>
              </div>
            </div>

            <div className="bg-purple-600 bg-opacity-20 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-sm">Future: Ethereum NFT</h3>
              <div className="text-xs text-purple-200 space-y-1">
                <div>When ready, mint to:</div>
                <div className="font-mono bg-purple-700 bg-opacity-30 p-2 rounded mt-1">
                  Ethereum Mainnet or Polygon (lower fees)
                </div>
                <div className="mt-2">Smart Contract: GPL-3.0 (open source)</div>
                <div>Storage: IPFS (decentralized)</div>
                <div>Gas fees: You pay only at minting time</div>
              </div>
            </div>

            <button
              onClick={() => {
                const data = JSON.stringify(selectedDream, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `dream-asset-${selectedDream.id}.json`;
                a.click();
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Asset Metadata (JSON)
            </button>
          </div>
        </Modal>
      )}

      {/* Mint NFT Modal */}
      {showMintModal && selectedDream && (
        <Modal onClose={() => setShowMintModal(false)}>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Award className="w-5 h-5 text-dusk" />
              Mint Dream NFT
            </h2>

            {/* Wallet Info */}
            {wallet && (
              <div className="rounded-xl border border-sage/20 bg-sage/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-sage" />
                  <span className="text-sm font-semibold text-ink">Your Wallet</span>
                </div>
                <code className="text-xs text-muted block truncate">{wallet.address}</code>
                <p className="text-xs text-muted mt-1">Display name: {wallet.displayName}</p>
              </div>
            )}

            {/* NFT Preview */}
            <div className="rounded-xl border border-line bg-parchment/60 p-4">
              <h3 className="text-sm font-semibold text-ink mb-2">NFT Preview</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-xs text-muted uppercase tracking-wide">Name</span>
                  <p className="text-ink font-medium">{selectedDream.nugget || 'Untitled Dream'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted uppercase tracking-wide">Category</span>
                  <p className="text-ink capitalize">{selectedDream.category}</p>
                </div>
                {selectedDream.themes && selectedDream.themes.length > 0 && (
                  <div>
                    <span className="text-xs text-muted uppercase tracking-wide">Themes</span>
                    <p className="text-ink">{selectedDream.themes.join(', ')}</p>
                  </div>
                )}
                {selectedDream.generatedImage && (
                  <div>
                    <span className="text-xs text-muted uppercase tracking-wide">Artwork</span>
                    <img
                      src={selectedDream.generatedImage.url}
                      alt="Dream artwork"
                      className="w-full max-h-32 object-cover rounded-lg mt-1"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Error */}
            {mintError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                <p className="text-sm text-rose-600">{mintError}</p>
              </div>
            )}

            {/* Minted Result */}
            {mintedNFT && mintedNFT.status === 'minted' && (
              <div className="rounded-xl border border-sage/20 bg-sage/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-5 h-5 text-sage" />
                  <span className="text-sm font-semibold text-sageDark">NFT Minted!</span>
                </div>
                <div className="text-xs space-y-1 text-muted">
                  <div><strong>Token ID:</strong> <code>{mintedNFT.tokenId}</code></div>
                  <div><strong>Contract:</strong> <code className="text-[10px]">{mintedNFT.contractAddress?.slice(0, 10)}...</code></div>
                  <div><strong>Tx:</strong> <code className="text-[10px]">{mintedNFT.txHash?.slice(0, 10)}...</code></div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowMintModal(false)}
                className="flex-1 border border-line bg-parchment hover:bg-parchment/80 py-3 rounded-xl font-semibold transition text-sm text-ink"
              >
                {mintedNFT ? 'Close' : 'Cancel'}
              </button>
              {!mintedNFT && (
                <button
                  onClick={() => handleMintNFT(selectedDream)}
                  disabled={isMinting}
                  className="flex-1 bg-sage hover:bg-sageDark disabled:opacity-45 py-3 rounded-xl font-semibold transition text-cream text-sm flex items-center justify-center gap-2"
                >
                  {isMinting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" />
                      Minting...
                    </>
                  ) : (
                    <>
                      <Award className="w-4 h-4" />
                      Confirm Mint
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Profile Hub Modal */}
      {showProfile && (
        <ProfileHub
          onClose={() => setShowProfile(false)}
          navigate={navigate}
          onFriendAdded={() => {
            void unlockAndNotify('first_friend');
          }}
        />
      )}

      <ShareModal
        dream={selectedDream}
        isOpen={showShareModal && !!selectedDream}
        onClose={() => setShowShareModal(false)}
        onShared={() => {
          void unlockAndNotify('first_share');
        }}
      />

      {/* Achievement Popup */}
      {showAchievement && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[70] max-w-sm w-[calc(100%-2rem)]">
          <div className="rounded-2xl border border-line bg-cream px-4 py-3 shadow-lift flex items-center gap-3">
              <div className="text-3xl">{showAchievement.icon}</div>
              <div>
                <div className="font-semibold text-ink text-sm">
                  {showAchievement.icon} {showAchievement.title}
                </div>
                <div className="text-xs text-muted mt-0.5 leading-relaxed">{showAchievement.description}</div>
              </div>
          </div>
        </div>
      )}

      {/* Licensing Modal */}
      {showLicensing && (
        <Modal onClose={() => setShowLicensing(false)}>
          <h2 className="text-2xl font-bold mb-4">Open Source Licensing</h2>
          
          <div className="space-y-4 text-sm">
            <div className="bg-green-600 bg-opacity-20 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-green-300">DreamScape Core</h3>
              <div className="space-y-1 text-green-100">
                <div><strong>License:</strong> MIT License with Copyleft Provisions</div>
                <div><strong>Your Rights:</strong></div>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>Use the code commercially</li>
                  <li>Modify and distribute</li>
                  <li>Include in proprietary software</li>
                  <li>Grant patent rights</li>
                </ul>
                <div className="mt-2"><strong>Copyleft Provision:</strong></div>
                <div className="text-xs">If you modify DreamScape and distribute it, you must:</div>
                <ul className="list-disc list-inside ml-2 space-y-1 text-xs">
                  <li>Release your modifications under MIT</li>
                  <li>Credit original authors</li>
                  <li>Maintain license notices</li>
                </ul>
              </div>
            </div>

            <div className="bg-purple-600 bg-opacity-20 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-purple-300">Your Dream Data</h3>
              <div className="space-y-1 text-purple-100">
                <div><strong>License:</strong> CC-BY-4.0 (Creative Commons Attribution) OR User's Choice</div>
                <div><strong>You Choose:</strong></div>
                <ul className="list-disc list-inside ml-2 space-y-1 text-xs">
                  <li>CC-BY-4.0: Others can share with attribution</li>
                  <li>CC-BY-SA-4.0: Share-alike (copyleft)</li>
                  <li>CC-BY-NC-4.0: Non-commercial only</li>
                  <li>All Rights Reserved: No sharing without permission</li>
                </ul>
                <div className="mt-2 text-xs bg-purple-700 bg-opacity-30 p-2 rounded">
                  💡 <strong>Recommendation:</strong> CC-BY-4.0 allows participation in Dream Economy baskets while maintaining attribution rights.
                </div>
              </div>
            </div>

            <div className="bg-blue-600 bg-opacity-20 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-blue-300">NFT Smart Contracts</h3>
              <div className="space-y-1 text-blue-100 text-xs">
                <div><strong>License:</strong> GPL-3.0 (GNU General Public License)</div>
                <div><strong>Why GPL?</strong> Strong copyleft ensures modifications to our NFT contracts remain open source and benefit everyone.</div>
                <div className="mt-2"><strong>Contract Address (Future):</strong></div>
                <div className="font-mono bg-blue-700 bg-opacity-30 p-2 rounded">
                  0x... (Ethereum Mainnet)<br/>
                  0x... (Polygon for lower fees)
                </div>
              </div>
            </div>

            <div className="bg-yellow-600 bg-opacity-20 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-yellow-300">Contributor License Agreement</h3>
              <div className="space-y-1 text-yellow-100 text-xs">
                <p>By contributing code to DreamScape, you agree:</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>You own the copyright to your contribution</li>
                  <li>You grant MIT license to your code</li>
                  <li>You retain full ownership and can relicense elsewhere</li>
                  <li>Your contributions help build a public good</li>
                </ul>
                <div className="mt-2 bg-yellow-700 bg-opacity-30 p-2 rounded">
                  <strong>Patent Grant:</strong> Contributors grant non-exclusive, worldwide patent license for their contributions.
                </div>
              </div>
            </div>

            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Full License Texts</h3>
              <div className="space-y-2 text-xs">
                <a href="https://opensource.org/licenses/MIT" target="_blank" className="block text-blue-300 hover:text-blue-200">
                  → MIT License Full Text
                </a>
                <a href="https://www.gnu.org/licenses/gpl-3.0.en.html" target="_blank" className="block text-blue-300 hover:text-blue-200">
                  → GPL-3.0 Full Text
                </a>
                <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" className="block text-blue-300 hover:text-blue-200">
                  → CC-BY-4.0 Full Text
                </a>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Terms & Conditions Modal */}
      <TermsModal
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
        onAccept={acceptTerms}
        hasAccepted={hasAcceptedTerms}
      />

      {/* Onboarding Flow (full screen for first-run setup / goals / sleep profile) */}
      {showOnboarding && (
        <OnboardingFlow
          onComplete={({ action }) => {
            setShowOnboarding(false);
            markOnboardedLocally();
            void refreshSubscriptionProfile();
            void loadUserProfile().then((p) => {
              setEducationProfile(
                educationInputsFromProfile({
                  interests: p.interests,
                  dream_goals: p.dreamGoals,
                  onboarding_goals: undefined,
                }),
              );
            });
            // first_dream → capture; explore / skip → home (never record)
            if (action === 'first_dream') {
              navigate('record');
            } else {
              navigate('home');
            }
          }}
        />
      )}
    </Shell>
    </>
  );
};

// Components
const StatCard = ({ icon: Icon, value, label }) => (
  <div className="rounded-2xl border border-line bg-cream px-3 py-4 text-center shadow-paper">
    <Icon className="w-5 h-5 text-sageDark mx-auto mb-2 opacity-90" strokeWidth={1.5} />
    <div className="text-xl font-semibold text-ink font-serif">{value}</div>
    <div className="text-[10px] uppercase tracking-wide text-muted mt-1">{label}</div>
  </div>
);

const DreamNuggetCard = ({ dream, getCategoryBadgeClass, getEmotionEmoji, onClick, isAdmin = false }) => (
  <div 
    onClick={onClick}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
    className="rounded-2xl border border-line bg-cream p-4 shadow-paper cursor-pointer hover:border-dusk/30 hover:bg-parchment/40 transition"
  >
    <div className="flex items-start justify-between mb-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted uppercase tracking-wide">
          {new Date(dream.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
        <span className="text-lg">{getEmotionEmoji(dream.emotion)}</span>
      </div>
      <span className={`${getCategoryBadgeClass(dream.category)} px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide`}>
        {dream.category}
      </span>
    </div>
    <p className="text-ink italic text-sm leading-relaxed font-serif">
      "{dream.nugget}"
    </p>
    {isAdmin && dream.assetMetadata && (
      <div className="mt-2 flex items-center gap-2 text-xs text-muted">
        <Shield className="w-3 h-3 text-sage" strokeWidth={1.75} />
        <span>Depth {dream.assetMetadata.rarityScore}</span>
      </div>
    )}
    {dream.isSample && (
      <div className="mt-3 text-xs text-muted bg-parchment border border-line rounded-xl px-3 py-2">
        Sample entry — tap Record to add your own.
      </div>
    )}
  </div>
);

const DreamCard = ({ dream, getCategoryBadgeClass, getEmotionEmoji, onShare: _onShare, onClick, isAdmin = false }) => (
  <div 
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
    className="rounded-2xl overflow-hidden border border-line bg-cream shadow-paper transition hover:border-dusk/25 cursor-pointer text-left"
  >
    {dream.generatedImage && (
      <img 
        src={dream.generatedImage.url} 
        alt="Dream visualization"
        className="w-full h-44 object-cover"
      />
    )}
    <div className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted uppercase tracking-wide">
            {new Date(dream.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
          <span className="text-xl">{getEmotionEmoji(dream.emotion)}</span>
        </div>
        <span className={`${getCategoryBadgeClass(dream.category)} px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide`}>
          {dream.category}
        </span>
      </div>
      
      <div className="mb-3">
        <p className="text-sm font-serif font-medium text-ink mb-2 italic leading-snug">"{dream.nugget}"</p>
      </div>
      
      <div className="flex gap-2 flex-wrap mb-2">
        {dream.themes?.slice(0, 4).map((theme, i) => (
          <span key={i} className="text-[11px] text-muted bg-parchment border border-line px-2 py-0.5 rounded-full">
            {theme}
          </span>
        ))}
      </div>

      {isAdmin && dream.assetMetadata && (
        <div className="flex items-center justify-between text-xs text-muted border-t border-line pt-3 mt-1">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-sage" strokeWidth={1.75} />
            Depth {dream.assetMetadata.rarityScore}
          </span>
          <span className="font-mono text-[10px]">#{dream.id.substring(0, 8)}</span>
        </div>
      )}
    </div>
  </div>
);

const InsightCard = ({ title, icon: Icon, items }) => (
  <div className="rounded-2xl border border-line bg-cream p-4 shadow-paper">
    <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm text-ink">
      <Icon className="w-5 h-5 text-duskDeep" strokeWidth={1.5} />
      {title}
    </h3>
    <div className="space-y-2 text-sm">
      {items.map((item, i) => (
        <div key={i} className="flex justify-between items-center gap-3">
          <span className="text-muted capitalize">{item.label}</span>
          {item.badge ? (
            <span className="bg-parchment border border-line px-2 py-1 rounded-lg text-xs font-semibold text-ink">{item.value}</span>
          ) : (
            <span className="font-semibold text-ink">{item.value}</span>
          )}
        </div>
      ))}
    </div>
  </div>
);

const EmptyState = ({ icon: Icon, message }) => (
  <div className="text-center py-14 text-muted border border-dashed border-line rounded-3xl bg-parchment/35">
    <Icon className="w-14 h-14 mx-auto mb-4 opacity-35 text-duskDeep" strokeWidth={1.25} />
    <p className="text-ink font-medium">{message}</p>
  </div>
);

const Modal = ({ children, onClose }) => (
  <div className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] flex items-end sm:items-center justify-center z-[60] p-4">
    <div className="bg-cream w-full sm:max-w-md rounded-3xl border border-line p-6 max-h-[90vh] overflow-y-auto relative shadow-lift">
      <button 
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 text-muted hover:text-ink z-10 p-1 rounded-full hover:bg-parchment transition"
        aria-label="Close"
      >
        <X className="w-5 h-5" strokeWidth={1.75} />
      </button>
      {children}
    </div>
  </div>
);

export default DreamJournalApp;
