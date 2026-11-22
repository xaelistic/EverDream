import { describe, expect, it } from 'vitest';
import { checkoutButtonLabel, isCheckoutClosedMessage } from './stripe';

describe('checkout honesty', () => {
  it('treats a missing Stripe setup as closed and does not say a charge started', () => {
    expect(isCheckoutClosedMessage('Stripe not configured')).toBe(true);
    expect(isCheckoutClosedMessage('No checkout URL returned')).toBe(true);
    expect(isCheckoutClosedMessage('Card was declined')).toBe(false);
    expect(checkoutButtonLabel(false)).toBe('Checkout is closed');
    expect(checkoutButtonLabel(true)).toBe('Opening checkout…');
    expect(checkoutButtonLabel(true)).not.toMatch(/redirect|unlock|buy/i);
  });
});
