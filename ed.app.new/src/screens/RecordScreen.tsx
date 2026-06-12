import DreamCapture from '../components/dreams/DreamCapture';
import VideoCaptureFlow from '../components/capture/VideoCaptureFlow';
import type { ExtractedDreamEntry } from './PhotoUploadFlow';
import type { VideoCaptureData } from '../components/capture/VideoCaptureFlow';

interface RecordScreenProps {
  onComplete: (result: any, text: string) => Promise<void>;
  onCancel: () => void;
  captureMode?: 'text' | 'video' | 'audio';
}

export function RecordScreen({ onComplete, onCancel, captureMode = 'video' }: RecordScreenProps) {
  // Full-screen video capture mode
  if (captureMode === 'video') {
    return (
      <VideoCaptureFlow
        onComplete={(data: VideoCaptureData) => {
          // Convert video data to format expected by parent
          const videoUrl = URL.createObjectURL(data.videoBlob);
          onComplete({
            videoBlob: data.videoBlob,
            videoUrl,
            thumbnail: data.thumbnail,
            duration: data.duration,
            timestamp: data.timestamp,
            hasAudio: data.hasAudio,
          }, '');
        }}
        onCancel={onCancel}
        maxDuration={180}
        enableAudio={true}
      />
    );
  }

  // Text/audio capture mode (default)
  return (
    <DreamCapture
      onComplete={onComplete}
      onCancel={onCancel}
    />
  );
}
