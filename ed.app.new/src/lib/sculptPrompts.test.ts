import { describe, expect, it } from 'vitest';
import {
  appendSculptStarter,
  normalizeLinkedDreamIds,
  toggleLinkedDreamId,
} from './sculptPrompts';

describe('sculpt prompts', () => {
  it('appends a missing piece without duplicating it', () => {
    expect(appendSculptStarter('I was flying.', 'I was in ')).toBe('I was flying. I was in ');
    expect(appendSculptStarter('I was in the harbour', 'I was in ')).toBe('I was in the harbour');
    expect(appendSculptStarter('', 'They looked ')).toBe('They looked ');
  });

  it('links another dream and will not link a dream to itself', () => {
    expect(toggleLinkedDreamId(undefined, 'dream-b', 'dream-a')).toEqual(['dream-b']);
    expect(toggleLinkedDreamId(['dream-b'], 'dream-b', 'dream-a')).toEqual([]);
    expect(toggleLinkedDreamId(['dream-a'], 'dream-a', 'dream-a')).toEqual([]);
    expect(normalizeLinkedDreamIds(['dream-b', 'dream-b', '  ', 'dream-a'], 'dream-a')).toEqual(['dream-b']);
  });
});
