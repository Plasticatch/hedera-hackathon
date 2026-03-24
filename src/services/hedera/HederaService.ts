import {
  Client,
  PrivateKey,
  AccountId,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TopicInfoQuery,
  ScheduleCreateTransaction,
  ScheduleSignTransaction,
  TransferTransaction,
  Hbar,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  AccountCreateTransaction,
  AccountBalanceQuery,
} from "@hashgraph/sdk";

export interface HederaConfig {
  operatorId: string;
  operatorKey: string;
  network: "testnet" | "mainnet";
}

export interface HCSMessage {
  eventType: string;
  data: any;
  timestamp: number;
}

export interface ScheduledPayment {
  collectorAccountId: string;
  amount: number; // in tinybar
  memo: string;
}

export class HederaService {
  private client: Client;
  private operatorId: AccountId;
  private operatorKey: PrivateKey;

  constructor(config: HederaConfig) {
    this.operatorId = AccountId.fromString(config.operatorId);
    this.operatorKey = PrivateKey.fromString(config.operatorKey);
    
    if (config.network === "testnet") {
      this.client = Client.forTestnet();
    } else {
      this.client = Client.forMainnet();
    }
    
    this.client.setOperator(this.operatorId, this.operatorKey);
  }

  // HCS (Hedera Consensus Service) Methods
  async createTopic(memo: string): Promise<string> {
    const transaction = new TopicCreateTransaction()
      .setTopicMemo(memo)
      .setAdminKey(this.operatorKey.publicKey)
      .setSubmitKey(this.operatorKey.publicKey);

    const response = await transaction.execute(this.client);
    const receipt = await response.getReceipt(this.client);
    
    if (!receipt.topicId) {
      throw new Error("Failed to create topic");
    }
    
    return receipt.topicId.toString();
  }

  async submitToHCS(topicId: string, message: HCSMessage): Promise<number> {
    const messageBytes = Buffer.from(JSON.stringify(message));
    
    const transaction = new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(messageBytes);

    const response = await transaction.execute(this.client);
    const receipt = await response.getReceipt(this.client);
    
    return receipt.topicSequenceNumber?.toNumber() || 0;
  }

  // Collector Registration Events
  async submitCollectorRegistration(
    topicId: string,
    collectorId: string,
    zone: string,
    phoneHash: string,
    didSequence: number
  ): Promise<number> {
    const message: HCSMessage = {
      eventType: "COLLECTOR_REGISTERED",
      data: {
        collectorId,
        zone,
        phoneHash,
        didSequence,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    };

    return this.submitToHCS(topicId, message);
  }

  // Recovery Attestation Events
  async submitRecoveryAttestation(
    topicId: string,
    attestationId: string,
    collectorId: string,
    stationId: string,
    zone: string,
    plasticItems: Array<{ type: string; weightGrams: number }>,
    totalWeightGrams: number,
    photoHash?: string
  ): Promise<number> {
    const message: HCSMessage = {
      eventType: "RECOVERY_ATTESTATION",
      data: {
        attestationId,
        collectorId,
        stationId,
        zone,
        plasticItems,
        totalWeightGrams,
        photoHash,
        submittedAt: Date.now(),
      },
      timestamp: Date.now(),
    };

    return this.submitToHCS(topicId, message);
  }

  // PRC Minting Events
  async submitPRCMinting(
    topicId: string,
    attestationId: string,
    collectorId: string,
    prcsMinted: number,
    payoutTinybar: number
  ): Promise<number> {
    const message: HCSMessage = {
      eventType: "PRC_MINTED",
      data: {
        attestationId,
        collectorId,
        prcsMinted,
        payoutTinybar,
        mintedAt: Date.now(),
      },
      timestamp: Date.now(),
    };

    return this.submitToHCS(topicId, message);
  }

  // Scheduled Transactions for Collector Payments
  async createScheduledPayment(payment: ScheduledPayment): Promise<string> {
    const transferTransaction = new TransferTransaction()
      .addHbarTransfer(this.operatorId, Hbar.fromTinybars(-payment.amount))
      .addHbarTransfer(payment.collectorAccountId, Hbar.fromTinybars(payment.amount))
      .setTransactionMemo(payment.memo);

    const scheduleTransaction = new ScheduleCreateTransaction()
      .setScheduledTransaction(transferTransaction)
      .setScheduleMemo(`Payment to collector ${payment.collectorAccountId}`)
      .setAdminKey(this.operatorKey.publicKey);

    const response = await scheduleTransaction.execute(this.client);
    const receipt = await response.getReceipt(this.client);

    if (!receipt.scheduleId) {
      throw new Error("Failed to create scheduled payment");
    }

    const scheduleId = receipt.scheduleId;

    // Immediately sign and execute the schedule so the payment is sent now
    // rather than waiting for expiry or a separate signing step
    const signTx = await new ScheduleSignTransaction()
      .setScheduleId(scheduleId)
      .freezeWith(this.client)
      .sign(this.operatorKey);

    const signResponse = await signTx.execute(this.client);
    await signResponse.getReceipt(this.client);

    return scheduleId.toString();
  }

  // HTS Token Operations
  async createPRCToken(
    tokenName: string,
    tokenSymbol: string,
    decimals: number = 3
  ): Promise<string> {
    const transaction = new TokenCreateTransaction()
      .setTokenName(tokenName)
      .setTokenSymbol(tokenSymbol)
      .setTokenType(TokenType.FungibleCommon)
      .setDecimals(decimals)
      .setInitialSupply(0)
      .setSupplyType(TokenSupplyType.Infinite)
      .setTreasuryAccountId(this.operatorId)
      .setSupplyKey(this.operatorKey.publicKey)
      .setAdminKey(this.operatorKey.publicKey);

    const response = await transaction.execute(this.client);
    const receipt = await response.getReceipt(this.client);
    
    if (!receipt.tokenId) {
      throw new Error("Failed to create PRC token");
    }
    
    return receipt.tokenId.toString();
  }

  // Account Creation for Collectors
  async createCollectorAccount(): Promise<{ accountId: string; privateKey: string }> {
    const newAccountPrivateKey = PrivateKey.generateED25519();
    const newAccountPublicKey = newAccountPrivateKey.publicKey;

    const transaction = new AccountCreateTransaction()
      .setKey(newAccountPublicKey)
      .setInitialBalance(Hbar.fromTinybars(30000000)); // 0.3 HBAR onboarding credit

    const response = await transaction.execute(this.client);
    const receipt = await response.getReceipt(this.client);
    
    if (!receipt.accountId) {
      throw new Error("Failed to create collector account");
    }

    return {
      accountId: receipt.accountId.toString(),
      privateKey: newAccountPrivateKey.toString(),
    };
  }

  // Query Account Balance
  async getAccountBalance(accountId: string): Promise<number> {
    const balance = await new AccountBalanceQuery()
      .setAccountId(accountId)
      .execute(this.client);
    
    return balance.hbars.toTinybars().toNumber();
  }

  // Leaderboard Updates
  async submitLeaderboardUpdate(
    topicId: string,
    zone: string,
    topCollectors: Array<{ collectorId: string; kg: number; rank: number }>
  ): Promise<number> {
    const message: HCSMessage = {
      eventType: "LEADERBOARD_UPDATE",
      data: {
        zone,
        topCollectors,
        generatedAt: Date.now(),
      },
      timestamp: Date.now(),
    };

    return this.submitToHCS(topicId, message);
  }

  // Demand Signals
  async submitDemandSignal(
    topicId: string,
    zone: string,
    bonusPercentage: number,
    validUntil: number,
    inventoryLevel: number
  ): Promise<number> {
    const message: HCSMessage = {
      eventType: "DEMAND_SIGNAL",
      data: {
        zone,
        bonusPercentage,
        validUntil,
        inventoryLevel,
        triggeredAt: Date.now(),
      },
      timestamp: Date.now(),
    };

    return this.submitToHCS(topicId, message);
  }

  // Cleanup Event Logging
  async submitCleanupEventStart(
    topicId: string,
    eventId: string,
    organizer: string,
    zones: string[],
    multiplier: number,
    sponsor?: string,
    poolAmount?: number
  ): Promise<number> {
    const message: HCSMessage = {
      eventType: "CLEANUP_EVENT_STARTED",
      data: {
        eventId,
        organizer,
        zones,
        multiplier,
        sponsor,
        poolAmount,
        startedAt: Date.now(),
      },
      timestamp: Date.now(),
    };

    return this.submitToHCS(topicId, message);
  }

  // Dispute Events
  async submitDisputeOpened(
    topicId: string,
    disputeId: string,
    attestationId: string,
    disputeType: string,
    initiator: string
  ): Promise<number> {
    const message: HCSMessage = {
      eventType: "DISPUTE_OPENED",
      data: {
        disputeId,
        attestationId,
        disputeType,
        initiator,
        openedAt: Date.now(),
      },
      timestamp: Date.now(),
    };

    return this.submitToHCS(topicId, message);
  }

  // Close client connection
  close(): void {
    this.client.close();
  }
}

// Singleton instance
let hederaService: HederaService | null = null;

export const getHederaService = (config?: HederaConfig): HederaService => {
  if (!hederaService && config) {
    hederaService = new HederaService(config);
  }
  if (!hederaService) {
    throw new Error("Hedera service not initialized");
  }
  return hederaService;
};

// Default configuration for development
export const defaultHederaConfig: HederaConfig = {
  operatorId: process.env.HEDERA_OPERATOR_ID || "0.0.123456",
  operatorKey: process.env.HEDERA_OPERATOR_KEY || "302e020100300506032b657004220420...",
  network: "testnet",
};