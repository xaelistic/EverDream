import { lazy, Suspense } from 'react';
import DreamJournalApp from './DreamJournalApp';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { PublicShareScreen } from './screens/PublicShareScreen';
import { useSocialAuth } from './hooks/use-social-auth';

const PhoneTestTools = import.meta.env.DEV
  ? lazy(() => import('./components/dev/PhoneTestTools'))
  : null;

function getShareSlugFromHash(): string | null {
  if (typeof window === 'undefined') return null;
  const match = window.location.hash.match(/^#\/?share\/([^/?]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function App() {
  const shareSlug = getShareSlugFromHash();
  useSocialAuth();

  if (shareSlug) {
    return <PublicShareScreen slug={shareSlug} />;
  }

  return (
    <>
      <ProtectedRoute>
        <DreamJournalApp />
      </ProtectedRoute>

      {PhoneTestTools ? (
        <Suspense fallback={null}>
          <PhoneTestTools />
        </Suspense>
      ) : null}
    </>
  );
}