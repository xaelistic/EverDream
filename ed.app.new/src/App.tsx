import DreamJournalApp from './DreamJournalApp';
import ProtectedRoute from './components/auth/ProtectedRoute';
import PhoneTestTools from './components/dev/PhoneTestTools';

export default function App() {
  return (
    <>
      <ProtectedRoute>
        <DreamJournalApp />
      </ProtectedRoute>

      {/* Dev-only tools for testing on real phones (local storage via IndexedDB + notifications).
          Renders a floating panel only in development.
          On your phone: open the LAN URL or ngrok URL, tap "Add to Home Screen", then use the tools. */}
      <PhoneTestTools />
    </>
  );
}
