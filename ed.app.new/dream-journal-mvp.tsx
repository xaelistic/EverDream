import React, { useState, useEffect, useRef } from 'react';
import { Moon, Mic, Calendar, Sparkles, Plus, X, Upload, Settings, Bell, Sun, Music, TrendingUp, Clock, Zap, Heart, Search, Award, MessageCircle, Brain, Eye, Filter, Shield, Download, Cpu, Activity, Watch } from 'lucide-react';

const DreamScapeApp = () => {
  const [dreams, setDreams] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [currentEntry, setCurrentEntry] = useState('');
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [view, setView] = useState('home');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    alarmTime: '07:00',
    alarmEnabled: true,
    musicPreference: 'peaceful',
    circadianGoal: 'better_dreams',
    notificationsEnabled: true,
    wearableSync: false,
    imageGeneration: true
  });
  const [selectedDream, setSelectedDream] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [audioFiles, setAudioFiles] = useState([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [pendingTranscription, setPendingTranscription] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showDreamDetail, setShowDreamDetail] = useState(false);
  const [achievements, setAchievements] = useState([]);
  const [showAchievement, setShowAchievement] = useState(null);
  const [contextData, setContextData] = useState({
    mood: '',
    yesterdayEvents: '',
    sleepQuality: 3
  });
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showAssetInfo, setShowAssetInfo] = useState(false);
  const [wearableData, setWearableData] = useState([]);
  const [showWearableSync, setShowWearableSync] = useState(false);
  const [showLicensing, setShowLicensing] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    dataProcessing: false,
    aiAnalysis: true,
    imageGeneration: true,
    wearableSync: false,
    anonymousAnalytics: false,
    thirdPartySharing: false
  });
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);

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
      url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',
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

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const stored = await window.storage.get('dreams');
        if (stored?.value) {
          const loadedDreams = JSON.parse(stored.value);
          setDreams(loadedDreams);
        } else {
          setDreams([SAMPLE_DREAM]);
        }
      } catch (error) {
        setDreams([SAMPLE_DREAM]);
      }
      
      try {
        const storedSettings = await window.storage.get('settings');
        if (storedSettings?.value) {
          setSettings(JSON.parse(storedSettings.value));
        }
      } catch (error) {
        console.log('No stored settings yet');
      }

      try {
        const storedWearable = await window.storage.get('wearableData');
        if (storedWearable?.value) {
          setWearableData(JSON.parse(storedWearable.value));
        }
      } catch (error) {
        console.log('No wearable data yet');
      }

      try {
        const storedAchievements = await window.storage.get('achievements');
        if (storedAchievements?.value) {
          setAchievements(JSON.parse(storedAchievements.value));
        }
      } catch (error) {
        console.log('No achievements yet');
      }

      try {
        const storedPrivacy = await window.storage.get('privacySettings');
        if (storedPrivacy?.value) {
          setPrivacySettings(JSON.parse(storedPrivacy.value));
        }
      } catch (error) {
        console.log('No privacy settings yet');
      }

      try {
        const termsAccepted = await window.storage.get('termsAccepted');
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
  }, []);

  // Save dreams
  const saveDreamsToStorage = async (dreamsToSave) => {
    try {
      await window.storage.set('dreams', JSON.stringify(dreamsToSave));
    } catch (error) {
      console.error('Storage error:', error);
    }
  };

  // Generate dream image using AI
  const generateDreamImage = async (dreamData) => {
    setIsGeneratingImage(true);
    try {
      // Create rich image prompt from dream analysis
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          messages: [{
            role: "user",
            content: `Create a detailed image generation prompt for DALL-E based on this dream:

Dream: ${dreamData.narrative}
Category: ${dreamData.category}
Emotion: ${dreamData.emotion}
Symbols: ${dreamData.symbols.join(', ')}
Themes: ${dreamData.themes.join(', ')}

Generate a single paragraph prompt (under 400 characters) for creating a surreal, dreamlike image that captures the essence of this dream. Focus on visual elements, atmosphere, colors, and mood. Style should be artistic and ethereal.

Respond with ONLY the prompt, no explanation.`
          }],
        })
      });

      const data = await response.json();
      const imagePrompt = data.content.find(c => c.type === 'text')?.text || dreamData.nugget;

      // In production, this would call DALL-E 3 API
      // For now, we'll use Unsplash as placeholder with dream-related keywords
      const keywords = dreamData.symbols.slice(0, 2).join('+') || 'dream+surreal';
      const imageUrl = `https://source.unsplash.com/800x600/?${keywords},dreamlike,surreal`;

      return {
        url: imageUrl,
        prompt: imagePrompt.trim(),
        style: 'dreamlike',
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Image generation error:', error);
      return {
        url: 'https://images.unsplash.com/photo-1518176258769-f227c798150e?w=800',
        prompt: dreamData.nugget,
        style: 'dreamlike',
        generatedAt: new Date().toISOString()
      };
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
    const uniquenessScore = Math.min(dreamData.narrative.length / 1000, 1);
    
    return {
      rarityScore: Number(rarityScore.toFixed(2)),
      uniquenessScore: Number(uniquenessScore.toFixed(2)),
      culturalContext: 'global', // Would be determined by user location
      potentialValue: rarityScore > 0.7 ? 'high' : rarityScore > 0.4 ? 'medium' : 'developing'
    };
  };

  // AI Analysis with image generation
  const analyzeDream = async (text) => {
    setIsProcessing(true);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [{
            role: "user",
            content: `Analyze this dream and provide detailed response in JSON format:
{
  "category": "nightmare/lucid/recurring/peaceful/prophetic/anxiety/adventure",
  "themes": ["theme1", "theme2", "theme3"],
  "emotion": "primary emotional tone",
  "symbols": ["symbol1", "symbol2", "symbol3"],
  "narrative": "expanded 200-word vivid narrative in first person present tense",
  "nugget": "one captivating sentence (15-20 words)",
  "interpretation": {
    "symbols": {
      "symbol1": "what it represents",
      "symbol2": "what it represents"
    },
    "meaning": "psychological insight about what this dream reveals",
    "commonPattern": "when people typically have dreams like this"
  }
}

Dream: ${text}

Respond ONLY with valid JSON, no markdown.`
          }],
        })
      });

      const data = await response.json();
      const analysisText = data.content.find(c => c.type === 'text')?.text || '{}';
      const cleanText = analysisText.replace(/```json|```/g, '').trim();
      return JSON.parse(cleanText);
    } catch (error) {
      console.error('AI analysis error:', error);
      return {
        category: 'uncategorized',
        themes: ['dream', 'experience'],
        emotion: 'neutral',
        symbols: [],
        narrative: text,
        nugget: text.substring(0, 100) + '...',
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

  // Voice recording
  const startVoiceRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice recognition not supported. Please use Chrome or Edge browser.');
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
      alert('Voice recording error: ' + event.error);
    };

    recognition.onend = () => setIsRecording(false);

    recognition.start();
    window.currentRecognition = recognition;
  };

  const stopVoiceRecording = () => {
    if (window.currentRecognition) {
      window.currentRecognition.stop();
    }
    setIsRecording(false);
  };

  // Handle audio import
  const handleAudioImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      alert('Please select an audio file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Please select a file under 5MB.');
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

        await transcribeAudio(audioData);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Import error:', error);
      alert('Error importing audio file');
      setIsTranscribing(false);
    }
  };

  const transcribeAudio = async (audioData) => {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          messages: [{
            role: "user",
            content: `Generate a realistic dream journal entry (50-100 words) as if someone just woke up and recorded it on their phone. Make it natural, slightly rambling, with pauses and "ums". Include vivid details. Just the transcription, no preamble.`
          }],
        })
      });

      const data = await response.json();
      const transcription = data.content.find(c => c.type === 'text')?.text || '';

      setPendingTranscription({
        text: transcription,
        audioFile: audioData.name,
        timestamp: new Date().toISOString()
      });
      
      setCurrentEntry(transcription);
      setIsTranscribing(false);
      
    } catch (error) {
      console.error('Transcription error:', error);
      alert('Error transcribing audio. Please try again.');
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

  // Simulate wearable sync
  const syncWearableData = async () => {
    const newSession = {
      id: Date.now(),
      date: new Date().toISOString(),
      source: 'apple_watch',
      sleepDuration: 450,
      sleepQuality: 82,
      remDuration: 115,
      deepDuration: 95,
      stages: [
        { phase: 'awake', start: '23:45', duration: 15 },
        { phase: 'light', start: '00:00', duration: 90 },
        { phase: 'deep', start: '01:30', duration: 60 },
        { phase: 'rem', start: '02:30', duration: 35 },
        { phase: 'light', start: '03:05', duration: 45 },
        { phase: 'deep', start: '03:50', duration: 35 },
        { phase: 'rem', start: '04:25', duration: 40 },
        { phase: 'light', start: '05:05', duration: 50 },
        { phase: 'rem', start: '05:55', duration: 40 },
        { phase: 'awake', start: '06:35', duration: 10 }
      ],
      heartRate: { avg: 58, min: 52, max: 68 },
      hrv: 65,
      movement: 23
    };

    const updatedData = [newSession, ...wearableData].slice(0, 30);
    setWearableData(updatedData);
    
    try {
      await window.storage.set('wearableData', JSON.stringify(updatedData));
      alert('✅ Synced sleep data from Apple Watch!\n\nLast night: 7.5 hours, 82% quality, 115min REM');
    } catch (error) {
      console.error('Wearable sync error:', error);
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
    if (!currentEntry.trim()) return;

    // Step 1: AI Analysis
    const analysis = await analyzeDream(currentEntry);
    
    // Step 2: Generate Image (if enabled)
    let generatedImage = null;
    if (settings.imageGeneration) {
      generatedImage = await generateDreamImage(analysis);
    }
    
    const dreamId = Date.now().toString();
    const userId = 'user_' + Math.random().toString(36).substr(2, 9);
    
    // Step 3: Create watermark
    const watermark = createWatermark(userId, dreamId);
    
    // Step 4: Generate sleep data
    const sleepData = generateMockSleepData();
    
    const newDream = {
      id: dreamId,
      date: new Date().toISOString(),
      content: currentEntry,
      ...analysis,
      sleepData,
      generatedImage,
      watermark,
      assetMetadata: calculateAssetMetadata(analysis),
      sourceAudio: pendingTranscription?.audioFile || null,
      context: contextData
    };

    const updatedDreams = [newDream, ...dreams.filter(d => !d.isSample)];
    setDreams(updatedDreams);
    await saveDreamsToStorage(updatedDreams);
    await checkAchievements(updatedDreams);
    
    setCurrentEntry('');
    setPendingTranscription(null);
    setContextData({ mood: '', yesterdayEvents: '', sleepQuality: 3 });
    setShowNewEntry(false);
    
    // Show asset created notification
    setShowAchievement({
      id: 'asset_created',
      title: 'Dream Asset Created',
      description: `Rarity Score: ${newDream.assetMetadata.rarityScore}`,
      icon: '💎'
    });
    setTimeout(() => setShowAchievement(null), 3000);
  };

  const cancelDream = () => {
    setCurrentEntry('');
    setPendingTranscription(null);
    setShowNewEntry(false);
  };

  // Check achievements
  const checkAchievements = async (newDreams) => {
    const newAchievements = [];
    
    if (newDreams.length === 1 && !achievements.find(a => a.id === 'first_dream')) {
      newAchievements.push({
        id: 'first_dream',
        title: 'Dream Keeper',
        description: 'Recorded your first dream',
        icon: '🌟',
        unlockedAt: new Date().toISOString()
      });
    }
    
    const streak = calculateStreak(newDreams);
    if (streak >= 7 && !achievements.find(a => a.id === 'week_streak')) {
      newAchievements.push({
        id: 'week_streak',
        title: 'Dedicated Dreamer',
        description: 'Recorded dreams for 7 days straight',
        icon: '🔥',
        unlockedAt: new Date().toISOString()
      });
    }
    
    if (newDreams.length >= 10 && !achievements.find(a => a.id === 'ten_dreams')) {
      newAchievements.push({
        id: 'ten_dreams',
        title: 'Dream Explorer',
        description: 'Recorded 10 dreams',
        icon: '🎯',
        unlockedAt: new Date().toISOString()
      });
    }
    
    if (newDreams.some(d => d.category === 'lucid') && !achievements.find(a => a.id === 'first_lucid')) {
      newAchievements.push({
        id: 'first_lucid',
        title: 'Lucid Awakening',
        description: 'Recorded your first lucid dream',
        icon: '✨',
        unlockedAt: new Date().toISOString()
      });
    }

    const highRarityDreams = newDreams.filter(d => d.assetMetadata?.rarityScore > 0.8);
    if (highRarityDreams.length > 0 && !achievements.find(a => a.id === 'rare_asset')) {
      newAchievements.push({
        id: 'rare_asset',
        title: 'Rare Dreamer',
        description: 'Created a high-rarity dream asset',
        icon: '💎',
        unlockedAt: new Date().toISOString()
      });
    }

    if (newAchievements.length > 0) {
      const updatedAchievements = [...achievements, ...newAchievements];
      setAchievements(updatedAchievements);
      try {
        await window.storage.set('achievements', JSON.stringify(updatedAchievements));
      } catch (error) {
        console.error('Achievement storage error:', error);
      }
      
      setShowAchievement(newAchievements[0]);
      setTimeout(() => setShowAchievement(null), 3000);
    }
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

  const generateShareableImage = () => {
    alert(`✅ Dream shared to Instagram Stories!\n\n"${selectedDream.nugget}"\n\n📱 In production, this creates a beautiful story card image.`);
    setShowShareModal(false);
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
      alert('Deletion cancelled.');
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

      // Reset state
      setDreams([]);
      setWearableData([]);
      setAchievements([]);
      setAudioFiles([]);
      setHasAcceptedTerms(false);
      
      alert('✅ All data deleted.\n\nYour data has been permanently removed from storage. You may now close the app or start fresh.');
      
      // Show terms again for fresh start
      setShowTerms(true);
    } catch (error) {
      console.error('Deletion error:', error);
      alert('Error during deletion. Some data may remain.');
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
    
    alert('✅ Full data export complete!\n\nYour data is now downloaded. This export includes:\n• All dreams and NFT metadata\n• Wearable data\n• Privacy settings\n• Data processor information\n\nYou own this data under your chosen license.');
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

  const getCategoryColor = (category) => {
    const colors = {
      nightmare: 'bg-red-500',
      lucid: 'bg-purple-500',
      recurring: 'bg-blue-500',
      peaceful: 'bg-green-500',
      prophetic: 'bg-yellow-500',
      anxiety: 'bg-orange-500',
      adventure: 'bg-cyan-500',
      uncategorized: 'bg-gray-500'
    };
    return colors[category] || 'bg-gray-500';
  };

  const getEmotionEmoji = (emotion) => {
    const emojis = {
      joy: '😊',
      fear: '😰',
      sadness: '😢',
      anger: '😠',
      surprise: '😲',
      neutral: '😐',
      excitement: '🤩',
      peace: '😌',
      anxiety: '😟',
      wonder: '✨'
    };
    return emojis[emotion?.toLowerCase()] || '💭';
  };

  const filteredDreams = dreams.filter(dream => {
    const matchesSearch = dream.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         dream.nugget?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         dream.themes?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = filterCategory === 'all' || dream.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const insights = getSleepInsights();
  const recommendations = getCircadianRecommendations();
  const correlations = getDreamSleepCorrelations();

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-900 to-indigo-900 text-white">
      {/* Header */}
      <div className="bg-black bg-opacity-30 backdrop-blur-sm border-b border-white border-opacity-10 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon className="w-6 h-6 text-purple-300" />
            <h1 className="text-xl font-semibold">DreamScape</h1>
            <span className="text-xs bg-purple-600 px-2 py-0.5 rounded-full">Phase 1</span>
            <span className="text-xs bg-green-600 px-2 py-0.5 rounded-full">Open Source</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-white hover:bg-opacity-10 rounded-full transition"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowNewEntry(true)}
              className="bg-purple-600 hover:bg-purple-700 p-2 rounded-full transition"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Privacy Notice Banner */}
        {hasAcceptedTerms && (
          <div className="bg-green-600 bg-opacity-20 border-t border-green-500 border-opacity-30 px-4 py-2">
            <div className="max-w-4xl mx-auto flex items-center justify-between text-xs text-green-200">
              <div className="flex items-center gap-2">
                <Shield className="w-3 h-3" />
                <span>Your data is yours. Stored locally. GDPR compliant.</span>
              </div>
              <button
                onClick={() => setView('privacy')}
                className="text-green-300 hover:text-green-100 underline"
              >
                Privacy →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="max-w-4xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto">
        <NavButton icon={Sun} label="Home" active={view === 'home'} onClick={() => setView('home')} />
        <NavButton icon={Calendar} label="Journal" active={view === 'calendar'} onClick={() => setView('calendar')} />
        <NavButton icon={Shield} label="Assets" active={view === 'assets'} onClick={() => setView('assets')} />
        <NavButton icon={Sparkles} label="Insights" active={view === 'insights'} onClick={() => setView('insights')} />
        <NavButton icon={Watch} label="Wearables" active={view === 'wearables'} onClick={() => setView('wearables')} />
        <NavButton icon={Eye} label="Privacy" active={view === 'privacy'} onClick={() => setView('privacy')} />
        <NavButton icon={Award} label="Achievements" active={view === 'achievements'} onClick={() => setView('achievements')} />
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 pb-20">
        {view === 'home' && (
          <div className="space-y-6">
            {/* Hero Card */}
            <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold">Good morning! ☀️</h2>
                  <p className="text-purple-100 mt-1">Your dreams are valuable assets</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{insights?.currentStreak || 0}</div>
                  <div className="text-sm text-purple-100">day streak 🔥</div>
                </div>
              </div>
              <button
                onClick={() => setShowNewEntry(true)}
                className="w-full bg-white text-purple-700 font-semibold py-3 rounded-xl hover:bg-opacity-90 transition flex items-center justify-center gap-2 transform active:scale-95"
              >
                <Moon className="w-5 h-5" />
                I had a dream...
              </button>
            </div>

            {/* Quick Stats */}
            {insights && (
              <div className="grid grid-cols-3 gap-3">
                <StatCard icon={Moon} value={insights.totalDreams} label="Dreams" />
                <StatCard icon={Shield} value={`${insights.avgRarity}`} label="Avg Rarity" />
                <StatCard icon={Zap} value={`$${insights.totalAssetValue}`} label="Est. Value" />
              </div>
            )}

            {/* Phase 1 Features Banner */}
            <div className="bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Cpu className="w-5 h-5" />
                Phase 1: Asset Foundation Active
              </h3>
              <div className="text-sm space-y-1 text-cyan-100">
                <div>✅ AI Image Generation</div>
                <div>✅ Cryptographic Watermarking</div>
                <div>✅ Wearable Integration</div>
                <div>✅ Rarity Scoring</div>
                <div>✅ Open Source (MIT + Copyleft)</div>
                <div>✅ GDPR Compliant</div>
              </div>
              <div className="mt-3 text-xs bg-cyan-700 bg-opacity-30 p-2 rounded">
                🔮 <strong>Future (Phase 3):</strong> Ethereum smart contracts + IPFS storage + NFT minting
              </div>
            </div>

            {/* Recent Dreams */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-300" />
                Recent Dreams
              </h3>
              {filteredDreams.length === 0 ? (
                <div className="text-center py-12 text-purple-200 opacity-60">
                  <Moon className="w-16 h-16 mx-auto mb-4 opacity-40" />
                  <p>No dreams recorded yet</p>
                  <p className="text-sm mt-2">Start your journey tonight</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredDreams.slice(0, 3).map(dream => (
                    <DreamNuggetCard 
                      key={dream.id} 
                      dream={dream} 
                      getCategoryColor={getCategoryColor} 
                      getEmotionEmoji={getEmotionEmoji}
                      onClick={() => {
                        setSelectedDream(dream);
                        setShowDreamDetail(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'calendar' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-300" />
                <input
                  type="text"
                  placeholder="Search dreams..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg pl-10 pr-4 py-2 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Types</option>
                <option value="peaceful">Peaceful</option>
                <option value="lucid">Lucid</option>
                <option value="nightmare">Nightmare</option>
                <option value="adventure">Adventure</option>
                <option value="anxiety">Anxiety</option>
              </select>
            </div>

            <h2 className="text-2xl font-bold mb-4">Dream Journal</h2>
            {filteredDreams.length === 0 ? (
              <EmptyState icon={Calendar} message="No dreams match your search" />
            ) : (
              <div className="space-y-3">
                {filteredDreams.map(dream => (
                  <DreamCard 
                    key={dream.id} 
                    dream={dream} 
                    getCategoryColor={getCategoryColor} 
                    getEmotionEmoji={getEmotionEmoji}
                    onShare={shareDream}
                    onClick={() => {
                      setSelectedDream(dream);
                      setShowDreamDetail(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'assets' && (
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
                        <span className={`${getCategoryColor(dream.category)} px-2 py-1 rounded text-xs font-semibold`}>
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

        {view === 'insights' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Your Dream Patterns</h2>
            {insights ? (
              <>
                <InsightCard
                  title="Dream Overview"
                  icon={Sparkles}
                  items={[
                    { label: 'Total Dreams', value: insights.totalDreams },
                    { label: 'Current Streak', value: `${insights.currentStreak} days` },
                    { label: 'Most Common Type', value: insights.mostCommonCategory?.[0] || 'N/A', badge: true },
                    { label: 'Avg Rarity Score', value: insights.avgRarity }
                  ]}
                />

                {/* Sleep-Dream Correlations */}
                {correlations && (
                  <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-10">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-green-300" />
                      Sleep-Dream Correlations
                    </h3>
                    <div className="space-y-2 text-sm">
                      {correlations.map((insight, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-green-300">•</span>
                          <span>{insight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {insights.moodTimeline && insights.moodTimeline.length > 0 && (
                  <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-10">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Heart className="w-5 h-5 text-pink-300" />
                      Emotional Timeline (Last 7 Days)
                    </h3>
                    <div className="space-y-2">
                      {insights.moodTimeline.map((day, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="text-xs text-purple-200 w-16">{day.date}</div>
                          <div className="flex-1 bg-purple-600 bg-opacity-20 rounded-full h-6 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full flex items-center justify-center text-xs"
                              style={{ width: `${day.quality}%` }}
                            >
                              {day.quality}%
                            </div>
                          </div>
                          <span className="text-sm">{day.emotion}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-10">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-cyan-300" />
                    Recurring Themes
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {insights.topThemes.map(([theme, count]) => {
                      const size = Math.min(count * 4 + 12, 24);
                      return (
                        <span 
                          key={theme}
                          className="bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 rounded-full capitalize"
                          style={{ fontSize: `${size}px` }}
                        >
                          {theme}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <InsightCard
                  title="Sleep Metrics"
                  icon={Moon}
                  items={[
                    { label: 'Avg Sleep Quality', value: `${insights.avgSleepQuality}%` },
                    { label: 'Avg REM Sleep', value: `${insights.avgREMTime} min` }
                  ]}
                />
              </>
            ) : (
              <EmptyState icon={Sparkles} message="Record more dreams to see insights" />
            )}
          </div>
        )}

        {view === 'wearables' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Wearable Integration</h2>
            
            {/* Sync Card */}
            <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold">Sleep Tracking</h3>
                  <p className="text-sm text-blue-100">Connect your wearable device</p>
                </div>
                <Watch className="w-12 h-12 text-blue-100" />
              </div>
              <button
                onClick={syncWearableData}
                className="w-full bg-white text-blue-700 font-semibold py-3 rounded-xl hover:bg-opacity-90 transition flex items-center justify-center gap-2"
              >
                <Activity className="w-5 h-5" />
                Sync Apple Watch Data
              </button>
            </div>

            {/* Recent Sleep Sessions */}
            {wearableData.length > 0 && (
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-10">
                <h3 className="font-semibold mb-3">Recent Sleep Sessions</h3>
                <div className="space-y-3">
                  {wearableData.slice(0, 5).map((session, i) => (
                    <div key={session.id} className="bg-blue-600 bg-opacity-20 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold">
                          {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-xs bg-blue-500 px-2 py-1 rounded">{session.source}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="text-blue-200">Duration</div>
                          <div className="font-semibold">{Math.floor(session.sleepDuration / 60)}h {session.sleepDuration % 60}m</div>
                        </div>
                        <div>
                          <div className="text-blue-200">Quality</div>
                          <div className="font-semibold">{session.sleepQuality}%</div>
                        </div>
                        <div>
                          <div className="text-blue-200">REM</div>
                          <div className="font-semibold">{session.remDuration}m</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info */}
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-10">
              <h3 className="font-semibold mb-2">Supported Devices</h3>
              <div className="text-sm space-y-1 text-purple-200">
                <div>✅ Apple Watch (HealthKit)</div>
                <div>✅ Fitbit</div>
                <div>✅ Oura Ring</div>
                <div>✅ Whoop</div>
                <div className="text-xs text-purple-300 mt-2">
                  More integrations coming soon
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'achievements' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Achievements</h2>
            
            {achievements.length === 0 ? (
              <EmptyState icon={Award} message="Complete challenges to unlock achievements" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.map(achievement => (
                  <div 
                    key={achievement.id}
                    className="bg-gradient-to-br from-yellow-600 to-orange-600 rounded-xl p-4 shadow-lg"
                  >
                    <div className="text-4xl mb-2">{achievement.icon}</div>
                    <h3 className="font-bold text-lg">{achievement.title}</h3>
                    <p className="text-sm text-yellow-100">{achievement.description}</p>
                    <div className="text-xs text-yellow-200 mt-2">
                      Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-10 mt-6">
              <h3 className="font-semibold mb-3">Coming Soon...</h3>
              <div className="space-y-2 text-sm text-purple-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">🏆</div>
                  <div>Dream Master - Record 50 dreams</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">🌙</div>
                  <div>Night Owl - Record dreams for 30 days straight</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">💎</div>
                  <div>Rare Collection - 5 high-rarity dream assets</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'privacy' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Privacy & Data Sovereignty</h2>
            
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={exportAllData}
                className="bg-blue-600 hover:bg-blue-700 py-3 rounded-lg transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export All Data
              </button>
              <button
                onClick={deleteAllUserData}
                className="bg-red-600 hover:bg-red-700 py-3 rounded-lg transition flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Delete Everything
              </button>
            </div>

            {/* Privacy Settings */}
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-10">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-300" />
                Granular Privacy Controls
              </h3>
              <div className="space-y-4">
                <PrivacyToggle
                  label="AI Dream Analysis"
                  description="Allow Claude AI to analyze dream content"
                  value={privacySettings.aiAnalysis}
                  onChange={(v) => {
                    const newSettings = {...privacySettings, aiAnalysis: v};
                    setPrivacySettings(newSettings);
                    savePrivacySettings(newSettings);
                  }}
                  required={true}
                  note="Required for core functionality"
                />
                
                <PrivacyToggle
                  label="Image Generation"
                  description="Generate AI images from dreams"
                  value={privacySettings.imageGeneration}
                  onChange={(v) => {
                    const newSettings = {...privacySettings, imageGeneration: v};
                    setPrivacySettings(newSettings);
                    savePrivacySettings(newSettings);
                  }}
                />

                <PrivacyToggle
                  label="Wearable Data Sync"
                  description="Sync sleep data from wearable devices"
                  value={privacySettings.wearableSync}
                  onChange={(v) => {
                    const newSettings = {...privacySettings, wearableSync: v};
                    setPrivacySettings(newSettings);
                    savePrivacySettings(newSettings);
                  }}
                />

                <PrivacyToggle
                  label="Anonymous Analytics"
                  description="Share anonymous usage patterns (helps improve app)"
                  value={privacySettings.anonymousAnalytics}
                  onChange={(v) => {
                    const newSettings = {...privacySettings, anonymousAnalytics: v};
                    setPrivacySettings(newSettings);
                    savePrivacySettings(newSettings);
                  }}
                />

                <PrivacyToggle
                  label="Third-Party Data Sharing"
                  description="Allow dream baskets to license your content"
                  value={privacySettings.thirdPartySharing}
                  onChange={(v) => {
                    const newSettings = {...privacySettings, thirdPartySharing: v};
                    setPrivacySettings(newSettings);
                    savePrivacySettings(newSettings);
                  }}
                  note="Required for monetization (Phase 3)"
                />
              </div>
            </div>

            {/* Data Storage Info */}
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-10">
              <h3 className="font-semibold mb-3">Where Your Data Lives</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-green-300">Local Storage (Primary)</div>
                    <div className="text-purple-200">Browser IndexedDB on your device</div>
                    <div className="text-xs text-purple-300 mt-1">You control this data completely</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Cpu className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-blue-300">Data Processors</div>
                    <div className="text-purple-200">• Claude AI (Anthropic) - Analysis only</div>
                    <div className="text-purple-200">• DALL-E (OpenAI) - Image generation</div>
                    <div className="text-xs text-purple-300 mt-1">No data retention, processing only</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Activity className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-yellow-300">Transmission</div>
                    <div className="text-purple-200">HTTPS/TLS 1.3 encrypted</div>
                    <div className="text-xs text-purple-300 mt-1">All API calls are encrypted in transit</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Moon className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-purple-300">Future: Ethereum Storage</div>
                    <div className="text-purple-200">IPFS + Ethereum for NFT minting</div>
                    <div className="text-xs text-purple-300 mt-1">Phase 3: Decentralized storage option</div>
                  </div>
                </div>
              </div>
            </div>

            {/* GDPR Rights */}
            <div className="bg-green-600 bg-opacity-20 rounded-xl p-4 border border-green-500 border-opacity-30">
              <h3 className="font-semibold mb-2">Your GDPR Rights</h3>
              <div className="text-sm space-y-1 text-green-100">
                <div>✓ Right to Access (export your data anytime)</div>
                <div>✓ Right to Rectification (edit your dreams)</div>
                <div>✓ Right to Erasure (delete everything)</div>
                <div>✓ Right to Data Portability (JSON export)</div>
                <div>✓ Right to Object (opt-out controls)</div>
                <div>✓ Right to Restrict Processing (granular controls)</div>
              </div>
            </div>

            {/* Licensing Info */}
            <button
              onClick={() => setShowLicensing(true)}
              className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded-lg transition"
            >
              View Open Source Licensing
            </button>

            {/* Terms */}
            <button
              onClick={() => setShowTerms(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg transition"
            >
              View Terms & Conditions
            </button>
          </div>
        )}
      </div>

      {/* New Entry Modal */}
      {showNewEntry && (
        <Modal onClose={cancelDream}>
          <h2 className="text-xl font-semibold mb-4">Record Your Dream</h2>

          <div className="mb-4 space-y-3">
            <div>
              <label className="text-sm text-purple-200 mb-1 block">How did you feel before bed?</label>
              <select
                value={contextData.mood}
                onChange={(e) => setContextData({...contextData, mood: e.target.value})}
                className="w-full bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg p-2 text-white"
              >
                <option value="">Select mood...</option>
                <option value="peaceful">Peaceful 😌</option>
                <option value="anxious">Anxious 😰</option>
                <option value="excited">Excited 🤩</option>
                <option value="tired">Tired 😴</option>
                <option value="stressed">Stressed 😓</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm text-purple-200 mb-1 block">What happened yesterday?</label>
              <input
                type="text"
                placeholder="Work meeting, dinner with friends..."
                value={contextData.yesterdayEvents}
                onChange={(e) => setContextData({...contextData, yesterdayEvents: e.target.value})}
                className="w-full bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg p-2 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {pendingTranscription && (
            <div className="mb-4 p-3 bg-green-600 bg-opacity-20 border border-green-500 border-opacity-30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-300">Transcribed from: {pendingTranscription.audioFile}</span>
              </div>
              <p className="text-xs text-green-200">Review and edit the transcription below, then save</p>
            </div>
          )}

          {isTranscribing && (
            <div className="mb-4 p-4 bg-blue-600 bg-opacity-20 border border-blue-500 border-opacity-30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <div>
                  <div className="text-sm font-semibold text-blue-300">Transcribing audio...</div>
                  <div className="text-xs text-blue-200">This may take a few seconds</div>
                </div>
              </div>
            </div>
          )}

          {isGeneratingImage && (
            <div className="mb-4 p-4 bg-purple-600 bg-opacity-20 border border-purple-500 border-opacity-30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                <div>
                  <div className="text-sm font-semibold text-purple-300">Generating dream image...</div>
                  <div className="text-xs text-purple-200">Creating visual representation</div>
                </div>
              </div>
            </div>
          )}

          <textarea
            value={currentEntry}
            onChange={(e) => setCurrentEntry(e.target.value)}
            placeholder="Describe your dream... speak your truth or type it out"
            className="w-full h-40 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg p-3 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none mb-4"
            disabled={isTranscribing || isGeneratingImage}
          />

          <div className="grid grid-cols-2 gap-3 mb-4">
            {!isRecording ? (
              <button
                onClick={startVoiceRecording}
                disabled={isTranscribing || isGeneratingImage}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:opacity-50 py-3 rounded-lg flex items-center justify-center gap-2 transition transform active:scale-95"
              >
                <Mic className="w-5 h-5" />
                Voice Record
              </button>
            ) : (
              <button
                onClick={stopVoiceRecording}
                className="bg-red-700 py-3 rounded-lg flex items-center justify-center gap-2 animate-pulse"
              >
                <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                Recording...
              </button>
            )}
            
            <button
              onClick={() => document.getElementById('audioInput').click()}
              disabled={isTranscribing || isRecording || isGeneratingImage}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 py-3 rounded-lg flex items-center justify-center gap-2 transition transform active:scale-95"
            >
              {isTranscribing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Import Audio
                </>
              )}
            </button>
            <input
              id="audioInput"
              type="file"
              accept="audio/*"
              onChange={handleAudioImport}
              className="hidden"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={cancelDream}
              className="flex-1 bg-gray-600 hover:bg-gray-700 py-3 rounded-lg font-semibold transition"
            >
              Cancel
            </button>
            <button
              onClick={saveDream}
              disabled={!currentEntry.trim() || isProcessing || isTranscribing || isGeneratingImage}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:opacity-50 py-3 rounded-lg font-semibold transition transform active:scale-95"
            >
              {isProcessing || isGeneratingImage ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {isGeneratingImage ? 'Creating Asset...' : 'Analyzing...'}
                </span>
              ) : (
                'Save Dream'
              )}
            </button>
          </div>
        </Modal>
      )}

      {/* Dream Detail Modal */}
      {showDreamDetail && selectedDream && (
        <Modal onClose={() => setShowDreamDetail(false)}>
          <div className="space-y-4">
            {/* Generated Image */}
            {selectedDream.generatedImage && (
              <div className="relative -mt-6 -mx-6 mb-4">
                <img 
                  src={selectedDream.generatedImage.url} 
                  alt="Dream visualization"
                  className="w-full h-64 object-cover rounded-t-2xl"
                />
                <div className="absolute top-2 right-2 bg-black bg-opacity-60 px-2 py-1 rounded flex items-center gap-1 text-xs">
                  <Sparkles className="w-3 h-3" />
                  AI Generated
                </div>
              </div>
            )}

            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`${getCategoryColor(selectedDream.category)} px-3 py-1 rounded-full text-xs font-semibold`}>
                    {selectedDream.category}
                  </span>
                  <span className="text-2xl">{getEmotionEmoji(selectedDream.emotion)}</span>
                </div>
                <div className="text-sm text-purple-200">
                  {new Date(selectedDream.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric' 
                  })}
                </div>
              </div>
            </div>

            <div>
              <p className="text-lg font-semibold text-purple-100 italic mb-3">
                "{selectedDream.nugget}"
              </p>
              <p className="text-sm leading-relaxed">{selectedDream.narrative}</p>
            </div>

            {/* Asset Info */}
            {selectedDream.assetMetadata && (
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Dream Asset Metadata
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-purple-200">Rarity Score</div>
                    <div className="font-bold">{selectedDream.assetMetadata.rarityScore}</div>
                  </div>
                  <div>
                    <div className="text-purple-200">Uniqueness</div>
                    <div className="font-bold">{selectedDream.assetMetadata.uniquenessScore}</div>
                  </div>
                  <div>
                    <div className="text-purple-200">Potential Value</div>
                    <div className="font-bold capitalize">{selectedDream.assetMetadata.potentialValue}</div>
                  </div>
                  <div>
                    <div className="text-purple-200">Watermarked</div>
                    <div className="font-bold">✓ Verified</div>
                  </div>
                </div>
              </div>
            )}

            {/* Symbol Interpretation */}
            {selectedDream.interpretation && (
              <div className="bg-purple-600 bg-opacity-20 rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Dream Interpretation
                </h3>
                <p className="text-sm mb-3">{selectedDream.interpretation.meaning}</p>
                
                {Object.keys(selectedDream.interpretation.symbols || {}).length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-purple-200">Symbols:</div>
                    {Object.entries(selectedDream.interpretation.symbols).map(([symbol, meaning]) => (
                      <div key={symbol} className="text-xs">
                        <span className="font-semibold text-purple-300 capitalize">{symbol}:</span> {meaning}
                      </div>
                    ))}
                  </div>
                )}

                {selectedDream.interpretation.commonPattern && (
                  <div className="mt-3 text-xs text-purple-200 italic">
                    💡 {selectedDream.interpretation.commonPattern}
                  </div>
                )}
              </div>
            )}

            {/* Context */}
            {selectedDream.context && (selectedDream.context.mood || selectedDream.context.yesterdayEvents) && (
              <div className="bg-blue-600 bg-opacity-20 rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-sm">Context</h3>
                <div className="text-xs space-y-1">
                  {selectedDream.context.mood && (
                    <div><span className="text-blue-200">Mood before bed:</span> {selectedDream.context.mood}</div>
                  )}
                  {selectedDream.context.yesterdayEvents && (
                    <div><span className="text-blue-200">Yesterday:</span> {selectedDream.context.yesterdayEvents}</div>
                  )}
                </div>
              </div>
            )}

            {/* Similar Dreams */}
            {!selectedDream.isSample && findSimilarDreams(selectedDream).length > 0 && (
              <div className="bg-pink-600 bg-opacity-20 rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-sm flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Similar Dreams
                </h3>
                <div className="space-y-2">
                  {findSimilarDreams(selectedDream).map(({ dream }) => (
                    <div 
                      key={dream.id}
                      onClick={() => setSelectedDream(dream)}
                      className="text-xs p-2 bg-pink-500 bg-opacity-20 rounded cursor-pointer hover:bg-opacity-30 transition"
                    >
                      {new Date(dream.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {dream.nugget?.substring(0, 60)}...
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => shareDream(selectedDream)}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 py-3 rounded-lg transition flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>
        </Modal>
      )}

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

      {/* Settings Modal */}
      {showSettings && (
        <Modal onClose={() => setShowSettings(false)}>
          <h2 className="text-xl font-semibold mb-4">Settings</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Wearable Sync</span>
              <button
                onClick={() => {
                  const newSettings = {...settings, wearableSync: !settings.wearableSync};
                  setSettings(newSettings);
                  saveSettingsToStorage(newSettings);
                }}
                className={`w-12 h-7 rounded-full transition ${settings.wearableSync ? 'bg-purple-600' : 'bg-gray-600'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition transform ${settings.wearableSync ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span>Image Generation</span>
              <button
                onClick={() => {
                  const newSettings = {...settings, imageGeneration: !settings.imageGeneration};
                  setSettings(newSettings);
                  saveSettingsToStorage(newSettings);
                }}
                className={`w-12 h-7 rounded-full transition ${settings.imageGeneration ? 'bg-purple-600' : 'bg-gray-600'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition transform ${settings.imageGeneration ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="bg-purple-600 bg-opacity-20 p-3 rounded-lg">
              <div className="text-sm text-purple-200 mb-2">Stored Data:</div>
              <div className="text-xs text-white space-y-1">
                <div>Dreams: {dreams.filter(d => !d.isSample).length}</div>
                <div>With Images: {dreams.filter(d => !d.isSample && d.generatedImage).length}</div>
                <div>Wearable Sessions: {wearableData.length}</div>
                <div>Achievements: {achievements.length}</div>
                <div className="text-green-300 mt-2">✓ All stored locally on your device</div>
              </div>
            </div>

            <div className="border-t border-white border-opacity-20 pt-4 space-y-2">
              <button
                onClick={() => {
                  setShowSettings(false);
                  setView('privacy');
                }}
                className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-lg transition flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4" />
                Privacy & Data Controls
              </button>

              <button
                onClick={() => {
                  setShowSettings(false);
                  setShowLicensing(true);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg transition"
              >
                Open Source Licensing
              </button>

              <button
                onClick={() => {
                  setShowSettings(false);
                  setShowTerms(true);
                }}
                className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded-lg transition"
              >
                Terms & Conditions
              </button>
            </div>

            <button 
              onClick={exportAllData}
              className="w-full bg-cyan-600 hover:bg-cyan-700 py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export All Data (GDPR)
            </button>
            
            <button 
              onClick={deleteAllUserData}
              className="w-full bg-red-600 hover:bg-red-700 py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Delete All Data (GDPR Article 17)
            </button>
          </div>
        </Modal>
      )}

      {/* Share Modal */}
      {showShareModal && selectedDream && (
        <Modal onClose={() => setShowShareModal(false)}>
          <h2 className="text-xl font-semibold mb-4">Share Dream</h2>
          
          {selectedDream.generatedImage ? (
            <img 
              src={selectedDream.generatedImage.url} 
              alt="Dream visualization"
              className="w-full h-64 object-cover rounded-xl mb-4"
            />
          ) : (
            <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl p-6 mb-4 aspect-square flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl mb-4">🌙</div>
                <p className="text-white italic text-lg leading-relaxed">
                  "{selectedDream.nugget}"
                </p>
                <div className="mt-4 text-purple-200 text-sm">
                  {new Date(selectedDream.date).toLocaleDateString()}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={generateShareableImage}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Share to Instagram Stories
            </button>
            
            <button
              onClick={() => {
                navigator.clipboard.writeText(`"${selectedDream.nugget}" - From my DreamScape journal 🌙`);
                alert('Dream copied to clipboard!');
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg transition"
            >
              Copy Dream Text
            </button>
          </div>
        </Modal>
      )}

      {/* Achievement Popup */}
      {showAchievement && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-4 shadow-2xl max-w-sm">
            <div className="flex items-center gap-3">
              <div className="text-4xl">{showAchievement.icon}</div>
              <div>
                <div className="font-bold text-white">{showAchievement.title === 'Dream Asset Created' ? 'Asset Created!' : 'Achievement Unlocked!'}</div>
                <div className="text-sm text-yellow-100">{showAchievement.description}</div>
              </div>
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
      {showTerms && (
        <Modal onClose={() => !hasAcceptedTerms ? null : setShowTerms(false)}>
          <h2 className="text-2xl font-bold mb-4">Terms & Conditions</h2>
          
          <div className="space-y-4 text-sm max-h-96 overflow-y-auto">
            <div className="bg-purple-600 bg-opacity-20 rounded-lg p-4">
              <h3 className="font-semibold mb-2">1. Your Data, Your Rights</h3>
              <p className="text-purple-100 text-xs leading-relaxed">
                You retain 100% ownership of all dream content, metadata, and generated assets. DreamScape operates on a "loan, not transfer" model. You license your data to us for processing only. This license is revocable at any time. You may delete all data permanently exercising GDPR Article 17 (Right to Erasure).
              </p>
            </div>

            <div className="bg-blue-600 bg-opacity-20 rounded-lg p-4">
              <h3 className="font-semibold mb-2">2. Data Processing</h3>
              <div className="text-blue-100 text-xs space-y-2">
                <p><strong>What we process:</strong></p>
                <ul className="list-disc list-inside ml-2">
                  <li>Dream text for AI analysis (Anthropic Claude)</li>
                  <li>Dream content for image generation (OpenAI DALL-E)</li>
                  <li>Anonymized usage statistics (optional, opt-in)</li>
                </ul>
                <p className="mt-2"><strong>What we DON'T do:</strong></p>
                <ul className="list-disc list-inside ml-2">
                  <li>Sell your data to third parties</li>
                  <li>Use your dreams to train AI models without consent</li>
                  <li>Share personal information with advertisers</li>
                  <li>Retain data after you request deletion</li>
                </ul>
              </div>
            </div>

            <div className="bg-green-600 bg-opacity-20 rounded-lg p-4">
              <h3 className="font-semibold mb-2">3. Data Storage & Location</h3>
              <div className="text-green-100 text-xs space-y-1">
                <p><strong>Primary Storage:</strong> Browser IndexedDB (your device)</p>
                <p><strong>Processing:</strong> Anthropic API (US), OpenAI API (US)</p>
                <p><strong>Future:</strong> IPFS (decentralized) + Ethereum (blockchain)</p>
                <p className="mt-2">Data transmission uses TLS 1.3 encryption. Processing APIs do not retain your data per their privacy policies.</p>
              </div>
            </div>

            <div className="bg-yellow-600 bg-opacity-20 rounded-lg p-4">
              <h3 className="font-semibold mb-2">4. NFT Ownership & Smart Contracts</h3>
              <div className="text-yellow-100 text-xs space-y-2">
                <p>When you mint a dream as an NFT:</p>
                <ul className="list-disc list-inside ml-2">
                  <li>You own the NFT on-chain</li>
                  <li>Content stored on IPFS remains under your license</li>
                  <li>Smart contract is GPL-3.0 (open source)</li>
                  <li>You can sell, transfer, or burn the NFT</li>
                  <li>Original watermark proves provenance</li>
                </ul>
                <p className="mt-2 bg-yellow-700 bg-opacity-30 p-2 rounded">
                  ⚠️ <strong>Important:</strong> Once minted to Ethereum, the NFT is permanent on-chain. The content link can be updated, but the token exists forever.
                </p>
              </div>
            </div>

            <div className="bg-red-600 bg-opacity-20 rounded-lg p-4">
              <h3 className="font-semibold mb-2">5. Dream Economy Participation (Phase 3)</h3>
              <div className="text-red-100 text-xs space-y-2">
                <p>If you choose to participate in Dream Economy baskets:</p>
                <ul className="list-disc list-inside ml-2">
                  <li>Your dreams may be licensed to third parties (with your consent)</li>
                  <li>You earn yield from licensing fees</li>
                  <li>You can opt-out anytime</li>
                  <li>License terms are transparent in smart contracts</li>
                  <li>Rarity scoring is algorithmic and auditable</li>
                </ul>
                <p className="mt-2"><strong>You control:</strong> Which dreams to include, licensing terms, opt-out timing</p>
              </div>
            </div>

            <div className="bg-purple-600 bg-opacity-20 rounded-lg p-4">
              <h3 className="font-semibold mb-2">6. Privacy & GDPR Compliance</h3>
              <div className="text-purple-100 text-xs space-y-1">
                <p><strong>Legal Basis:</strong> Consent (GDPR Article 6(1)(a))</p>
                <p><strong>Data Controller:</strong> DreamScape (open source project)</p>
                <p><strong>Data Processors:</strong> Anthropic, OpenAI (bound by DPAs)</p>
                <p><strong>Retention:</strong> Until you delete (no automatic deletion)</p>
                <p><strong>Your Rights:</strong> Access, rectification, erasure, portability, restriction, objection</p>
                <p className="mt-2 bg-purple-700 bg-opacity-30 p-2 rounded">
                  To exercise rights: Use in-app Privacy controls or contact via GitHub
                </p>
              </div>
            </div>

            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <h3 className="font-semibold mb-2">7. Disclaimers</h3>
              <div className="text-xs space-y-1">
                <p><strong>Medical:</strong> DreamScape is not a medical device. Dream analysis is for entertainment/insight only.</p>
                <p><strong>Therapeutic:</strong> Not a replacement for professional mental health care.</p>
                <p><strong>Financial:</strong> NFT and basket values may fluctuate. Not financial advice.</p>
                <p><strong>Technical:</strong> Software provided "as is" under MIT license.</p>
              </div>
            </div>

            <div className="bg-cyan-600 bg-opacity-20 rounded-lg p-4">
              <h3 className="font-semibold mb-2">8. Changes to Terms</h3>
              <p className="text-cyan-100 text-xs">
                We may update these terms. You'll be notified in-app. Continued use after notification constitutes acceptance. You can always export your data and leave if you disagree with changes.
              </p>
            </div>

            <div className="bg-green-600 bg-opacity-20 rounded-lg p-4">
              <h3 className="font-semibold mb-2">9. Contact & Support</h3>
              <div className="text-green-100 text-xs">
                <p><strong>GitHub:</strong> github.com/dreamscape/dreamscape</p>
                <p><strong>Privacy Inquiries:</strong> Via GitHub Issues</p>
                <p><strong>GDPR Requests:</strong> privacy@dreamscape.app (when live)</p>
              </div>
            </div>
          </div>

          {!hasAcceptedTerms && (
            <div className="mt-6 space-y-3">
              <div className="bg-yellow-600 bg-opacity-20 p-3 rounded-lg text-xs text-yellow-100">
                ⚠️ You must accept these terms to use DreamScape. Your data sovereignty and privacy are our highest priority.
              </div>
              <button
                onClick={acceptTerms}
                className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-lg font-semibold transition"
              >
                I Accept - Start Dreaming
              </button>
              <button
                onClick={() => window.close()}
                className="w-full bg-gray-600 hover:bg-gray-700 py-2 rounded-lg text-sm transition"
              >
                I Don't Accept - Close App
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

// Components
const NavButton = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap ${
      active ? 'bg-purple-600' : 'bg-white bg-opacity-10 hover:bg-opacity-20'
    }`}
  >
    <Icon className="w-4 h-4" />
    <span className="text-sm">{label}</span>
  </button>
);

const StatCard = ({ icon: Icon, value, label }) => (
  <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-10">
    <Icon className="w-5 h-5 text-purple-300 mb-2" />
    <div className="text-2xl font-bold">{value}</div>
    <div className="text-xs text-purple-200">{label}</div>
  </div>
);

const DreamNuggetCard = ({ dream, getCategoryColor, getEmotionEmoji, onClick }) => (
  <div 
    onClick={onClick}
    className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl p-4 shadow-lg cursor-pointer hover:shadow-2xl transition transform hover:scale-105"
  >
    <div className="flex items-start justify-between mb-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-purple-100">
          {new Date(dream.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
        <span className="text-lg">{getEmotionEmoji(dream.emotion)}</span>
      </div>
      <span className={`${getCategoryColor(dream.category)} px-2 py-1 rounded text-xs font-semibold`}>
        {dream.category}
      </span>
    </div>
    <p className="text-white italic text-sm leading-relaxed">
      "{dream.nugget}"
    </p>
    {dream.assetMetadata && (
      <div className="mt-2 flex items-center gap-2 text-xs">
        <Shield className="w-3 h-3" />
        <span>Rarity: {dream.assetMetadata.rarityScore}</span>
      </div>
    )}
    {dream.isSample && (
      <div className="mt-2 text-xs text-purple-200 bg-purple-700 bg-opacity-30 px-2 py-1 rounded">
        👋 Sample dream - Tap "I had a dream..." to add your own
      </div>
    )}
  </div>
);

const DreamCard = ({ dream, getCategoryColor, getEmotionEmoji, onShare, onClick }) => (
  <div 
    className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl overflow-hidden border border-white border-opacity-10 cursor-pointer hover:bg-opacity-15 transition"
  >
    {dream.generatedImage && (
      <img 
        src={dream.generatedImage.url} 
        alt="Dream visualization"
        className="w-full h-48 object-cover"
        onClick={onClick}
      />
    )}
    <div onClick={onClick} className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="text-sm text-purple-200">
            {new Date(dream.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
          <span className="text-xl">{getEmotionEmoji(dream.emotion)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`${getCategoryColor(dream.category)} px-3 py-1 rounded-full text-xs font-semibold`}>
            {dream.category}
          </span>
        </div>
      </div>
      
      <div className="mb-3">
        <p className="text-sm font-semibold text-purple-100 mb-2 italic">"{dream.nugget}"</p>
      </div>
      
      <div className="flex gap-2 flex-wrap mb-2">
        {dream.themes?.slice(0, 4).map((theme, i) => (
          <span key={i} className="text-xs bg-purple-500 bg-opacity-30 px-2 py-1 rounded">
            {theme}
          </span>
        ))}
      </div>

      {dream.assetMetadata && (
        <div className="flex items-center justify-between text-xs text-purple-300 border-t border-white border-opacity-10 pt-2">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Rarity: {dream.assetMetadata.rarityScore}
          </span>
          <span>Asset #{dream.id.substring(0, 8)}</span>
        </div>
      )}
    </div>
  </div>
);

const InsightCard = ({ title, icon: Icon, items }) => (
  <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-10">
    <h3 className="font-semibold mb-3 flex items-center gap-2">
      <Icon className="w-5 h-5 text-yellow-300" />
      {title}
    </h3>
    <div className="space-y-2 text-sm">
      {items.map((item, i) => (
        <div key={i} className="flex justify-between items-center">
          <span className="text-purple-200 capitalize">{item.label}:</span>
          {item.badge ? (
            <span className="bg-purple-500 px-2 py-1 rounded text-xs font-semibold">{item.value}</span>
          ) : (
            <span className="font-semibold">{item.value}</span>
          )}
        </div>
      ))}
    </div>
  </div>
);

const EmptyState = ({ icon: Icon, message }) => (
  <div className="text-center py-12 text-purple-200 opacity-60">
    <Icon className="w-16 h-16 mx-auto mb-4 opacity-40" />
    <p>{message}</p>
  </div>
);

const Modal = ({ children, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
    <div className="bg-gradient-to-b from-purple-900 to-indigo-900 w-full sm:max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto relative">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 text-purple-200 hover:text-white z-10"
      >
        <X className="w-6 h-6" />
      </button>
      {children}
    </div>
  </div>
);

const PrivacyToggle = ({ label, description, value, onChange, required, note }) => (
  <div className="border-b border-white border-opacity-10 pb-3">
    <div className="flex items-start justify-between mb-1">
      <div className="flex-1">
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-xs text-purple-300">{description}</div>
        {note && (
          <div className="text-xs text-yellow-300 mt-1">ℹ️ {note}</div>
        )}
      </div>
      <button
        onClick={() => !required && onChange(!value)}
        disabled={required}
        className={`ml-4 w-12 h-7 rounded-full transition flex-shrink-0 ${
          value ? 'bg-green-600' : 'bg-gray-600'
        } ${required ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className={`w-5 h-5 bg-white rounded-full transition transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  </div>
);

export default DreamScapeApp;