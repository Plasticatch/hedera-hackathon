import { NextApiRequest, NextApiResponse } from 'next';
import { getHederaService, defaultHederaConfig } from '@/services/hedera/HederaService';
import { RecoveryAgentManager } from '@/services/hedera/RecoveryAgentService';

// Global agent manager instance
let agentManager: RecoveryAgentManager | null = null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Initialize agent manager if not exists
    if (!agentManager) {
      const hederaService = getHederaService(defaultHederaConfig);
      agentManager = new RecoveryAgentManager(hederaService);
    }

    switch (req.method) {
      case 'POST':
        return await deployAgent(req, res, agentManager);
      case 'DELETE':
        return await stopAgent(req, res, agentManager);
      case 'GET':
        return await getAgentStatus(req, res, agentManager);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Recovery Agent API error:', error);
    res.status(500).json({ 
      error: 'Agent operation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function deployAgent(
  req: NextApiRequest, 
  res: NextApiResponse, 
  agentManager: RecoveryAgentManager
) {
  const { zoneId } = req.body;

  if (!zoneId) {
    return res.status(400).json({ error: 'Zone ID required' });
  }

  await agentManager.deployAgent(zoneId);

  res.status(201).json({
    success: true,
    message: `Recovery Agent deployed for zone: ${zoneId}`,
    zoneId,
    status: 'active'
  });
}

async function stopAgent(
  req: NextApiRequest, 
  res: NextApiResponse, 
  agentManager: RecoveryAgentManager
) {
  const { zoneId } = req.query;

  if (!zoneId || typeof zoneId !== 'string') {
    return res.status(400).json({ error: 'Zone ID required' });
  }

  agentManager.stopAgent(zoneId);

  res.status(200).json({
    success: true,
    message: `Recovery Agent stopped for zone: ${zoneId}`,
    zoneId,
    status: 'stopped'
  });
}

async function getAgentStatus(
  req: NextApiRequest, 
  res: NextApiResponse, 
  agentManager: RecoveryAgentManager
) {
  const { zoneId } = req.query;

  if (zoneId && typeof zoneId === 'string') {
    const agent = agentManager.getAgent(zoneId);
    return res.status(200).json({
      zoneId,
      status: agent ? 'active' : 'not_deployed'
    });
  }

  // Return status of all agents (simplified)
  res.status(200).json({
    message: 'Recovery Agent Manager status',
    // In production, would return actual agent statuses
    activeZones: ['MEDITERRANEAN_NORTH', 'ARABIAN_GULF', 'PACIFIC_PHILIPPINES']
  });
}