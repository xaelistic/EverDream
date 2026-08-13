import { describe, expect, it } from 'vitest';
import {
  cleanDreamTranscript,
  dreamTellingFromTranscript,
  transcriptNeedsRewrite,
} from './cleanDreamTranscript';

describe('cleanDreamTranscript', () => {
  it('strips speaker labels and fillers', () => {
    const out = cleanDreamTranscript(
      'Speaker 1: Um, so I was like flying over the harbour, you know, and then uh a door opened.',
    );
    expect(out.toLowerCase()).not.toContain('speaker');
    expect(out.toLowerCase()).not.toMatch(/\bum\b/);
    expect(out.toLowerCase()).not.toContain('you know');
    expect(out).toMatch(/flying/i);
    expect(out).toMatch(/door/i);
  });

  it('drops talk about the recording itself', () => {
    const out = cleanDreamTranscript(
      "Okay I'm just recording my dream. I walked through a glass library. Can you hear me?",
    );
    expect(out.toLowerCase()).not.toMatch(/record/);
    expect(out.toLowerCase()).not.toMatch(/can you hear/);
    expect(out).toMatch(/library/i);
  });

  it('uses the analysis narrative when the memo is still labeled', () => {
    const telling = dreamTellingFromTranscript(
      'Speaker 1: testing testing',
      'I walk through a glass library at dawn.',
    );
    expect(telling).toMatch(/library/i);
    expect(transcriptNeedsRewrite(telling)).toBe(false);
  });
});
