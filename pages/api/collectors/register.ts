import { NextApiRequest, NextApiResponse } from 'next';
import { getHederaService, defaultHederaConfig } from '@/services/hedera/HederaService';
import { getDIDService } from '@/services/hedera/DIDService';
import { supabase } from '@/integrations/supabase/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phoneNumber, zone, displayName } = req.body;

    if (!phoneNumber || !zone || !displayName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Initialize Hedera services
    const hederaService = getHederaService(defaultHederaConfig);
    const didService = getDIDService(hederaService, process.env.DID_TOPIC_ID);

    // Create collector identity with DID anchoring
    const identity = await didService.createCollectorIdentity(phoneNumber, zone);

    // Store in Supabase
    const { data: collector, error } = await supabase
      .from('collectors')
      .insert({
        hedera_account_id: identity.hederaAccountId,
        display_name: displayName,
        phone_hash: identity.phoneHash,
        zone: identity.zone,
        did_document: identity.didDocument,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to create collector record' });
    }

    // Return collector info (without sensitive data)
    res.status(201).json({
      success: true,
      collector: {
        id: collector.id,
        hederaAccountId: identity.hederaAccountId,
        displayName: collector.display_name,
        zone: collector.zone,
        reputationTier: collector.reputation_tier,
        didHcsSequence: identity.didHcsSequence,
      },
      onboardingCredit: 0.3, // HBAR
    });

  } catch (error) {
    console.error('Collector registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}