/**
 * Enhanced Authentication Component
 * Supports: Google, Apple, Facebook, Phone, Email/Password
 * With onboarding flow integration
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, Lock, User, Phone, Globe, ArrowRight, CheckCircle, 
  AlertCircle, Loader2, Eye, EyeOff, Shield, Sparkles 
} from 'lucide-react';

interface AuthProps {
  onSuccess?: (user: any, method: string) => void;
  onSwitchToSignup?: () => void;
  mode?: 'login' | 'signup' | 'both';
}

const SocialButton = ({ 
  provider, 
  onClick, 
  loading 
}: { 
  provider: 'google' | 'apple' | 'facebook'; 
  onClick: () => void; 
  loading?: boolean;
}) => {
  const config = {
    google: {
      bg: 'bg-white',
      text: 'text-gray-700',
      border: 'border-gray-300',
      icon: 'G',
      label: 'Continue with Google'
    },
    apple: {
      bg: 'bg-black',
      text: 'text-white',
      border: 'border-black',
      icon: '',
      label: 'Continue with Apple'
    },
    facebook: {
      bg: 'bg-[#1877F2]',
      text: 'text-white',
      border: 'border-[#1877F2]',
      icon: 'f',
      label: 'Continue with Facebook'
    }
  };

  const { bg, text, border, icon, label } = config[provider];

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={loading}
      className={`w-full ${bg} ${text} ${border} border rounded-lg py-3 px-4 font-medium flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <>
          <span className="text-lg font-bold">{icon}</span>
          <span>{label}</span>
        </>
      )}
    </motion.button>
  );
};

export default function Auth({ onSuccess, onSwitchToSignup, mode = 'both' }: AuthProps) {
  const [isLogin, setIsLogin] = useState(mode !== 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'method' | 'credentials' | 'verify'>('method');
  const [selectedMethod, setSelectedMethod] = useState<'email' | 'phone' | 'google' | 'apple' | 'facebook' | null>(null);

  const handleSocialAuth = async (provider: 'google' | 'apple' | 'facebook') => {
    setLoading(true);
    setError('');
    
    try {
      // TODO: Implement actual OAuth flow
      // For demo, simulate success
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockUser = {
        id: `social_${provider}_${Date.now()}`,
        email: `user@${provider}.com`,
        name: 'Demo User',
        provider,
        verified: true
      };
      
      onSuccess?.(mockUser, provider);
    } catch (err: any) {
      setError(err.message || `${provider} authentication failed`);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // TODO: Implement actual auth
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockUser = {
        id: `email_${Date.now()}`,
        email,
        name: email.split('@')[0],
        provider: 'email',
        verified: true
      };

      onSuccess?.(mockUser, 'email');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneAuth = async () => {
    if (!phone) {
      setError('Please enter your phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // TODO: Implement SMS verification
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStep('verify');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
      setLoading(false);
    }
  };

  const renderMethodSelection = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mx-auto mb-4 flex items-center justify-center"
        >
          <Sparkles className="w-8 h-8 text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold text-gray-900">
          {isLogin ? 'Welcome Back' : 'Join EverDream'}
        </h2>
        <p className="text-gray-600 mt-2">
          {isLogin ? 'Sign in to continue your dream journey' : 'Start tracking your dreams today'}
        </p>
      </div>

      <div className="space-y-3">
        <SocialButton 
          provider="google" 
          onClick={() => handleSocialAuth('google')} 
          loading={loading && selectedMethod === 'google'}
        />
        <SocialButton 
          provider="apple" 
          onClick={() => handleSocialAuth('apple')} 
          loading={loading && selectedMethod === 'apple'}
        />
        <SocialButton 
          provider="facebook" 
          onClick={() => handleSocialAuth('facebook')} 
          loading={loading && selectedMethod === 'facebook'}
        />
      </div>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-gray-500">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setSelectedMethod('email'); setStep('credentials'); }}
          className="flex items-center justify-center gap-2 p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 transition-colors"
        >
          <Mail className="w-5 h-5 text-gray-600" />
          <span className="font-medium">Email</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setSelectedMethod('phone'); setStep('credentials'); }}
          className="flex items-center justify-center gap-2 p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 transition-colors"
        >
          <Phone className="w-5 h-5 text-gray-600" />
          <span className="font-medium">Phone</span>
        </motion.button>
      </div>

      {mode === 'both' && (
        <p className="text-center text-sm text-gray-600 mt-6">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-purple-600 font-semibold hover:underline"
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </p>
      )}

      <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mt-6">
        <Shield className="w-3 h-3" />
        <span>Your data is encrypted and secure</span>
      </div>
    </div>
  );

  const renderCredentials = () => (
    <div className="space-y-6">
      <button
        onClick={() => setStep('method')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowRight className="w-4 h-4 rotate-180" />
        <span>Back</span>
      </button>

      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900">
          {selectedMethod === 'email' ? 'Email Authentication' : 'Phone Verification'}
        </h3>
        <p className="text-gray-600 mt-2">
          {selectedMethod === 'email' 
            ? (isLogin ? 'Enter your credentials' : 'Create your account')
            : 'We\'ll send you a verification code'}
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm"
        >
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </motion.div>
      )}

      {selectedMethod === 'email' ? (
        <>
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="••••••••"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleEmailAuth}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </motion.button>
        </>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePhoneAuth}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Send Code</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </motion.button>
        </>
      )}
    </div>
  );

  const renderVerification = () => (
    <div className="space-y-6">
      <button
        onClick={() => setStep('credentials')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowRight className="w-4 h-4 rotate-180" />
        <span>Back</span>
      </button>

      <div className="text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900">Check Your Phone</h3>
        <p className="text-gray-600 mt-2">
          We've sent a verification code to {phone}
        </p>
      </div>

      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5, 6].map((_, i) => (
          <input
            key={i}
            type="text"
            maxLength={1}
            className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        ))}
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          setLoading(true);
          setTimeout(() => {
            const mockUser = {
              id: `phone_${Date.now()}`,
              phone,
              name: phone,
              provider: 'phone',
              verified: true
            };
            onSuccess?.(mockUser, 'phone');
          }, 1500);
        }}
        disabled={loading}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <span>Verify & Continue</span>
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </motion.button>

      <button className="w-full text-purple-600 font-medium text-sm hover:underline">
        Resend Code
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8"
      >
        <AnimatePresence mode="wait">
          {step === 'method' && (
            <motion.div
              key="method"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {renderMethodSelection()}
            </motion.div>
          )}
          {step === 'credentials' && (
            <motion.div
              key="credentials"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {renderCredentials()}
            </motion.div>
          )}
          {step === 'verify' && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {renderVerification()}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
