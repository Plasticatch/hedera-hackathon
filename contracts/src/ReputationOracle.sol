// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./CollectorRegistry.sol";

/// @title ReputationOracle
/// @notice On-chain reputation scoring for PlastiCatch collectors.
///         Score = volumeScore(40%) + consistencyScore(30%) + diversityScore(20%) + typeScore(10%)
///         Scores are stored on-chain and mirrored to Supabase for fast reads.
contract ReputationOracle {
    struct ReputationData {
        uint256 score;          // 0–1000
        uint8   tier;           // 0–4
        uint256 totalKgRecovered;
        uint8   uniqueStations;
        uint16  activeWeeks;
        uint256 fishingGearKg;  // for typeScore
        uint256 microplasticKg; // for typeScore
        uint256 lastUpdated;
    }

    /// @dev Tier thresholds (score)
    uint256 constant TIER_1_MIN = 51;
    uint256 constant TIER_2_MIN = 201;
    uint256 constant TIER_3_MIN = 501;
    uint256 constant TIER_4_MIN = 801;

    mapping(address => ReputationData) public reputationData;

    CollectorRegistry public immutable collectorRegistry;

    address public admin;
    address public recoveryAgent;

    event ReputationScoreUpdated(
        address indexed collector,
        uint256 oldScore,
        uint256 newScore,
        uint8   newTier
    );

    event RecoveryAgentSet(address indexed agent);

    modifier onlyAdminOrAgent() {
        require(msg.sender == admin || msg.sender == recoveryAgent, "Not authorized");
        _;
    }

    constructor(address _collectorRegistry) {
        collectorRegistry = CollectorRegistry(_collectorRegistry);
        admin = msg.sender;
    }

    function setRecoveryAgent(address _agent) external {
        require(msg.sender == admin, "Not admin");
        recoveryAgent = _agent;
        emit RecoveryAgentSet(_agent);
    }

    /// @notice Update reputation stats for a collector and recompute score + tier.
    function updateReputation(
        address _collector,
        uint256 _totalKgRecovered,
        uint8   _uniqueStations,
        uint16  _activeWeeks,
        uint256 _fishingGearKg,
        uint256 _microplasticKg
    ) external onlyAdminOrAgent {
        require(collectorRegistry.isCollectorActive(_collector), "Collector not active");

        ReputationData storage data = reputationData[_collector];
        uint256 oldScore = data.score;

        data.totalKgRecovered = _totalKgRecovered;
        data.uniqueStations   = _uniqueStations;
        data.activeWeeks      = _activeWeeks;
        data.fishingGearKg    = _fishingGearKg;
        data.microplasticKg   = _microplasticKg;
        data.lastUpdated      = block.timestamp;

        // --- Score computation (integer arithmetic, max 1000) ---

        // Volume score (40 points max): log10(kg+1)*40
        // Approximate log10 using bit-length heuristic (avoids floating point)
        uint256 volumeScore = _approxLog10Score(_totalKgRecovered);

        // Consistency score (30 points max): activeWeeks * 2.5, cap 30
        uint256 consistencyScore = uint256(_activeWeeks) * 25 / 10;
        if (consistencyScore > 30) consistencyScore = 30;

        // Diversity score (20 points max): min(stations, 5) / 5 * 20
        uint256 clampedStations = _uniqueStations > 5 ? 5 : _uniqueStations;
        uint256 diversityScore  = clampedStations * 4; // = clampedStations/5*20

        // Type score (10 points max): (fishingGear+micro) / totalKg * 10
        uint256 typeScore = 0;
        if (_totalKgRecovered > 0) {
            uint256 hardKg = _fishingGearKg + _microplasticKg;
            typeScore = (hardKg * 10) / _totalKgRecovered;
            if (typeScore > 10) typeScore = 10;
        }

        uint256 newScore = volumeScore + consistencyScore + diversityScore + typeScore;
        if (newScore > 1000) newScore = 1000;

        data.score = newScore;
        data.tier  = _computeTier(newScore);

        // Sync to CollectorRegistry
        collectorRegistry.updateReputation(_collector, newScore, data.tier);

        emit ReputationScoreUpdated(_collector, oldScore, newScore, data.tier);
    }

    /// @notice Batch update multiple collectors (gas-efficient weekly run)
    function batchUpdateReputation(
        address[] calldata _collectors,
        uint256[] calldata _totalKgs,
        uint8[]   calldata _uniqueStations,
        uint16[]  calldata _activeWeeks,
        uint256[] calldata _fishingGearKgs,
        uint256[] calldata _microplasticKgs
    ) external onlyAdminOrAgent {
        require(
            _collectors.length == _totalKgs.length &&
            _collectors.length == _uniqueStations.length &&
            _collectors.length == _activeWeeks.length,
            "Array length mismatch"
        );

        for (uint256 i = 0; i < _collectors.length; i++) {
            if (collectorRegistry.isCollectorActive(_collectors[i])) {
                this.updateReputation(
                    _collectors[i],
                    _totalKgs[i],
                    _uniqueStations[i],
                    _activeWeeks[i],
                    _fishingGearKgs[i],
                    _microplasticKgs[i]
                );
            }
        }
    }

    function getReputation(address _collector) external view returns (ReputationData memory) {
        return reputationData[_collector];
    }

    function getScore(address _collector) external view returns (uint256) {
        return reputationData[_collector].score;
    }

    function getTier(address _collector) external view returns (uint8) {
        return reputationData[_collector].tier;
    }

    /// @dev Payout multiplier in basis points: 10000 = 1.0x, 15000 = 1.5x
    function getPayoutMultiplierBps(address _collector) external view returns (uint256) {
        uint8 tier = reputationData[_collector].tier;
        if (tier == 0) return 10000;
        if (tier == 1) return 11000;
        if (tier == 2) return 12000;
        if (tier == 3) return 13500;
        return 15000; // tier 4
    }

    // ─── Internal helpers ──────────────────────────────────────────────────────

    function _computeTier(uint256 _score) internal pure returns (uint8) {
        if (_score >= TIER_4_MIN) return 4;
        if (_score >= TIER_3_MIN) return 3;
        if (_score >= TIER_2_MIN) return 2;
        if (_score >= TIER_1_MIN) return 1;
        return 0;
    }

    /// @dev Approximate log10(kg+1)*40, integer result, max 40.
    ///      Uses bit-length: log2(n) ≈ bitLen(n)-1, then log10 ≈ log2/3.32
    function _approxLog10Score(uint256 _kg) internal pure returns (uint256) {
        if (_kg == 0) return 0;
        uint256 n = _kg + 1;
        uint256 bitLen = 0;
        uint256 tmp = n;
        while (tmp > 0) { tmp >>= 1; bitLen++; }
        // log10 ≈ bitLen / 3.32.  Multiply by 40 → bitLen * 40 / 3.32 ≈ bitLen * 1205 / 100
        uint256 score = (bitLen * 1205) / 100;
        if (score > 40) score = 40;
        return score;
    }
}
