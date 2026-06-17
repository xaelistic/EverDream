/**
 * Discord integration — webhooks for dream events, NFT mints, and exchange trades.
 * Bot OAuth / slash commands are Phase 4.
 */

export type DiscordEventType =
  | 'dream_shared'
  | 'simulacra_ready'
  | 'nft_minted'
  | 'exchange_trade'
  | 'vr_session';

export interface DiscordEmbed {
  title: string;
  description: string;
  color?: number;
  url?: string;
  thumbnail?: { url: string };
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
}

const WEBHOOK_URL = import.meta.env.VITE_DISCORD_WEBHOOK_URL as string | undefined;

export function isDiscordConfigured(): boolean {
  return Boolean(WEBHOOK_URL?.startsWith('https://discord.com/api/webhooks'));
}

export async function postDiscordEmbed(
  event: DiscordEventType,
  embed: DiscordEmbed,
): Promise<boolean> {
  if (!isDiscordConfigured()) {
    console.log('[Discord] Webhook not configured — event logged locally:', event, embed.title);
    return false;
  }

  const colors: Record<DiscordEventType, number> = {
    dream_shared: 0x7a9e7a,
    simulacra_ready: 0x5a7a5a,
    nft_minted: 0x9b59b6,
    exchange_trade: 0xf39c12,
    vr_session: 0x3498db,
  };

  try {
    const response = await fetch(WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{ ...embed, color: embed.color ?? colors[event] }],
      }),
    });
    return response.ok;
  } catch (e) {
    console.warn('[Discord] Webhook failed', e);
    return false;
  }
}

export async function notifySimulacraReady(
  dreamTitle: string,
  dreamId: string,
  imageUrl?: string,
): Promise<boolean> {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://everdream.app';
  return postDiscordEmbed('simulacra_ready', {
    title: '🌙 Dream Simulacrum Ready',
    description: `**${dreamTitle}** is now explorable in 3D.`,
    url: `${origin}${window.location.pathname}#/simulacrum/${dreamId}`,
    thumbnail: imageUrl ? { url: imageUrl } : undefined,
    footer: { text: 'EverDream · Explore in VR' },
  });
}

export async function notifyNFTMinted(
  dreamTitle: string,
  tokenId: string,
  owner: string,
  imageUrl?: string,
): Promise<boolean> {
  return postDiscordEmbed('nft_minted', {
    title: '💎 Dream NFT Minted',
    description: `**${dreamTitle}** minted as token #${tokenId}`,
    fields: [
      { name: 'Owner', value: owner.slice(0, 10) + '…', inline: true },
      { name: 'Token', value: tokenId, inline: true },
    ],
    thumbnail: imageUrl ? { url: imageUrl } : undefined,
    footer: { text: 'EverDream NFT' },
  });
}

export async function notifyExchangeTrade(
  commodity: string,
  amount: number,
  price: number,
): Promise<boolean> {
  return postDiscordEmbed('exchange_trade', {
    title: '📊 XAEL Exchange Trade',
    description: `${amount} ${commodity} @ ${price} XAEL`,
    footer: { text: 'EverDream Exchange' },
  });
}

/** OAuth redirect URL stub for future bot linking. */
export function getDiscordOAuthUrl(clientId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify guilds.join',
  });
  return `https://discord.com/api/oauth2/authorize?${params}`;
}