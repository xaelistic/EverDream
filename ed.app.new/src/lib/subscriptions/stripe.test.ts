import { afterEach, describe, expect, it } from 'vitest';
import {
  captureCheckoutIntent,
  clearCheckoutIntent,
  consumeCheckoutIntent,
  isStripeConfigured,
  readCheckoutIntent,
} from './stripe';

afterEach(() => {
  clearCheckoutIntent();
  window.history.replaceState(null, '', '/');
  window.location.hash = '';
});

describe('isStripeConfigured', () => {
  it('is on unless VITE_STRIPE_DISABLED is true', () => {
    expect(isStripeConfigured()).toBe(true);
  });
});

describe('checkout intent from website deep links', () => {
  it('captures plan from the hash and strips it so login cannot drop the buy', () => {
    window.location.hash = '#/upgrade?plan=plus';
    const intent = captureCheckoutIntent();
    expect(intent.plan).toBe('plus');
    expect(readCheckoutIntent().plan).toBe('plus');
    expect(window.location.hash.includes('plan=')).toBe(false);
  });

  it('captures a credit pack', () => {
    window.location.hash = '#/credits?pack=pack_60';
    expect(consumeCheckoutIntent().pack).toBe('pack_60');
    expect(readCheckoutIntent().pack).toBe('pack_60');
  });

  it('survives a later hash wipe the way OAuth cleanup does', () => {
    window.location.hash = '#/upgrade?plan=pro';
    captureCheckoutIntent();
    window.history.replaceState(null, '', '/#/');
    expect(readCheckoutIntent().plan).toBe('pro');
    clearCheckoutIntent();
    expect(readCheckoutIntent().plan).toBeUndefined();
  });

  it('ignores unknown plan values', () => {
    window.location.hash = '#/upgrade?plan=enterprise';
    expect(captureCheckoutIntent().plan).toBeUndefined();
  });
});
