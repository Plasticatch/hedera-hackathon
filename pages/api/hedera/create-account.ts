/**
 * Hedera Account Creation API
 * POST /api/hedera/create-account - Create collector Hedera account
 */

import { getHederaService } from '../../../src/services/hedera/HederaService';
import { createDIDService } from '../../../src/services/hedera/DIDServiceImpl';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { collectorId, phoneHash, zone, displayName } = req.body;

  if (!collectorId || !phoneHash || !zone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Initialize Hedera service
    const hederaService = getHederaService({
      operatorId: process.env.HEDERA_OPERATOR_ID!,
      operatorKey: process.env.HEDERA_OPERATOR_KEY!,
      network: (process.env.VITE_HEDERA_NETWORK as 'testnet' | 'mainnet') || 'testnet',
    });

    // Create Hedera account for collector
    const { accountId, privateKey } = await hederaService.createCollectorAccount();

    // Create and anchor DID
    const didService = createDIDService(
      hederaService,
      process.env.VITE_DID_TOPIC_ID!
    );

    const { didDocument, hcsSequence } = await didService.createAndAnchorDID({
      collectorId,
      phoneHash,
      zone,
      hederaAccountId: accountId,
      walletAddress: accountId,
    });

    // Submit collector registration to HCS
    await hederaService.submitCollectorRegistration(
      process.env.VITE_ATTESTATION_TOPIC_ID!,
      collectorId,
      zone,
      phoneHash,
      hcsSequence
    );

    return res.status(200).json({
      success: true,
      accountId,
      privateKey, // In production, encrypt this or use key management service
      didDocument,
      hcsSequence,
    });

  } catch (error: any) {
    console.error('Account creation error:', error);
    return res.status(500).json({ 
      error: 'Failed to create Hedera account',
      details: error.message 
    });
  }
}
