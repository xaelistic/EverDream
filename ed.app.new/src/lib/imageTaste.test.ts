import { describe, expect, it } from 'vitest';
import {
  IMAGE_RECIPES,
  applySignal,
  emptyTaste,
  extractVisuals,
  pickImageRecipe,
  recipeFromStyle,
  summarizeTaste,
} from './imageTaste';

describe('image recipes', () => {
  it('has a varied recipe set', () => {
    expect(IMAGE_RECIPES.length).toBeGreaterThanOrEqual(8);
    const ids = new Set(IMAGE_RECIPES.map((r) => r.id));
    expect(ids.size).toBe(IMAGE_RECIPES.length);
  });

  it('picks a known recipe even with empty taste', () => {
    const picked = pickImageRecipe(emptyTaste());
    expect(IMAGE_RECIPES.some((r) => r.id === picked.id)).toBe(true);
    expect(picked.fragment.length).toBeGreaterThan(8);
  });

  it('reads recipe traits from the style tag used on generated images', () => {
    const recipe = IMAGE_RECIPES.find((r) => r.id === 'moonlit-film');
    expect(recipe).toBeTruthy();
    expect(recipeFromStyle('cinematic:moonlit-film')?.id).toBe('moonlit-film');
    const visuals = extractVisuals({
      prompt: 'a quiet hallway',
      style: 'cinematic:moonlit-film',
    });
    expect(visuals.traits).toEqual(expect.arrayContaining(recipe!.traits));
  });

  it('likes of a recipe pull future picks toward those traits', () => {
    let taste = emptyTaste();
    for (let i = 0; i < 4; i += 1) {
      taste = applySignal(taste, 'like', { style: 'cinematic:moonlit-film', prompt: 'moonlit room' });
    }
    const summary = summarizeTaste(taste);
    expect(summary.likes.some((t) => ['cinematic', 'ethereal'].includes(t))).toBe(true);
  });
});
