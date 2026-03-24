/**
 * Phone Verification API Endpoint
 * POST /api/phone/verify - Send or verify OTP
 */

import { phoneVerificationService } from '../../../src/services/PhoneVerificationService';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, phoneNumber, code } = req.body;

  try {
    if (action === 'send-otp') {
      if (!phoneNumber || typeof phoneNumber !== 'string') {
        return res.status(400).json({ error: 'Phone number is required' });
      }

      const result = await phoneVerificationService.sendOTP(phoneNumber);

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Verification code sent successfully' 
      });
    }

    if (action === 'verify-otp') {
      if (!phoneNumber || !code) {
        return res.status(400).json({ error: 'Phone number and code are required' });
      }

      const result = phoneVerificationService.verifyOTP(phoneNumber, code);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      return res.status(200).json({ 
        success: true, 
        phoneHash: result.phoneHash,
        message: 'Phone number verified successfully' 
      });
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error('Phone verification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
