/**
 * Onboarding Flow Component
 * Guides new users through setup: goals, preferences, wearable connection
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Check, Moon, Sun, Clock, Brain, Heart, 
  Zap, Shield, Sparkles, Star, Target, Smile, Coffee,
  ChevronRight, X
} from 'lucide-react';

interface OnboardingProps {
  onComplete: (preferences: OnboardingPreferences) => void;
  user?: any;
}

interface OnboardingPreferences {
  goals: string[];
  sleepSchedule: {
    bedtime: string;
    wakeTime: string;
  };
  dreamRecall: 'low' | 'medium' | 'high';
  interests: string[];
  wearableConnected: boolean;
  notificationsEnabled: boolean;
  privacyLevel: 'private' | 'friends' | 'public';
}

const steps = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'goals', title: 'Goals' },
  { id: 'schedule', title: 'Schedule' },
  { id: 'interests', title: 'Interests' },
  { id: 'wearable', title: 'Wearables' },
  { id: 'privacy', title: 'Privacy' },
  { id: 'complete', title: 'Done' }
];

const goalOptions = [
  { id: 'recall', label: 'Improve Dream Recall', icon: Brain, description: 'Remember more dreams' },
  { id: 'lucid', label: 'Have Lucid Dreams', icon: Sparkles, description: 'Become aware while dreaming' },
  { id: 'sleep', label: 'Better Sleep Quality', icon: Moon, description: 'Track and optimize sleep' },
  { id: 'creative', label: 'Boost Creativity', icon: Zap, description: 'Get inspired by dreams' },
  { id: 'therapy', label: 'Self-Discovery', icon: Heart, description: 'Understand your subconscious' },
  { id: 'fun', label: 'Just for Fun', icon: Smile, description: 'Explore your dreams casually' }
];

const interestOptions = [
  'Psychology', 'Spirituality', 'Art', 'Science', 'Meditation',
  'Lucid Dreaming', 'Nightmares', 'Recurring Dreams', 'Dream Interpretation',
  'Sleep Health', 'Mindfulness', 'Creativity'
];

export default function Onboarding({ onComplete, user }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [preferences, setPreferences] = useState<OnboardingPreferences>({
    goals: [],
    sleepSchedule: { bedtime: '22:00', wakeTime: '07:00' },
    dreamRecall: 'medium',
    interests: [],
    wearableConnected: false,
    notificationsEnabled: true,
    privacyLevel: 'private'
  });
  const [loading, setLoading] = useState(false);

  const updatePreferences = (updates: Partial<OnboardingPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const completeOnboarding = async () => {
    setLoading(true);
    // Simulate saving preferences
    await new Promise(resolve => setTimeout(resolve, 1500));
    onComplete(preferences);
    setLoading(false);
  };

  const toggleGoal = (goalId: string) => {
    updatePreferences({
      goals: preferences.goals.includes(goalId)
        ? preferences.goals.filter(g => g !== goalId)
        : [...preferences.goals, goalId]
    });
  };

  const toggleInterest = (interest: string) => {
    updatePreferences({
      interests: preferences.interests.includes(interest)
        ? preferences.interests.filter(i => i !== interest)
        : [...preferences.interests, interest]
    });
  };

  const renderProgress = () => (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-medium text-gray-600">
          Step {currentStep + 1} of {steps.length - 1}
        </span>
        <span className="text-sm text-gray-500">
          {Math.round(((currentStep + 1) / (steps.length - 1)) * 100)}% complete
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${((currentStep + 1) / (steps.length - 1)) * 100}%` }}
          className="h-full bg-gradient-to-r from-purple-600 to-pink-600"
        />
      </div>
    </div>
  );

  const renderWelcome = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-12"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
        className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl mx-auto mb-6 flex items-center justify-center"
      >
        <Moon className="w-12 h-12 text-white" />
      </motion.div>
      
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Welcome to EverDream, {user?.name || 'Dreamer'}!
      </h1>
      <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
        Let's personalize your dream journal experience. This will take about 2 minutes.
      </p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { icon: Target, label: 'Set Goals' },
          { icon: Clock, label: 'Track Sleep' },
          { icon: Star, label: 'Get Insights' }
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            className="flex flex-col items-center p-4 bg-gray-50 rounded-xl"
          >
            <item.icon className="w-6 h-6 text-purple-600 mb-2" />
            <span className="text-xs font-medium text-gray-700">{item.label}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  const renderGoals = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-2">What are your goals?</h2>
      <p className="text-gray-600 mb-6">Select all that apply</p>

      <div className="grid grid-cols-1 gap-3">
        {goalOptions.map((goal) => {
          const isSelected = preferences.goals.includes(goal.id);
          return (
            <motion.button
              key={goal.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggleGoal(goal.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  isSelected ? 'bg-purple-500' : 'bg-gray-100'
                }`}>
                  <goal.icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{goal.label}</h3>
                  <p className="text-sm text-gray-600">{goal.description}</p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  isSelected ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                }`}>
                  {isSelected && <Check className="w-4 h-4 text-white" />}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );

  const renderSchedule = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-2">What's your sleep schedule?</h2>
      <p className="text-gray-600 mb-6">This helps us send timely reminders</p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Moon className="w-4 h-4 inline mr-2" />
            Bedtime
          </label>
          <input
            type="time"
            value={preferences.sleepSchedule.bedtime}
            onChange={(e) => updatePreferences({
              sleepSchedule: { ...preferences.sleepSchedule, bedtime: e.target.value }
            })}
            className="w-full p-4 border-2 border-gray-200 rounded-xl text-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Sun className="w-4 h-4 inline mr-2" />
            Wake Time
          </label>
          <input
            type="time"
            value={preferences.sleepSchedule.wakeTime}
            onChange={(e) => updatePreferences({
              sleepSchedule: { ...preferences.sleepSchedule, wakeTime: e.target.value }
            })}
            className="w-full p-4 border-2 border-gray-200 rounded-xl text-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            How would you rate your dream recall?
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['low', 'medium', 'high'] as const).map((level) => (
              <button
                key={level}
                onClick={() => updatePreferences({ dreamRecall: level })}
                className={`p-4 rounded-xl border-2 font-medium capitalize transition-all ${
                  preferences.dreamRecall === level
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderInterests = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-2">What interests you?</h2>
      <p className="text-gray-600 mb-6">Select topics you'd like to explore</p>

      <div className="flex flex-wrap gap-2">
        {interestOptions.map((interest) => {
          const isSelected = preferences.interests.includes(interest);
          return (
            <motion.button
              key={interest}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleInterest(interest)}
              className={`px-4 py-2 rounded-full font-medium text-sm transition-all ${
                isSelected
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-purple-100'
              }`}
            >
              {interest}
              {isSelected && <Check className="w-3 h-3 inline ml-1" />}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );

  const renderWearable = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wearable</h2>
      <p className="text-gray-600 mb-6">Enhance your dream tracking with sleep data</p>

      <div className="space-y-4">
        {['oura', 'whoop', 'fitbit', 'apple_watch', 'garmin'].map((device) => (
          <motion.button
            key={device}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => updatePreferences({ wearableConnected: true })}
            className="w-full p-4 border-2 border-gray-200 rounded-xl flex items-center justify-between hover:border-purple-300 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Heart className="w-6 h-6 text-gray-600" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900 capitalize">
                  {device.replace('_', ' ')}
                </h3>
                <p className="text-sm text-gray-600">Track sleep stages & HRV</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </motion.button>
        ))}

        <div className="pt-4">
          <button
            onClick={() => updatePreferences({ wearableConnected: false })}
            className="w-full p-4 text-gray-600 hover:text-gray-900 font-medium"
          >
            Skip for now
          </button>
        </div>
      </div>
    </motion.div>
  );

  const renderPrivacy = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Privacy Settings</h2>
      <p className="text-gray-600 mb-6">Choose your comfort level</p>

      <div className="space-y-4">
        {[
          { id: 'private', label: 'Private', desc: 'Only you can see your dreams', icon: Shield },
          { id: 'friends', label: 'Friends', desc: 'Share with selected friends', icon: Smile },
          { id: 'public', label: 'Public', desc: 'Contribute to dream research', icon: Globe }
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => updatePreferences({ privacyLevel: option.id as any })}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              preferences.privacyLevel === option.id
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-purple-300'
            }`}
          >
            <div className="flex items-center gap-4">
              <option.icon className={`w-8 h-8 ${
                preferences.privacyLevel === option.id ? 'text-purple-600' : 'text-gray-400'
              }`} />
              <div>
                <h3 className="font-semibold text-gray-900">{option.label}</h3>
                <p className="text-sm text-gray-600">{option.desc}</p>
              </div>
            </div>
          </button>
        ))}

        <div className="pt-6 border-t">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-700">Enable Notifications</span>
            </div>
            <div className={`w-12 h-6 rounded-full transition-colors ${
              preferences.notificationsEnabled ? 'bg-purple-500' : 'bg-gray-300'
            } relative`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                preferences.notificationsEnabled ? 'left-7' : 'left-1'
              }`} />
            </div>
          </label>
        </div>
      </div>
    </motion.div>
  );

  const renderComplete = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-12"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
        className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mx-auto mb-6 flex items-center justify-center"
      >
        <Check className="w-12 h-12 text-white" />
      </motion.div>

      <h1 className="text-3xl font-bold text-gray-900 mb-4">You're All Set!</h1>
      <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
        Your dream journal is ready. Start capturing your dreams tonight!
      </p>

      <div className="bg-purple-50 rounded-2xl p-6 mb-8">
        <h3 className="font-semibold text-purple-900 mb-4">Your Profile Summary</h3>
        <div className="space-y-2 text-sm text-purple-700">
          <div className="flex justify-between">
            <span>Goals:</span>
            <span className="font-medium">{preferences.goals.length} selected</span>
          </div>
          <div className="flex justify-between">
            <span>Schedule:</span>
            <span className="font-medium">
              {preferences.sleepSchedule.bedtime} - {preferences.sleepSchedule.wakeTime}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Wearable:</span>
            <span className="font-medium">
              {preferences.wearableConnected ? 'Connected' : 'Not connected'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderCurrentStep = () => {
    switch (steps[currentStep].id) {
      case 'welcome': return renderWelcome();
      case 'goals': return renderGoals();
      case 'schedule': return renderSchedule();
      case 'interests': return renderInterests();
      case 'wearable': return renderWearable();
      case 'privacy': return renderPrivacy();
      case 'complete': return renderComplete();
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-6">
      <div className="max-w-2xl mx-auto">
        {currentStep > 0 && currentStep < steps.length - 1 && renderProgress()}

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            {renderCurrentStep()}

            {currentStep < steps.length - 1 && (
              <div className="flex gap-4 mt-8 pt-6 border-t">
                {currentStep > 0 && (
                  <button
                    onClick={handleBack}
                    className="flex-1 py-3 px-6 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNext}
                  disabled={
                    (steps[currentStep].id === 'goals' && preferences.goals.length === 0) ||
                    loading
                  }
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>{currentStep === steps.length - 2 ? 'Finish' : 'Continue'}</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </motion.button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
