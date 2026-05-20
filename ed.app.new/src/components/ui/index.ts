/**
 * EverDream UI Component Library
 * Barrel export for all UI primitives.
 */

export { Button } from './Button';
export type { ButtonProps } from './Button';

export { Card } from './Card';
export type { CardProps } from './Card';

export { Input, TextArea } from './Input';
export type { InputProps, TextAreaProps } from './Input';

export { Badge } from './Badge';
export type { BadgeProps } from './Badge';

export { Spinner, LoadingOverlay, Skeleton } from './Spinner';
export type { SpinnerProps, LoadingOverlayProps } from './Spinner';

export { Modal } from './Modal';
export type { ModalProps } from './Modal';

export { ToastProvider, useToast } from './Toast';
export type { ToastMessage } from './Toast';

export { default as AppLoadingScreen } from './AppLoadingScreen';
export type { AppLoadingScreenProps } from './AppLoadingScreen';

export { ErrorBanner, InlineError } from './ErrorBanner';
export type { ErrorBannerProps } from './ErrorBanner';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

// Inject global keyframes once
if (typeof document !== 'undefined') {
  const id = 'everdream-ui-keyframes';
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `;
    document.head.appendChild(style);
  }
}
