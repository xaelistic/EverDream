/**
 * IPFS metadata upload via Pinata (optional).
 * Falls back to local JSON blob URL when unconfigured.
 */

import type { DreamNFT } from './nft';
import { exportNFTMetadata } from './nft';

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT as string | undefined;
const PINATA_GATEWAY = (import.meta.env.VITE_PINATA_GATEWAY as string) || 'https://gateway.pinata.cloud/ipfs';

export function isIpfsConfigured(): boolean {
  return Boolean(PINATA_JWT && PINATA_JWT.length > 20);
}

export async function uploadNFTMetadataToIpfs(nft: DreamNFT): Promise<string | null> {
  const metadata = exportNFTMetadata(nft);
  const json = JSON.stringify(metadata, null, 2);

  if (!isIpfsConfigured()) {
    const blob = new Blob([json], { type: 'application/json' });
    const localUrl = URL.createObjectURL(blob);
    console.log('[IPFS] Pinata not configured — metadata at local blob URL');
    return localUrl;
  }

  try {
    const body = new FormData();
    body.append('file', new Blob([json], { type: 'application/json' }), `${nft.id}-metadata.json`);
    body.append(
      'pinataMetadata',
      JSON.stringify({ name: `everdream-${nft.id}`, keyvalues: { dreamId: nft.dreamId } }),
    );

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { Authorization: `Bearer ${PINATA_JWT}` },
      body,
    });

    if (!response.ok) {
      const err = await response.text();
      console.warn('[IPFS] Pinata upload failed:', err);
      return null;
    }

    const data = await response.json();
    const cid = data.IpfsHash as string;
    return `${PINATA_GATEWAY}/${cid}`;
  } catch (e) {
    console.warn('[IPFS] Upload error', e);
    return null;
  }
}