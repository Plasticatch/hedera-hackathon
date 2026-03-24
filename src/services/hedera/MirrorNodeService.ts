export interface MirrorTopicMessage {
  consensus_timestamp: string;
  message: string; // base64-encoded
  sequence_number: number;
  topic_id: string;
}

export interface MirrorSchedule {
  schedule_id: string;
  executed_timestamp: string | null;
  expiration_time: string | null;
  memo: string;
  creator_account_id: string;
}

export interface MirrorNFT {
  token_id: string;
  serial_number: number;
  account_id: string;
  metadata: string; // base64-encoded
  created_timestamp: string;
}

export class MirrorNodeService {
  private baseUrl: string;
  private retryAttempts: number = 3;
  private retryDelay: number = 1000;

  constructor(network: "testnet" | "mainnet" = "testnet") {
    this.baseUrl =
      network === "mainnet"
        ? "https://mainnet.mirrornode.hedera.com/api/v1"
        : "https://testnet.mirrornode.hedera.com/api/v1";
  }

  // Fetch all messages from a topic, optionally starting after a sequence number
  async getTopicMessages(
    topicId: string,
    afterSequence?: number
  ): Promise<MirrorTopicMessage[]> {
    return this.retryRequest(async () => {
      const params = new URLSearchParams({ limit: "100", order: "asc" });
      if (afterSequence !== undefined) {
        params.set("sequencenumber", `gt:${afterSequence}`);
      }

      const url = `${this.baseUrl}/topics/${topicId}/messages?${params}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Mirror Node error ${res.status} for topic ${topicId}`);
      }

      const json = await res.json();
      return (json.messages ?? []) as MirrorTopicMessage[];
    });
  }

  // Decode a base64 Mirror Node message to a parsed object
  decodeMessage(base64: string): unknown {
    try {
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
  }

  // Resolve a DID document from HCS by searching DID_ANCHORED events
  async resolveDIDFromTopic(
    topicId: string,
    didId: string
  ): Promise<unknown | null> {
    const messages = await this.getTopicMessages(topicId);
    for (const msg of messages) {
      const decoded = this.decodeMessage(msg.message) as any;
      if (
        decoded?.eventType === "DID_ANCHORED" &&
        decoded?.data?.didDocument?.id === didId
      ) {
        return decoded.data.didDocument;
      }
    }
    return null;
  }

  // Fetch all messages published after a given sequence number (for agent replay)
  async getTopicMessagesSince(
    topicId: string,
    afterSequence: number
  ): Promise<MirrorTopicMessage[]> {
    return this.getTopicMessages(topicId, afterSequence);
  }

  // Fetch the current status of a scheduled transaction
  async getScheduleInfo(scheduleId: string): Promise<MirrorSchedule | null> {
    return this.retryRequest(async () => {
      const url = `${this.baseUrl}/schedules/${scheduleId}`;
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) {
        throw new Error(`Mirror Node error ${res.status} for schedule ${scheduleId}`);
      }
      return (await res.json()) as MirrorSchedule;
    });
  }

  // Fetch NFTs owned by an account (used for retirement certificate verification)
  async getAccountNFTs(accountId: string): Promise<MirrorNFT[]> {
    return this.retryRequest(async () => {
      const url = `${this.baseUrl}/accounts/${accountId}/nfts?limit=100`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Mirror Node error ${res.status} for account ${accountId}`);
      }
      const json = await res.json();
      return (json.nfts ?? []) as MirrorNFT[];
    });
  }

  // Get account balance
  async getAccountBalance(accountId: string): Promise<number> {
    return this.retryRequest(async () => {
      const url = `${this.baseUrl}/accounts/${accountId}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Mirror Node error ${res.status} for account ${accountId}`);
      }
      const json = await res.json();
      return Number(json.balance?.balance || 0) / 100_000_000;
    });
  }

  // Get transaction by ID
  async getTransaction(transactionId: string): Promise<any> {
    return this.retryRequest(async () => {
      const url = `${this.baseUrl}/transactions/${transactionId}`;
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) {
        throw new Error(`Mirror Node error ${res.status}`);
      }
      const json = await res.json();
      return json.transactions?.[0] || null;
    });
  }

  // Parse messages for specific event type
  parseMessages(
    messages: MirrorTopicMessage[],
    eventType?: string
  ): Array<{ sequence: number; timestamp: string; data: any }> {
    return messages
      .map(msg => {
        const decoded = this.decodeMessage(msg.message) as any;
        if (!decoded) return null;
        
        if (eventType && decoded.eventType !== eventType) {
          return null;
        }
        
        return {
          sequence: msg.sequence_number,
          timestamp: msg.consensus_timestamp,
          data: decoded,
        };
      })
      .filter(Boolean) as Array<{ sequence: number; timestamp: string; data: any }>;
  }

  // Get attestation provenance from HCS
  async getAttestationProvenance(
    attestationId: string,
    attestationTopicId: string
  ): Promise<any | null> {
    try {
      const messages = await this.getTopicMessages(attestationTopicId);
      const parsed = this.parseMessages(messages, 'RECOVERY_ATTESTATION');
      
      const attestation = parsed.find(
        msg => msg.data?.data?.attestationId === attestationId
      );
      
      return attestation?.data?.data || null;
    } catch (error) {
      console.error('Failed to get attestation provenance:', error);
      return null;
    }
  }

  // Verify PRC retirement on-chain
  async verifyPRCRetirement(
    certId: string,
    attestationTopicId: string
  ): Promise<{ verified: boolean; provenance: any[] }> {
    try {
      const messages = await this.getTopicMessages(attestationTopicId);
      const parsed = this.parseMessages(messages, 'PRC_RETIRED');
      
      const retirement = parsed.find(
        msg => msg.data?.data?.certId === certId
      );
      
      if (!retirement) {
        return { verified: false, provenance: [] };
      }
      
      const attestationIds = retirement.data?.data?.attestationIds || [];
      const attestations = parsed.filter(
        msg => attestationIds.includes(msg.data?.data?.attestationId)
      );
      
      return {
        verified: true,
        provenance: attestations.map(a => a.data?.data),
      };
    } catch (error) {
      console.error('Failed to verify PRC retirement:', error);
      return { verified: false, provenance: [] };
    }
  }

  // Retry request with exponential backoff
  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      if (attempt >= this.retryAttempts) {
        throw error;
      }
      
      const delay = this.retryDelay * Math.pow(2, attempt - 1);
      console.log(`Mirror Node request failed, retrying in ${delay}ms (attempt ${attempt}/${this.retryAttempts})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retryRequest(requestFn, attempt + 1);
    }
  }
}

// Singleton
let mirrorNodeService: MirrorNodeService | null = null;

export const getMirrorNodeService = (
  network: "testnet" | "mainnet" = "testnet"
): MirrorNodeService => {
  if (!mirrorNodeService) {
    mirrorNodeService = new MirrorNodeService(network);
  }
  return mirrorNodeService;
};
