import DreamJournalApp from './DreamJournalApp';
import ProtectedRoute from './components/auth/ProtectedRoute';

export default function App() {
  return (
    <ProtectedRoute>
      <DreamJournalApp />
    </ProtectedRoute>
  );
}
