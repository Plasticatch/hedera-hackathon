# PlastiCatch --- Pitch Deck

---

## Slide 1: Title

**PlastiCatch**
*Paying Collectors to Clean the Ocean*

| | |
|---|---|
| **Track** | Sustainability |
| **Bounty** | Hashgraph Online ($8,000) |
| **Team** | [Team Name] |
| **Members** | [Team Members] |

---

## Slide 2: Problem

**The ocean plastic crisis is not a technology problem. It is an incentive problem.**

- **14 million tons** of plastic enter the ocean every year. The global ocean cleanup industry is valued at **$13 billion**, yet plastic pollution continues to accelerate.
- The people best positioned to remove ocean plastic --- fishermen, coastal residents, small boat operators --- are already on the water. They encounter plastic constantly. They throw it back because **keeping it has no value**.
- Corporations spend billions on sustainability marketing with no verifiable proof of environmental impact. Press releases, not provenance. Self-reported tonnage, not tamper-proof records.
- There is no credible, fraud-resistant measurement infrastructure for ocean plastic recovery. No one can answer the question: "How much plastic was actually removed, by whom, and when?"

---

## Slide 3: Solution

**PlastiCatch creates the missing economic incentive for ocean plastic removal.**

1. **Collectors** recover plastic from the ocean and bring it to registered **Weighing Stations**.
2. Station operators weigh, categorize, and submit a **signed attestation** to Hedera HCS.
3. An autonomous **Recovery Agent** verifies the attestation (station stake check, anomaly detection, collector identity verification).
4. A **Hedera Scheduled Transaction** pays the collector in HBAR --- automatically, within 60 seconds. No bank account required.
5. **Corporations** purchase **Plastic Recovery Credits (PRCs)** --- HTS tokens, each representing 1 verified kg removed --- to back sustainability claims with on-chain provenance.
6. The collector gets paid. The ocean gets cleaned. The corporation gets verifiable impact. **No intermediary takes 40%.**

---

## Slide 4: Why Hedera

| Challenge | Why Not Web2 | Hedera Solution |
|---|---|---|
| **Micro-payments to collectors** | Banks charge $3-5 per wire transfer --- more than most collector payouts. Mobile money is region-locked. | Hedera Scheduled Transactions: $0.0001 per transaction. Collectors paid in HBAR, globally, within 60 seconds. |
| **Tamper-proof attestations** | A centralized database can be edited. Auditors have to trust the operator. | HCS messages are immutable and sequenced. Every attestation, minting event, and retirement is independently verifiable. |
| **Automated payment triggers** | Requires a trusted intermediary to hold funds and decide when to release. | Scheduled Transactions execute automatically on a verified attestation --- no human in the loop, no custodial risk. |
| **Verifiable impact credits** | PDF certificates can be duplicated. Carbon credit fraud is rampant. | PRC tokens on HTS carry full provenance (collector, station, zone, type, weight). Retirement burns the token permanently on-chain. |
| **Low-cost at scale** | Payment processing fees eat into micro-payouts. | Hedera's fixed, low fees make per-kilogram payments economically viable even at $0.15/kg plastic types. |

---

## Slide 5: Demo / Key Features

**Collector Journey:**
- Phone-based onboarding in under 2 minutes. No bank account, no formal ID. DID anchored on HCS.
- Nearest Weighing Stations shown with accepted types, payout rates, and demand bonuses.
- Push notification on every payment: "Payment confirmed: 6.6 HBAR for 10 kg fishing gear."

**Station Operator Journey:**
- Register station with 500 HBAR stake bond. Dashboard shows daily volume, active collectors, payout totals.
- Submit attestation: scan collector QR code, weigh plastic per type, confirm payout, sign and submit.

**Recovery Submission Flow:**
- Attestation published to HCS. Recovery Agent verifies within 30 seconds. PRCs minted via HTS. Scheduled Transaction pays collector.

**PRC Marketplace:**
- Corporate buyers browse PRCs by zone, plastic type, and date.
- Full chain-of-custody on every token: collector ID, station ID, GPS zone, plastic type, weight, date.
- Retirement burns tokens on-chain with company name. Retirement certificate generated.

---

## Slide 6: Business Model

| Revenue Stream | Mechanism |
|---|---|
| **PRC Sales Margin** | PlastiCatch charges a margin on PRC sales to corporate buyers. Collector payout is fixed per plastic type; the margin covers platform operations and growth. |
| **Corporate Sponsorship Fees** | Corporations fund Cleanup Events via CleanupEventPool. A percentage funds platform operations. Sponsors receive event summary NFTs and public impact attribution. |
| **Station Registration Fees** | Weighing Stations pay a one-time registration processing fee in addition to the 500 HBAR stake bond. |
| **Premium Analytics** | Corporate dashboards, custom impact reports, API access for ESG reporting integration. |

**Unit Economics:**
- Average collector payout: 0.15--0.60 HBAR/kg depending on plastic type.
- PRC sale price to corporates: set above payout rate to cover minting, verification, and platform margin.
- Hedera transaction cost: ~$0.0001 per transaction --- negligible at scale.

---

## Slide 7: Market Validation

**Target Segments:**

| Segment | Who | Why They Care |
|---|---|---|
| **Collectors** | Fishermen, coastal communities, boat operators in tropical/Mediterranean/Gulf regions | Direct income from activity they already do. No friction: phone-only, no bank needed. |
| **Corporate ESG Buyers** | Consumer goods companies, logistics firms, event sponsors, municipalities | Verifiable sustainability claims backed by on-chain provenance. Solves greenwashing risk. |
| **Station Operators** | Port authorities, recycling depots, NGO collection points, municipal facilities | Revenue share on processed volume. Community impact. Existing infrastructure repurposed. |

**Validation Approach:**
- Testnet deployment with simulated collector and station flows.
- Payout rate model validated against real-world plastic commodity values and recovery difficulty.
- Anti-Sybil identity model stress-tested against mass registration and collusion attack vectors.
- HCS attestation schema designed for auditability by third-party environmental verifiers.

---

## Slide 8: Architecture

```
+──────────────────────────────────────────────────────────────────+
│                     PRESENTATION LAYER                           │
│  Collector PWA       Station Portal       Corporate Portal       │
│  (mobile-first)      (tablet/desktop)     (PRC marketplace)      │
+──────────────────────────────────────────────────────────────────+
                              │
+──────────────────────────────────────────────────────────────────+
│                        API LAYER                                 │
│  Vite Dev Server  +  Supabase Edge Functions  +  React Query     │
+──────────────────────────────────────────────────────────────────+
                              │
+──────────────────────────────────────────────────────────────────+
│                     AGENT LAYER (HOL Registry)                   │
│  Recovery Agent (1 per zone)                                     │
│  Verify attestations ─ Mint PRCs ─ Trigger payments              │
│  Anomaly detection ─ NL queries (HCS-10) ─ Impact reports        │
+──────────────────────────────────────────────────────────────────+
                              │
+──────────────────────────────────────────────────────────────────+
│                   SMART CONTRACT LAYER (Hedera EVM)              │
│  CollectorRegistry  StationRegistry  PRCToken                    │
│  CorporateVault     CleanupEventPool ReputationOracle            │
+──────────────────────────────────────────────────────────────────+
                              │
+──────────────────────────────────────────────────────────────────+
│                     HEDERA SERVICES                              │
│  HCS (attestations, DIDs, events)    HTS (PRC tokens, staking)   │
│  Scheduled Tx (auto-payments)        Mirror Node (queries)       │
│  Account Creation (sponsored)        HCS-10 (agent messaging)    │
+──────────────────────────────────────────────────────────────────+
                              │
+──────────────────────────────────────────────────────────────────+
│                     DATABASE LAYER                               │
│  Supabase PostgreSQL ─ Realtime ─ Edge Functions ─ Storage       │
│  Mutable state, dashboards, Mirror Node sync, anomaly alerting   │
+──────────────────────────────────────────────────────────────────+
```

---

## Slide 9: Future Roadmap

**What We Learned:**
- Hedera's fixed low fees make per-kilogram micro-payments viable where traditional payment rails cannot.
- HCS provides the immutable attestation layer that corporate buyers need to trust sustainability claims.
- Phone-based identity with DID anchoring achieves the zero-friction onboarding required for informal-economy collectors.

**Next Steps:**
- **Mainnet Deployment** --- Move from testnet to production with real HBAR payouts and live station operators.
- **Mobile App (Native PWA)** --- Enhanced offline capability for collectors in areas with intermittent connectivity.
- **Zone Expansion** --- Launch in 3 pilot zones: Mediterranean (North Africa/Southern Europe), Arabian Gulf, Pacific (Philippines/Indonesia).
- **Corporate API** --- REST and GraphQL API for direct ESG reporting system integration.
- **Third-Party Verification** --- Partner with environmental certification bodies to audit HCS attestation records.
- **Reputation Portability** --- Collector DIDs and reputation scores portable across ocean cleanup platforms via W3C DID standard.

**Scaling Vision:**
- 50+ zones, 10,000+ collectors, 500+ stations within 24 months of mainnet launch.
- PRC secondary market enabling price discovery and liquidity for verified ocean plastic removal credits.
- Integration with international carbon credit registries for combined climate + ocean impact accounting.

---

## Slide 10: Team

| Role | Name | Background |
|---|---|---|
| [Role 1] | [Team Member 1] | [Background] |
| [Role 2] | [Team Member 2] | [Background] |
| [Role 3] | [Team Member 3] | [Background] |
| [Role 4] | [Team Member 4] | [Background] |

*Fill in team details before presenting.*

---

*Built for the Hashgraph Online Bounty --- Sustainability Track*
*Powered by Hedera Hashgraph: HCS, HTS, Scheduled Transactions, EVM Smart Contracts*
