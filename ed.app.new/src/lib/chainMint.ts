/**
 * On-chain NFT mint helpers (Base Sepolia / Polygon Amoy).
 * Actual minting runs server-side via silent-mint-queue when deployer key is set.
 */

export const CHAIN_CONFIG: Record<number, { name: string; explorer: string; rpc: string }> = {
  84532: {
    name: 'Base Sepolia',
    explorer: 'https://sepolia.basescan.org',
    rpc: 'https://sepolia.base.org',
  },
  80002: {
    name: 'Polygon Amoy',
    explorer: 'https://amoy.polygonscan.com',
    rpc: 'https://rpc-amoy.polygon.technology',
  },
};

export function isChainMintConfigured(): boolean {
  const addr = import.meta.env.VITE_NFT_CONTRACT_ADDRESS as string | undefined;
  return Boolean(addr && addr.startsWith('0x') && addr.length === 42);
}

export function getChainId(): number {
  const raw = import.meta.env.VITE_CHAIN_ID;
  return raw ? Number(raw) : 84532;
}

export function getContractAddress(): string | undefined {
  return import.meta.env.VITE_NFT_CONTRACT_ADDRESS as string | undefined;
}

export function getExplorerTxUrl(txHash: string): string | null {
  const chainId = getChainId();
  const cfg = CHAIN_CONFIG[chainId];
  if (!cfg || !txHash.startsWith('0x')) return null;
  return `${cfg.explorer}/tx/${txHash}`;
}

export function getExplorerTokenUrl(tokenId: string): string | null {
  const addr = getContractAddress();
  const chainId = getChainId();
  const cfg = CHAIN_CONFIG[chainId];
  if (!addr || !cfg) return null;
  return `${cfg.explorer}/token/${addr}?a=${tokenId}`;
}

/** Minimal ABI fragment for read-only tokenURI checks. */
export const EVERDREAM_NFT_ABI = [
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function nextTokenId() view returns (uint256)',
] as const;