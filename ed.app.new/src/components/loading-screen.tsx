import React from 'react';
import { Moon, Sparkles } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
}

/**
 * LoadingScreen — Transition screen after auth / during onboarding steps (ported/adapted)
 */
export function LoadingScreen({ message = "Preparing your dream space..." }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[oklch(0.98_0.005_80)]">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm">
          <Moon className="h-10 w-10 text-[oklch(0.45_0.09_275)] animate-pulse" />
        </div>
        <div className="flex items-center justify-center gap-2 text-lg font-medium text-[oklch(0.25_0.04_270)]">
          <Sparkles className="h-5 w-5" />
          {message}
        </div>
        <p className="mt-2 text-sm text-muted">This will only take a moment</p>
      </div>
    </div>
  );
}

export default LoadingScreen;