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
      type="button"
      aria-pressed={selected}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-[0.985] ${
        selected 
          ? 'border-sage bg-sage text-cream shadow-md ring-2 ring-sage/30' 
          : 'border-line bg-white text-ink hover:bg-parchment hover:border-sage/30'
      } ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

export default ChipButton;