import { describe, expect, it } from 'vitest';
import {
  classifyDreamLength,
  storyboardPanelCount,
  wordCount,
} from './dreamLength';
import { splitIntoPanels } from './dreamScenes';

const MEDIUM = Array.from({ length: 110 }, (_, i) => `word${i}`).join(' ');
const LONG = Array.from({ length: 240 }, (_, i) => `word${i}`).join(' ');

describe('dream length', () => {
  it('treats a brief note as short with no storyboard', () => {
    expect(classifyDreamLength('I was flying.')).toBe('short');
    expect(storyboardPanelCount('short')).toBe(0);
    expect(wordCount('one two three')).toBe(3);
  });

  it('uses medium for a fuller telling and long for a long narrative', () => {
    expect(classifyDreamLength(MEDIUM)).toBe('medium');
    expect(storyboardPanelCount('medium')).toBe(2);
    expect(classifyDreamLength(LONG)).toBe('long');
    expect(storyboardPanelCount('long')).toBe(3);
  });

  it('bumps to medium when the telling has a scene turn', () => {
    expect(classifyDreamLength('I walk into the kitchen. Then the floor becomes water.')).toBe('medium');
  });
});

describe('splitIntoPanels', () => {
  it('returns exactly two or three panels, not extra storyboards', () => {
    const two = splitIntoPanels('I open a door. The hallway stretches. Then I am outside under two moons. A boat waits.', 2);
    expect(two).toHaveLength(2);
    const three = splitIntoPanels(
      'I open a door. The hallway stretches forever. Then I am outside. Two moons hang low. A boat waits. I step in.',
      3,
    );
    expect(three).toHaveLength(3);
    expect(three.map((p) => p.title)).toEqual(['Opening', 'Middle', 'Close']);
  });
});
