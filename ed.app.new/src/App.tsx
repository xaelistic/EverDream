import { useState } from 'react';
import DreamJournalApp from './DreamJournalApp';
import { DreamAssetGenerator } from './components/sleep/DreamAssetGenerator';

export default function App() {
  const [showAssetGenerator, setShowAssetGenerator] = useState(false);

  return (
    <>
      <DreamJournalApp />

      <button
        type="button"
        onClick={() => setShowAssetGenerator(true)}
        style={{
          position: 'fixed',
          right: 20,
          bottom: 20,
          zIndex: 9999,
          padding: '12px 18px',
          borderRadius: 999,
          border: 'none',
          background: '#8b5cf6',
          color: 'white',
          cursor: 'pointer',
          boxShadow: '0 12px 24px rgba(0,0,0,0.18)',
        }}
      >
        🎨 Generate Dream Assets
      </button>

      {showAssetGenerator && (
        <DreamAssetGenerator onClose={() => setShowAssetGenerator(false)} />
      )}
    </>
  );
}
