import DreamJournalApp from './DreamJournalApp';
import ProtectedRoute from './components/auth/ProtectedRoute';
import PhoneTestTools from './components/dev/PhoneTestTools';
import { PublicShareScreen } from './screens/PublicShareScreen';
import { useSocialAuth } from './hooks/use-social-auth';

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

      <PhoneTestTools />
    </>
  );
}