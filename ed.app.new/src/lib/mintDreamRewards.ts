/**
 * Mint XAEL tokens when a dream is saved, based on XAEL scoring.
 */

import { dreamToXAELData } from './dreamToXAEL';
import { mintXAELFromDream } from './xaelEconomy';
import { syncEconomyToSupabase } from './economyPersistence';
import type { DreamForXAEL } from './dreamToXAEL';

export function rewardXAELForDream(dream: DreamForXAEL, userId: string): number {
  const xael = dreamToXAELData(dream, userId);
  const minted = mintXAELFromDream(xael);
  syncEconomyToSupabase().catch(() => {});
  return minted;
}