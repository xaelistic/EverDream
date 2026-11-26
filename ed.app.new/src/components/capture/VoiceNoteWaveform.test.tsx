import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VoiceNoteWaveform } from './VoiceNoteWaveform';

class FakeAudio {
  src = '';
  preload = '';
  currentTime = 0;
  duration = 20;
  paused = true;
  ended = false;
  private listeners = new Map<string, Set<() => void>>();

  addEventListener(type: string, fn: () => void) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(fn);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, fn: () => void) {
    this.listeners.get(type)?.delete(fn);
  }

  emit(type: string) {
    this.listeners.get(type)?.forEach((fn) => fn());
  }

  play() {
    this.paused = false;
    this.ended = false;
    this.emit('play');
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
    this.emit('pause');
  }
}

let latest: FakeAudio | null = null;

describe('VoiceNoteWaveform', () => {
  afterEach(() => {
    latest = null;
    vi.unstubAllGlobals();
  });

  function mount(transcript = 'I was walking through the harbour at night.') {
    latest = null;
    vi.stubGlobal('Audio', class extends FakeAudio {
      constructor(src?: string) {
        super();
        this.src = src || '';
        latest = this;
      }
    });
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('skip peaks'))));
    render(
      <VoiceNoteWaveform
        src="blob:recording"
        durationSeconds={20}
        transcript={transcript}
      />,
    );
  }

  it('shows the transcript and moves the playhead to the current time', async () => {
    mount();
    await waitFor(() => expect(latest).toBeTruthy());

    await act(async () => {
      latest!.currentTime = 4;
      latest!.emit('timeupdate');
    });

    expect(screen.getByText('0:04 / 0:20')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Voice note position' })).toHaveAttribute('aria-valuenow', '4');
    expect(screen.getByTestId('voice-note-playhead')).toHaveStyle({ left: '20%' });
    expect(screen.getByText('I was walking through the harbour at night.')).toBeInTheDocument();
  });

  it('keeps following the clock when the file reports an infinite duration', async () => {
    mount();
    await waitFor(() => expect(latest).toBeTruthy());

    await act(async () => {
      latest!.duration = Number.POSITIVE_INFINITY;
      latest!.currentTime = 5;
      latest!.emit('timeupdate');
    });

    expect(screen.getByText('0:05 / 0:20')).toBeInTheDocument();
    expect(screen.getByTestId('voice-note-playhead')).toHaveStyle({ left: '25%' });
  });

  it('seeks the recording when the waveform is scrubbed', async () => {
    mount();
    await waitFor(() => expect(latest).toBeTruthy());

    const slider = screen.getByRole('slider', { name: 'Voice note position' });
    slider.getBoundingClientRect = () => ({
      left: 0,
      width: 100,
      top: 0,
      height: 40,
      right: 100,
      bottom: 40,
      x: 0,
      y: 0,
      toJSON() { return {}; },
    });
    fireEvent.click(slider, { clientX: 50 });

    expect(latest!.currentTime).toBeCloseTo(10);
    expect(screen.getByText('0:10 / 0:20')).toBeInTheDocument();
    expect(screen.getByTestId('voice-note-playhead')).toHaveStyle({ left: '50%' });
  });
});
