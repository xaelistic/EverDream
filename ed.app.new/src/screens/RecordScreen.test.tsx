import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RecordScreen } from './RecordScreen';

vi.mock('../components/capture/VideoCaptureFlow', () => ({
  __esModule: true,
  default: ({ onComplete, onCancel }: { onComplete: () => void; onCancel: () => void }) => (
    <div data-testid="video-capture-flow">
      <button onClick={() => onComplete({ videoBlob: new Blob(), duration: 5, hasAudio: false, timestamp: 'now' })}>Complete</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock('../components/dreams/DreamCapture', () => ({
  __esModule: true,
  default: () => <div data-testid="dream-capture" />,
}));

describe('RecordScreen', () => {
  it('shows the video capture flow by default', () => {
    render(<RecordScreen onComplete={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByTestId('video-capture-flow')).toBeInTheDocument();
  });
});
