/** @deprecated Use shareCard.ts */
import {
  generateReflectionCard,
  shareCard,
  type ReflectionCardInput,
} from './shareCard';

export type ReflectionShareInput = ReflectionCardInput;

export const generateReflectionShareableImage = generateReflectionCard;

export async function downloadReflectionShare(input: ReflectionShareInput): Promise<void> {
  await shareCard('reflection', input);
}