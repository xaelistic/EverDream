import React, { useState, useEffect } from 'react';
import { X, Moon, Sun, Brain, Heart, Clock, Bell, Shield, Check, ChevronRight, Sparkles } from 'lucide-react';

interface OnboardingFlowProps {
  onComplete: (preferences: OnboardingPreferences) => void;
  onSkip: () => void;
}

export interface OnboardingPreferences {
  sleepSchedule: {
    bedtime: string;
    wakeTime: string;
  };
  goals: string[];
  experience: string;
  traditions: string[];
  notificationsEnabled: boolean;
  dataProcessingConsent: boolean;
}

const defaultPreferences: OnboardingPreferences = {
  sleepSchedule: {
    bedtime: '23:00',
    wakeTime: '07:00',
  },
  goals: [],
  experience: 'beginner',
  traditions: [],
  notificationsEnabled: true,
  dataProcessingConsent: false,
};

export default function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [preferences, setPreferences] = useState<OnboardingPreferences>(defaultPreferences);
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);

  const steps = [
    'welcome',
    'goals',
    'experience',
    'sleep-schedule',
    'traditions',
    'permissions',
    'complete',
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete(preferences);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      onSkip();
    }
  };

  const updatePreference = (key: keyof OnboardingPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const toggleGoal = (goal: string) => {
    setPreferences(prev => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter(g => g !== goal)
        : [...prev.goals, goal],
    }));
  };

  const toggleTradition = (tradition: string) => {
    setPreferences(prev => ({
      ...prev,
      traditions: prev.traditions.includes(tradition)
        ? prev.traditions.filter(t => t !== tradition)
        : [...prev.traditions, tradition],
    }));
  };

  const requestAllPermissions = async () => {
    setIsRequestingPermissions(true);
    
    try {
      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      // Request camera permission
      if ('mediaDevices' in navigator) {
        try {
          await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (e) {
          console.log('Camera permission denied');
        }
      }

      // Request microphone permission
      if ('mediaDevices' in navigator) {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e) {
          console.log('Microphone permission denied');
        }
      }

      // Request storage permission (for PWA)
      if ('storage' in navigator && 'persist' in navigator.storage) {
        try {
          await navigator.storage.persist();
        } catch (e) {
          console.log('Storage persistence not granted');
        }
      }

      updatePreference('notificationsEnabled', true);
    } catch (error) {
      console.error('Permission request error:', error);
    } finally {
      setIsRequestingPermissions(false);
      handleNext();
    }
  };

  const renderStep = () => {
    switch (steps[step]) {
      case 'welcome':
        return (
          <div className="text-center py-8">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Moon className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to DreamScape
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
              Your personal dream journal powered by AI. Capture, analyze, and understand your dreams like never before.
            </p>
            <div className="space-y-4 text-left max-w-md mx-auto">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900">AI-Powered Analysis</h3>
                  <p className="text-sm text-gray-600">Deep insights into your dream symbols and patterns</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Brain className="w-5 h-5 text-indigo-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900">Sleep Tracking</h3>
                  <p className="text-sm text-gray-600">Correlate dreams with sleep quality and stages</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Heart className="w-5 h-5 text-indigo-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900">Privacy First</h3>
                  <p className="text-sm text-gray-600">Your dreams belong to you. Full ownership, always.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'goals':
        return (
          <div className="py-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">What are your goals?</h2>
            <p className="text-gray-600 mb-6">Select all that apply</p>
            
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'better-dreams', label: 'Have better dreams', icon: Moon },
                { id: 'lucid-dreaming', label: 'Explore lucid dreaming', icon: Sparkles },
                { id: 'self-discovery', label: 'Self-discovery & insight', icon: Brain },
                { id: 'sleep-quality', label: 'Improve sleep quality', icon: Heart },
                { id: 'creativity', label: 'Boost creativity', icon: Sparkles },
                { id: 'stress-relief', label: 'Reduce stress & anxiety', icon: Heart },
                { id: 'memory', label: 'Remember more dreams', icon: Brain },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => toggleGoal(id)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    preferences.goals.includes(id)
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    preferences.goals.includes(id)
                      ? 'border-indigo-500 bg-indigo-500'
                      : 'border-gray-300'
                  }`}>
                    {preferences.goals.includes(id) && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <Icon className={`w-5 h-5 ${
                    preferences.goals.includes(id) ? 'text-indigo-500' : 'text-gray-400'
                  }`} />
                  <span className={`font-medium ${
                    preferences.goals.includes(id) ? 'text-indigo-900' : 'text-gray-700'
                  }`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );

      case 'experience':
        return (
          <div className="py-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Dream Journal Experience</h2>
            <p className="text-gray-600 mb-6">How familiar are you with dream journaling?</p>
            
            <div className="space-y-3">
              {[
                { id: 'beginner', label: 'Complete beginner', desc: "I've never kept a dream journal" },
                { id: 'casual', label: 'Casual', desc: "I've tried journaling occasionally" },
                { id: 'experienced', label: 'Experienced', desc: "I keep a regular dream journal" },
                { id: 'expert', label: 'Expert', desc: "I'm a seasoned oneironaut" },
              ].map(({ id, label, desc }) => (
                <button
                  key={id}
                  onClick={() => updatePreference('experience', id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    preferences.experience === id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-gray-900">{label}</div>
                  <div className="text-sm text-gray-600">{desc}</div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'sleep-schedule':
        return (
          <div className="py-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Sleep Schedule</h2>
            <p className="text-gray-600 mb-6">This helps us time notifications with your circadian rhythm</p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Typical Bedtime
                </label>
                <input
                  type="time"
                  value={preferences.sleepSchedule.bedtime}
                  onChange={(e) => updatePreference('sleepSchedule', {
                    ...preferences.sleepSchedule,
                    bedtime: e.target.value,
                  })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Sun className="w-4 h-4 inline mr-1" />
                  Typical Wake Time
                </label>
                <input
                  type="time"
                  value={preferences.sleepSchedule.wakeTime}
                  onChange={(e) => updatePreference('sleepSchedule', {
                    ...preferences.sleepSchedule,
                    wakeTime: e.target.value,
                  })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg"
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-xl">
                <p className="text-sm text-blue-800">
                  💡 We'll send gentle reminders before bedtime and after waking to help you capture dreams at the perfect moment.
                </p>
              </div>
            </div>
          </div>
        );

      case 'traditions':
        return (
          <div className="py-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Dream Traditions</h2>
            <p className="text-gray-600 mb-6">Which interpretation styles interest you? (Optional)</p>
            
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'jungian', label: 'Jungian', desc: 'Archetypes & collective unconscious' },
                { id: 'freudian', label: 'Freudian', desc: 'Subconscious desires' },
                { id: 'gestalt', label: 'Gestalt', desc: 'Every element is you' },
                { id: 'spiritual', label: 'Spiritual', desc: 'Messages from higher self' },
                { id: 'cognitive', label: 'Cognitive', desc: 'Brain processing memories' },
                { id: 'creative', label: 'Creative', desc: 'Source of inspiration' },
                { id: 'problem-solving', label: 'Problem-solving', desc: 'Working through challenges' },
                { id: 'prophetic', label: 'Prophetic', desc: 'Glimpses of future' },
              ].map(({ id, label, desc }) => (
                <button
                  key={id}
                  onClick={() => toggleTradition(id)}
                  className={`p-3 rounded-xl border-2 transition-all text-left ${
                    preferences.traditions.includes(id)
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-sm text-gray-900">{label}</div>
                  <div className="text-xs text-gray-600">{desc}</div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'permissions':
        return (
          <div className="py-8 text-center">
            <Bell className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Enable Permissions</h2>
            <p className="text-gray-600 mb-6">We need these to give you the best experience</p>
            
            <div className="space-y-4 text-left max-w-md mx-auto mb-6">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Bell className="w-5 h-5 text-indigo-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">Notifications</h4>
                  <p className="text-sm text-gray-600">Morning reflection & evening wind-down reminders</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Moon className="w-5 h-5 text-indigo-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">Camera & Microphone</h4>
                  <p className="text-sm text-gray-600">Record dreams via video/audio with facial analysis</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Shield className="w-5 h-5 text-indigo-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">Offline Storage</h4>
                  <p className="text-sm text-gray-600">Save dreams locally for offline access</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-6">
              <input
                type="checkbox"
                id="data-consent"
                checked={preferences.dataProcessingConsent}
                onChange={(e) => updatePreference('dataProcessingConsent', e.target.checked)}
                className="w-5 h-5 text-indigo-500 rounded focus:ring-indigo-500"
              />
              <label htmlFor="data-consent" className="text-sm text-gray-700">
                I consent to AI processing of my dream content for analysis
              </label>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center py-8">
            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">You're All Set!</h2>
            <p className="text-gray-600 mb-8">
              Ready to explore your dreamscape
            </p>
            <div className="bg-indigo-50 p-6 rounded-xl text-left">
              <h3 className="font-semibold text-indigo-900 mb-3">Your Profile:</h3>
              <div className="space-y-2 text-sm text-indigo-800">
                <div>🎯 {preferences.goals.length} goals selected</div>
                <div>📚 {preferences.experience} dream journalist</div>
                <div>⏰ {preferences.sleepSchedule.bedtime} - {preferences.sleepSchedule.wakeTime}</div>
                {preferences.traditions.length > 0 && (
                  <div>🔮 {preferences.traditions.length} traditions</div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      <div className="max-w-2xl mx-auto min-h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <button
            onClick={handleBack}
            className="text-gray-500 hover:text-gray-700"
          >
            {step === 0 ? <X className="w-6 h-6" /> : <ChevronRight className="w-6 h-6 rotate-180" />}
          </button>
          
          <div className="flex items-center gap-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i <= step ? 'bg-indigo-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          
          <button
            onClick={onSkip}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Skip
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 px-6">
          {renderStep()}
        </div>

        {/* Footer */}
        {steps[step] !== 'complete' && (
          <div className="p-6 border-t">
            {steps[step] === 'permissions' ? (
              <button
                onClick={requestAllPermissions}
                disabled={isRequestingPermissions || !preferences.dataProcessingConsent}
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRequestingPermissions ? 'Requesting...' : 'Enable All Permissions'}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                Continue
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
