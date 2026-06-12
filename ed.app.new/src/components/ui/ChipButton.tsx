import React from 'react';

interface ChipButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  icon?: React.ReactNode;
}

/**
 * ChipButton — Toggle/selection button (ported from sleep-whispers-flow onboarding)
 */
export function ChipButton({ 
  selected = false, 
  icon, 
  children, 
  className = '', 
  ...props 
}: ChipButtonProps) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-[0.985] ${
        selected 
          ? 'border-[oklch(0.45_0.09_275)] bg-[oklch(0.45_0.09_275)] text-white' 
          : 'border-line bg-white text-ink hover:bg-parchment'
      } ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

export default ChipButton;