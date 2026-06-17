/**
 * Discord bot command definitions & combine-dream webhook helper.
 * Full bot deployment requires a separate Node/Deno worker with bot token.
 */

import { postDiscordEmbed } from './discord';

export interface DiscordSlashCommand {
  name: string;
  description: string;
  options?: Array<{
    name: string;
    description: string;
    type: 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
    required?: boolean;
  }>;
}

/** Register these via Discord Developer Portal → Application → Slash Commands. */
export const EVERDREAM_BOT_COMMANDS: DiscordSlashCommand[] = [
  {
    name: 'dream-combine',
    description: 'Combine two dream NFTs into a remix (50:50 royalty split)',
    options: [
      { name: 'parent_a', description: 'First dream NFT token ID', type: 3, required: true },
      { name: 'parent_b', description: 'Second dream NFT token ID', type: 3, required: true },
      { name: 'title', description: 'Title for the combined dream', type: 3, required: false },
    ],
  },
  {
    name: 'simulacrum',
    description: 'Get link to explore a dream in 3D',
    options: [
      { name: 'dream_id', description: 'Dream journal ID', type: 3, required: true },
    ],
  },
  {
    name: 'xael-price',
    description: 'Show latest XAEL exchange spot for a commodity',
    options: [
      { name: 'commodity', description: 'XAEL, ENERGY, DATA, or COMPUTE', type: 3, required: true },
    ],
  },
];

export function getBotInviteUrl(clientId: string, permissions = '2048'): string {
  return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=bot%20applications.commands`;
}

/** Notify Discord when a dream combine is requested (webhook until bot is live). */
export async function notifyDreamCombineRequest(
  parentA: string,
  parentB: string,
  requester: string,
): Promise<boolean> {
  return postDiscordEmbed('exchange_trade', {
    title: '🔀 Dream Combine Requested',
    description: `Remix of **${parentA}** + **${parentB}**`,
    fields: [{ name: 'Requester', value: requester.slice(0, 12) + '…', inline: true }],
    footer: { text: 'EverDream Bot · /dream-combine' },
  });
}