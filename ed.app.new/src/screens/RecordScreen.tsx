import DreamCapture from '../components/dreams/DreamCapture';
import type { ExtractedDreamEntry } from './PhotoUploadFlow';

interface RecordScreenProps {
  onComplete: (result: any, text: string) => Promise<void>;
  onCancel: () => void;
}

export function RecordScreen({ onComplete, onCancel }: RecordScreenProps) {
  return (
    <DreamCapture
      onComplete={onComplete}
      onCancel={onCancel}
    />
  );
}
