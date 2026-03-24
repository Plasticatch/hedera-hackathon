import { NextApiRequest, NextApiResponse } from 'next';
import { getHederaService, defaultHederaConfig } from '@/services/hedera/HederaService';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      collectorId, 
      stationId, 
      plasticItems, 
      photoHash,
      operatorSignature 
    } = req.body;

    if (!collectorId || !stationId || !plasticItems?.length) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate collector and station exist
    const { data: collector } = await supabase
      .from('collectors')
      .select('*')
      .eq('id', collectorId)
      .single();

    const { data: station } = await supabase
      .from('weighing_stations')
      .select('*')
      .eq('id', stationId)
      .single();

    if (!collector || !station) {
      return res.status(404).json({ error: 'Collector or station not found' });
    }

    if (collector.status !== 'active' || station.status !== 'active') {
      return res.status(400).json({ error: 'Collector or station not active' });
    }

    // Calculate total weight
    const totalWeightGrams = plasticItems.reduce((sum: number, item: any) => 
      sum + (item.weightGrams || 0), 0);

    const attestationId = uuidv4();

    // Initialize Hedera service
    const hederaService = getHederaService(defaultHederaConfig);

    // Submit attestation to HCS
    const hcsSequence = await hederaService.submitRecoveryAttestation(
      process.env.ATTESTATION_TOPIC_ID || '',
      attestationId,
      collector.hedera_account_id,
      station.hedera_account_id || station.id,
      station.zone,
      plasticItems,
      totalWeightGrams,
      photoHash
    );

    // Store attestation in database
    const { data: attestation, error } = await supabase
      .from('attestations')
      .insert({
        id: attestationId,
        collector_id: collectorId,
        station_id: stationId,
        zone: station.zone,
        plastic_items: plasticItems,
        total_weight_grams: totalWeightGrams,
        photo_hash: photoHash,
        operator_signature: operatorSignature,
        hcs_sequence_number: hcsSequence,
        status: 'pending', // Will be processed by Recovery Agent
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to create attestation' });
    }

    // Increment station nonce
    await supabase
      .from('weighing_stations')
      .update({ 
        attestation_nonce: (station.attestation_nonce || 0) + 1 
      })
      .eq('id', stationId);

    res.status(201).json({
      success: true,
      attestation: {
        id: attestation.id,
        hcsSequence,
        status: 'pending',
        totalWeightGrams,
        estimatedProcessingTime: '30 seconds',
      }
    });

  } catch (error) {
    console.error('Attestation submission error:', error);
    res.status(500).json({ 
      error: 'Submission failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}