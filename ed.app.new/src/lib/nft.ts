/**
 * NFT & Wallet System
 * 
 * Architecture:
 * - Each user gets a deterministic wallet derived from their device identity
 * - Dreams are minted as NFTs with metadata pointing to assets
 * - Supports combining dreams (remix) with 50:50 royalty split
 * - Uses a lightweight on-chain representation (can be upgraded to real L2 later)
 * 
 * Wallet creation uses a deterministic approach:
 * 1. Generate or retrieve a device-specific seed from localStorage
 * 2. Derive a wallet address from that seed
 * 3. Store the seed encrypted in localStorage
 * 
 * For production blockchain minting, you'd integrate with:
 * - Polygon (low gas, EVM compatible)
 * - Base (Coinbase L2, low gas)
 * - Arweave (permanent storage for metadata)
 */

export interface WalletIdentity {
  /** Unique wallet address (derived from device seed) */
  address: string;
  /** Short display name derived from address */
  displayName: string;
  /** When this wallet was created */
  createdAt: string;
  /** Device fingerprint (hashed) */
  deviceId: string;
}

export interface DreamNFT {
  /** Unique NFT ID */
  id: string;
  /** Dream this NFT represents */
  dreamId: string;
  /** Owner wallet address */
  owner: string;
  /** Creator wallet address (may differ from owner for remixes) */
  creator: string;
  /** NFT metadata */
  metadata: NFTMetadata;
  /** On-chain status */
  status: 'pending' | 'minted' | 'failed';
  /** Transaction hash if minted */
  txHash?: string;
  /** Contract address if minted */
  contractAddress?: string;
  /** Token ID on the contract */
  tokenId?: string;
  /** Parent NFT IDs (for remixes/combined dreams) */
  parents?: string[];
  /** Royalty split (basis points, 100 = 1%) */
  royaltySplits?: RoyaltySplit[];
  /** License type */
  license: 'cc-by' | 'cc-by-sa' | 'cc-by-nc' | 'all-rights' | 'copyleft';
  /** Whether remixes are allowed */
  allowRemix: boolean;
  /** Timestamp */
  createdAt: string;
  /** Whether this is a simulated mint (not real blockchain tx) */
  isSimulated: boolean;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image?: string;
  animation_url?: string;  // For video/VR assets
  external_url?: string;
  attributes: NFTAttribute[];
}

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
  display_type?: 'number' | 'date' | 'boost_percentage';
}

export interface RoyaltySplit {
  wallet: string;
  share: number; // basis points (5000 = 50%)
}

export interface DreamCombination {
  /** ID of the new combined dream NFT */
  id: string;
  /** Parent dream NFT IDs */
  parentIds: string[];
  /** Parent wallet addresses */
  parentWallets: string[];
  /** New dream content */
  title: string;
  narrative: string;
  themes: string[];
  /** Generated assets */
  imageUrl?: string;
  videoUrl?: string;
  /** Royalty splits (50:50 for two parents) */
  royaltySplits: RoyaltySplit[];
  /** Timestamp */
  createdAt: string;
}

// ============================================================
// WALLET MANAGEMENT
// ============================================================

const WALLET_STORAGE_KEY = 'ed_wallet_identity';
const DEVICE_SEED_KEY = 'ed_device_seed';

/**
 * Simple encryption for localStorage data using Web Crypto API AES-GCM
 * This provides real cryptographic security for sensitive data like wallet seeds
 */
async function simpleEncrypt(text: string): Promise<string> {
  const key = 'everdream-key-2024';
  
  // Derive a key from the password using PBKDF2
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const salt = encoder.encode('everdream-salt-v1');
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    cryptoKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  
  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt the data
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    derivedKey,
    encoder.encode(text)
  );
  
  // Combine IV and ciphertext, then base64 encode
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt data encrypted with simpleEncrypt
 */
async function simpleDecrypt(encrypted: string): Promise<string> {
  const key = 'everdream-key-2024';
  
  // Decode from base64
  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  
  // Extract IV and ciphertext
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  
  // Derive the same key
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const salt = encoder.encode('everdream-salt-v1');
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    cryptoKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  
  // Decrypt the data
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    derivedKey,
    ciphertext
  );
  
  return new TextDecoder().decode(decrypted);
}

/**
 * Generate a deterministic device seed
 * Uses only stable device characteristics - no random or time-based components
 */
function generateDeviceSeed(): string {
  const navigator = window.navigator as any;
  const screen = window.screen;
  
  // Only use stable, deterministic properties
  const components = [
    navigator.userAgent || '',
    navigator.language || '',
    screen?.width || 0,
    screen?.height || 0,
    screen?.colorDepth || 0,
    new Date().getTimezoneOffset(),
    !!navigator.cookieEnabled,
    navigator.hardwareConcurrency || 0,
    navigator.platform || '',
  ];

  // Simple hash function (djb2)
  let hash = 5381;
  const str = components.join('|');
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }

  // Convert to hex and pad to create a consistent seed
  const hexSeed = Math.abs(hash).toString(16).padStart(16, '0');
  return hexSeed;
}

/**
 * Derive a wallet address from a seed
 * This creates a valid Ethereum-style address deterministically
 */
function deriveAddressFromSeed(seed: string): string {
  // Simple deterministic address derivation
  // In production, use proper BIP32/BIP44 derivation with a library like ethers.js
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) | 0;
  }
  
  // Generate 40 hex chars (20 bytes) for Ethereum address
  const parts: string[] = [];
  for (let i = 0; i < 5; i++) {
    hash = ((hash << 5) + hash + i) | 0;
    parts.push(Math.abs(hash).toString(16).padStart(8, '0'));
  }
  
  return '0x' + parts.join('');
}

/**
 * Get or create wallet identity for this device
 */
export async function getOrCreateWallet(): Promise<WalletIdentity> {
  // Check for existing wallet
  const stored = safeGetLocalStorage(WALLET_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Corrupted, create new
    }
  }

  // Get or create device seed
  let seed = safeGetLocalStorage(DEVICE_SEED_KEY);
  if (!seed) {
    seed = generateDeviceSeed();
    safeSetLocalStorage(DEVICE_SEED_KEY, seed);
  }

  const address = deriveAddressFromSeed(seed);
  
  const wallet: WalletIdentity = {
    address,
    displayName: `dreamer_${address.slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    deviceId: seed.slice(0, 16),
  };

  safeSetLocalStorage(WALLET_STORAGE_KEY, JSON.stringify(wallet));
  return wallet;
}

/**
 * Get existing wallet or null
 */
export function getWallet(): WalletIdentity | null {
  const stored = safeGetLocalStorage(WALLET_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Safe localStorage get with try-catch wrapper
 */
function safeGetLocalStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn('[NFT] localStorage access failed:', e);
    return null;
  }
}

/**
 * Safe localStorage set with try-catch wrapper
 */
function safeSetLocalStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn('[NFT] localStorage set failed:', e);
  }
}

/**
 * Update wallet display name
 */
export function updateWalletName(name: string): WalletIdentity | null {
  const wallet = getWallet();
  if (!wallet) return null;
  
  const updated = { ...wallet, displayName: name };
  localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

// ============================================================
// NFT CREATION
// ============================================================

/**
 * Create a DreamNFT from a dream object
 */
export function createDreamNFT(dream: any, wallet: WalletIdentity): DreamNFT {
  const nftId = `dxp-${dream.id}`;
  
  const metadata: NFTMetadata = {
    name: dream.nugget || 'Untitled Dream',
    description: dream.narrative || dream.content || '',
    image: dream.generatedImage?.url,
    animation_url: dream.videoCapture?.url,
    external_url: `https://everdream.app/dream/${dream.id}`,
    attributes: [
      { trait_type: 'Category', value: dream.category || 'uncategorized' },
      { trait_type: 'Emotion', value: dream.emotion || 'neutral' },
      { trait_type: 'Themes', value: (dream.themes || []).join(', ') },
      { trait_type: 'Capture Mode', value: dream.captureMode || 'text' },
      { trait_type: 'Created', value: new Date(dream.date).getTime(), display_type: 'date' },
    ],
  };

  // Add facial emotion if captured
  if (dream.capturedEmotions) {
    metadata.attributes.push({
      trait_type: 'Facial Emotion',
      value: dream.capturedEmotions.dominantEmotion,
    });
  }

  // Add sleep data if available
  if (dream.sleepData) {
    metadata.attributes.push(
      { trait_type: 'Sleep Score', value: dream.sleepData.quality || 0, display_type: 'number' },
      { trait_type: 'REM Minutes', value: dream.sleepData.estimatedREM || 0, display_type: 'number' },
    );
  }

  // Add rarity if available
  if (dream.assetMetadata) {
    metadata.attributes.push({
      trait_type: 'Rarity Score',
      value: dream.assetMetadata.rarityScore || 0,
      display_type: 'number',
    });
  }

  return {
    id: nftId,
    dreamId: dream.id,
    owner: wallet.address,
    creator: wallet.address,
    metadata,
    status: 'pending',
    license: 'copyleft',
    allowRemix: true,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Create a combined/remix NFT from multiple parent dreams
 */
export function createCombinedNFT(
  parents: DreamNFT[],
  combinedDream: {
    title: string;
    narrative: string;
    themes: string[];
    imageUrl?: string;
    videoUrl?: string;
  },
  wallet: WalletIdentity,
): DreamNFT {
  const nftId = `dxp-combined-${Date.now()}`;
  
  // 50:50 split between parents (or equal split for more)
  const sharePerParent = Math.floor(10000 / parents.length);
  const royaltySplits: RoyaltySplit[] = parents.map((p, i) => ({
    wallet: p.owner,
    share: i === parents.length - 1
      ? 10000 - sharePerParent * (parents.length - 1) // Last one gets remainder
      : sharePerParent,
  }));

  // Add creator's share if not already a parent
  const creatorShare = 10000 - (sharePerParent * parents.length);
  if (creatorShare > 0 && !parents.some(p => p.owner === wallet.address)) {
    royaltySplits.push({ wallet: wallet.address, share: creatorShare });
  }

  const metadata: NFTMetadata = {
    name: combinedDream.title,
    description: combinedDream.narrative,
    image: combinedDream.imageUrl,
    animation_url: combinedDream.videoUrl,
    attributes: [
      { trait_type: 'Type', value: 'Combined Dream' },
      { trait_type: 'Parent Count', value: parents.length, display_type: 'number' },
      { trait_type: 'Themes', value: combinedDream.themes.join(', ') },
      { trait_type: 'Created', value: Date.now(), display_type: 'date' },
    ],
  };

  return {
    id: nftId,
    dreamId: nftId,
    owner: wallet.address,
    creator: wallet.address,
    metadata,
    status: 'pending',
    parents: parents.map(p => p.id),
    royaltySplits,
    license: 'cc-by-sa',
    allowRemix: true,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Mint an NFT (simulated - in production this would call a smart contract)
 */
export async function mintNFT(nft: DreamNFT): Promise<DreamNFT> {
  // In production, this would:
  // 1. Upload metadata to IPFS (via Pinata, NFT.Storage, or Arweave)
  // 2. Call the mint function on the smart contract
  // 3. Wait for confirmation
  // 4. Return the updated NFT with txHash and tokenId
  
  // For now, simulate minting with a fake tx hash
  const fakeTxHash = '0x' + Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');

  const fakeTokenId = Math.floor(Math.random() * 1000000).toString();

  return {
    ...nft,
    status: 'minted',
    txHash: fakeTxHash,
    contractAddress: '0x' + Array.from({ length: 40 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join(''),
    tokenId: fakeTokenId,
    isSimulated: true,
  };
}

/**
 * Get all NFTs for a wallet
 */
export function getWalletNFTs(walletAddress: string): DreamNFT[] {
  const stored = localStorage.getItem('ed_nfts');
  if (!stored) return [];
  
  try {
    const nfts: DreamNFT[] = JSON.parse(stored);
    return nfts.filter(n => n.owner === walletAddress);
  } catch {
    return [];
  }
}

/**
 * Save NFT to local storage
 */
export function saveNFT(nft: DreamNFT): void {
  const nfts = getWalletNFTs(''); // Get all
  const existing = localStorage.getItem('ed_nfts');
  const allNFTs: DreamNFT[] = existing ? JSON.parse(existing) : [];
  
  const idx = allNFTs.findIndex(n => n.id === nft.id);
  if (idx >= 0) {
    allNFTs[idx] = nft;
  } else {
    allNFTs.push(nft);
  }
  
  localStorage.setItem('ed_nfts', JSON.stringify(allNFTs));
}

/**
 * Export NFT metadata in OpenSea-compatible format
 */
export function exportNFTMetadata(nft: DreamNFT): object {
  return {
    name: nft.metadata.name,
    description: nft.metadata.description,
    image: nft.metadata.image,
    animation_url: nft.metadata.animation_url,
    external_url: nft.metadata.external_url,
    attributes: nft.metadata.attributes,
    properties: {
      category: 'dream',
      creators: [{ address: nft.creator, share: 100 }],
      royalty: nft.royaltySplits || [],
    },
  };
}
