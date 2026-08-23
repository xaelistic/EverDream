import { describe, expect, it } from 'vitest';
import { feelingImageCue, restednessFromEnergyLevel } from './dailyCheckin';

describe('morning feeling mapping', () => {
  it('maps energy to restedness and image cues', () => {
    expect(restednessFromEnergyLevel('good')).toBe(8);
    expect(restednessFromEnergyLevel('low')).toBe(3);
    expect(feelingImageCue('good')).toMatch(/warmer light/);
    expect(feelingImageCue('low')).toMatch(/muted contrast/);
  });
});
