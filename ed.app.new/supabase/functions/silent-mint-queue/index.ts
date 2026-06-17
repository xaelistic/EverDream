/**
 * SilentMintQueue - Supabase Edge Function
 *
 * Mints dream NFTs to custodial wallets. When CHAIN_RPC_URL + DEPLOYER_PRIVATE_KEY
 * + NFT_CONTRACT_ADDRESS are set, calls EverDreamNFT.mintDream on-chain.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ethers } from 'https://esm.sh/ethers@6.13.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DreamPayload {
  dream_id: string;
  user_id: string;
  content: string;
  category: string;
  image_url?: string;
  animation_url?: string;
  metadata_uri?: string;
  created_at: string;
}

const MINT_ABI = [
  'function mintDream(address to, string uri, bytes32 dreamIdHash) returns (uint256)',
  'event DreamMinted(address indexed to, uint256 indexed tokenId, string tokenURI, bytes32 dreamIdHash)',
];

async function mintOnChain(
  to: string,
  metadataUri: string,
  dreamId: string,
): Promise<{ txHash: string; tokenId: string; contractAddress: string } | null> {
  const rpc = Deno.env.get('CHAIN_RPC_URL');
  const key = Deno.env.get('DEPLOYER_PRIVATE_KEY');
  const contractAddress = Deno.env.get('NFT_CONTRACT_ADDRESS');

  if (!rpc || !key || !contractAddress) return null;

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(key, provider);
  const contract = new ethers.Contract(contractAddress, MINT_ABI, wallet);
  const dreamHash = ethers.id(dreamId);

  const tx = await contract.mintDream(to, metadataUri, dreamHash);
  const receipt = await tx.wait();

  let tokenId = '0';
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed?.name === 'DreamMinted') {
        tokenId = parsed.args.tokenId.toString();
        break;
      }
    } catch {
      /* skip unrelated logs */
    }
  }

  return {
    txHash: receipt.hash,
    tokenId,
    contractAddress,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
      },
    );

    const payload: DreamPayload = await req.json();
    console.log('[silent-mint] Processing dream:', payload.dream_id);

    const { data: walletData, error: walletError } = await supabaseClient
      .from('custodial_wallets')
      .select('wallet_address, provider')
      .eq('user_id', payload.user_id)
      .single();

    let walletAddress: string;

    if (walletError || !walletData) {
      const generatedAddress = `0x${Array.from({ length: 40 }, () =>
        Math.floor(Math.random() * 16).toString(16)).join('')}`;

      const { error: insertError } = await supabaseClient.from('custodial_wallets').insert({
        user_id: payload.user_id,
        wallet_address: generatedAddress,
        provider: 'custodial_vault',
        created_at: new Date().toISOString(),
      });

      if (insertError) throw insertError;
      walletAddress = generatedAddress;
    } else {
      walletAddress = walletData.wallet_address;
    }

    const metadata = {
      name: `Dream ${payload.dream_id.slice(-8)}`,
      description: payload.content.slice(0, 500),
      attributes: [
        { trait_type: 'Category', value: payload.category },
        { trait_type: 'Dream ID', value: payload.dream_id },
        { trait_type: 'Minted At', value: new Date().toISOString() },
      ],
      image: payload.image_url || null,
      animation_url: payload.animation_url || null,
      external_url: payload.metadata_uri || `${Deno.env.get('EVERDREAM_APP_URL') || 'https://everdream.app'}/#/dream/${payload.dream_id}`,
    };

    const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
    const metadataPath = `metadata/${payload.user_id}/${payload.dream_id}.json`;

    const { error: uploadError } = await supabaseClient.storage
      .from('nft-assets')
      .upload(metadataPath, metadataBlob, { contentType: 'application/json', upsert: true });

    if (uploadError) {
      console.warn('[silent-mint] Metadata upload failed:', uploadError.message);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const metadataUrl =
      payload.metadata_uri ||
      `${supabaseUrl}/storage/v1/object/public/nft-assets/${metadataPath}`;

    let txHash: string;
    let tokenId: string;
    let contractAddress = Deno.env.get('NFT_CONTRACT_ADDRESS') || '0xSIMULATED';
    let onChain = false;

    const chainResult = await mintOnChain(walletAddress, metadataUrl, payload.dream_id);
    if (chainResult) {
      txHash = chainResult.txHash;
      tokenId = chainResult.tokenId;
      contractAddress = chainResult.contractAddress;
      onChain = true;
      console.log('[silent-mint] On-chain mint:', tokenId, txHash);
    } else {
      txHash = `0x${Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)).join('')}`;
      tokenId = BigInt(
        `0x${Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      ).toString();
      console.log('[silent-mint] Simulated mint (no chain secrets)');
    }

    const { error: recordError } = await supabaseClient.from('dream_nfts').upsert({
      dream_id: payload.dream_id,
      user_id: payload.user_id,
      wallet_address: walletAddress,
      token_id: tokenId,
      tx_hash: txHash,
      metadata_url: metadataUrl,
      contract_address: contractAddress,
      status: 'minted',
      minted_at: new Date().toISOString(),
    });

    if (recordError) throw recordError;

    return new Response(
      JSON.stringify({
        success: true,
        dream_id: payload.dream_id,
        wallet_address: walletAddress,
        token_id: tokenId,
        tx_hash: txHash,
        contract_address: contractAddress,
        on_chain: onChain,
        metadata_url: metadataUrl,
        message: onChain ? 'Dream NFT minted on-chain' : 'Dream asset minted (simulated)',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error) {
    console.error('[silent-mint] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});