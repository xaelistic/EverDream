import { CREDIT_PACKS } from './creditService';
import type { SubscriptionTier } from './types';

export { CREDIT_PACKS };

export type PlanId = SubscriptionTier;

export const PLANS = [
  {
    id: 'free' as const,
    name: 'Free',
    price: '$0',
    period: 'forever',
    credits: '14 starter credits — about two weeks of nightly images, no monthly refill',
    blurb: 'Capture stays free. Spend credits only when you make a dream visible.',
    features: [
      'Text, audio and video journals',
      'AI dream analysis',
      'Phone sleep tracking',
      'Sleep cards and wind-down',
    ],
  },
  {
    id: 'plus' as const,
    name: 'EverDream+',
    price: '$5.99',
    period: 'month',
    credits: '40 image credits each month',
    blurb: 'For weekly dreamers who want wearables, backup, and a monthly image budget.',
    features: [
      'Everything in Free',
      '40 image credits / month (reset with the calendar)',
      'Wearable sleep sync',
      'Cloud backup of journals',
      'PDF export',
      'Richer analysis',
    ],
    popular: true,
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: '$12.99',
    period: 'month',
    credits: '120 image credits each month',
    blurb: 'For storyboards, motion clips, and people who generate most nights.',
    features: [
      'Everything in Plus',
      '120 image credits / month',
      'Priority image generation',
      'Storyboards and dream video clips',
    ],
  },
] as const;

export const PLAN_COMPARE: Array<{
  label: string;
  free: string | boolean;
  plus: string | boolean;
  pro: string | boolean;
}> = [
  { label: 'Journal (text, audio, video)', free: true, plus: true, pro: true },
  { label: 'AI analysis', free: true, plus: true, pro: true },
  { label: 'Phone sleep tracking', free: true, plus: true, pro: true },
  { label: 'Image credits', free: '14 once', plus: '40 / month', pro: '120 / month' },
  { label: 'Wearable sync', free: false, plus: true, pro: true },
  { label: 'Cloud backup & PDF', free: false, plus: true, pro: true },
  { label: 'Storyboard & video', free: 'Uses credits', plus: 'Uses credits', pro: 'Priority queue' },
  { label: 'Credit packs', free: true, plus: true, pro: true },
];

export function planById(id: PlanId) {
  return PLANS.find((plan) => plan.id === id) || PLANS[0];
}
