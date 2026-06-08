/**
 * SilentMintQueue - Supabase Edge Function
 * 
 * Automatically mints dream assets to a custodial wallet mapped to user_id.
 * Triggered via database trigger when a dream is saved.
 * 
 * Usage: Call via Supabase invoke function or database webhook.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  created_at: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
      }
    );

    // Parse incoming dream data
    const payload: DreamPayload = await req.json();
    console.log('[silent-mint] Processing dream:', payload.dream_id);

    // Get or create custodial wallet for user
    const { data: walletData, error: walletError } = await supabaseClient
      .from('custodial_wallets')
      .select('wallet_address, provider')
      .eq('user_id', payload.user_id)
      .single();

    let walletAddress: string;
    
    if (walletError || !walletData) {
      // Create new custodial wallet mapping
      // In production, this would call your NFT provider's API
      const generatedAddress = `0x${Array.from({ length: 40 }, () => 
        Math.floor(Math.random() * 16).toString(16)).join('')}`;
      
      const { error: insertError } = await supabaseClient
        .from('custodial_wallets')
        .insert({
          user_id: payload.user_id,
          wallet_address: generatedAddress,
          provider: 'custodial_vault',
          created_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;
      walletAddress = generatedAddress;
      console.log('[silent-mint] Created new wallet for user:', payload.user_id);
    } else {
      walletAddress = walletData.wallet_address;
    }

    // Prepare NFT metadata
    const metadata = {
      name: `Dream ${payload.dream_id.slice(-8)}`,
      description: payload.content.slice(0, 500),
      attributes: [
        { trait_type: 'Category', value: payload.category },
        { trait_type: 'Dream ID', value: payload.dream_id },
        { trait_type: 'Minted At', value: new Date().toISOString() },
      ],
      image: payload.image_url || null,
      external_url: `${Deno.env.get('SUPABASE_URL')}/dreams/${payload.dream_id}`,
    };

    // Store metadata in Supabase storage
    const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
    const metadataPath = `metadata/${payload.user_id}/${payload.dream_id}.json`;
    
    const { error: uploadError } = await supabaseClient.storage
      .from('nft-assets')
      .upload(metadataPath, metadataBlob, {
        contentType: 'application/json',
        upsert: true,
      });

    if (uploadError) {
      console.warn('[silent-mint] Metadata upload failed:', uploadError.message);
      // Non-critical, continue
    }

    const metadataUrl = payload.image_url 
      ? `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/nft-assets/${metadataPath}`
      : null;

    // Simulate minting transaction (in production, call actual NFT provider)
    const txHash = `0x${Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)).join('')}`;
    
    const tokenId = BigInt(`0x${Array.from({ length: 16 }, () => 
      Math.floor(Math.random() * 16).toString(16)).join('')}`).toString();

    // Record minting status in database
    const { error: recordError } = await supabaseClient
      .from('dream_nfts')
      .upsert({
        dream_id: payload.dream_id,
        user_id: payload.user_id,
        wallet_address: walletAddress,
        token_id: tokenId,
        tx_hash: txHash,
        metadata_url: metadataUrl,
        contract_address: Deno.env.get('NFT_CONTRACT_ADDRESS') || '0xSIMULATED',
        status: 'minted',
        minted_at: new Date().toISOString(),
      });

    if (recordError) throw recordError;

    console.log('[silent-mint] Successfully minted dream:', payload.dream_id);

    return new Response(
      JSON.stringify({
        success: true,
        dream_id: payload.dream_id,
        wallet_address: walletAddress,
        token_id: tokenId,
        tx_hash: txHash,
        message: 'Dream asset minted to custodial wallet',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[silent-mint] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
