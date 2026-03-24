// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title CollectorRegistry
/// @notice Registers collectors with phone-hash anti-Sybil protection.
///         DID documents are anchored to HCS at registration.
///         Reputation scores and stats are updated by the ReputationOracle and Recovery Agent.
contract CollectorRegistry {
    struct Collector {
        address walletAddress;
        string  hederaAccountId;
        bytes32 phoneHash;
        string  zone;
        uint256 reputationScore;
        uint8   reputationTier;
        uint256 totalKgRecovered;
        uint256 totalHbarEarned;
        uint8   uniqueStationCount;
        uint16  activeWeeks;
        bool    isActive;
        uint256 registeredAt;
        uint256 didHcsSequence;
    }

    mapping(address => Collector)   public collectors;
    mapping(bytes32 => address)     public phoneHashToAddress;
    mapping(string => address)      public hederaIdToAddress;

    address[] public collectorAddresses;

    address public admin;
    address public recoveryAgent;
    address public reputationOracle;

    event CollectorRegistered(
        address indexed collectorAddress,
        string  hederaAccountId,
        bytes32 phoneHash,
        string  zone,
        uint256 didHcsSequence
    );

    event ReputationUpdated(
        address indexed collectorAddress,
        uint256 newScore,
        uint8   newTier
    );

    event CollectorBlacklisted(address indexed collectorAddress, string reason);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier onlyAuthorized() {
        require(
            msg.sender == admin ||
            msg.sender == recoveryAgent ||
            msg.sender == reputationOracle,
            "Not authorized"
        );
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function setRecoveryAgent(address _agent) external onlyAdmin {
        recoveryAgent = _agent;
    }

    function setReputationOracle(address _oracle) external onlyAdmin {
        reputationOracle = _oracle;
    }

    function registerCollector(
        string  memory _hederaAccountId,
        bytes32        _phoneHash,
        string  memory _zone,
        uint256        _didHcsSequence
    ) external {
        require(collectors[msg.sender].walletAddress == address(0), "Already registered");
        require(phoneHashToAddress[_phoneHash] == address(0),       "Phone already registered");
        require(hederaIdToAddress[_hederaAccountId] == address(0),  "Hedera ID already registered");

        collectors[msg.sender] = Collector({
            walletAddress:      msg.sender,
            hederaAccountId:    _hederaAccountId,
            phoneHash:          _phoneHash,
            zone:               _zone,
            reputationScore:    0,
            reputationTier:     0,
            totalKgRecovered:   0,
            totalHbarEarned:    0,
            uniqueStationCount: 0,
            activeWeeks:        0,
            isActive:           true,
            registeredAt:       block.timestamp,
            didHcsSequence:     _didHcsSequence
        });

        phoneHashToAddress[_phoneHash]     = msg.sender;
        hederaIdToAddress[_hederaAccountId] = msg.sender;
        collectorAddresses.push(msg.sender);

        emit CollectorRegistered(msg.sender, _hederaAccountId, _phoneHash, _zone, _didHcsSequence);
    }

    /// @notice Called by ReputationOracle or Recovery Agent to update on-chain reputation.
    function updateReputation(address _collector, uint256 _score, uint8 _tier) external onlyAuthorized {
        require(collectors[_collector].isActive, "Collector not active");
        collectors[_collector].reputationScore = _score;
        collectors[_collector].reputationTier  = _tier;
        emit ReputationUpdated(_collector, _score, _tier);
    }

    /// @notice Called by Recovery Agent after a verified attestation to update lifetime stats.
    function updateStats(address _collector, uint256 _kgRecovered, uint256 _hbarEarned) external onlyAuthorized {
        require(collectors[_collector].isActive, "Collector not active");
        collectors[_collector].totalKgRecovered += _kgRecovered;
        collectors[_collector].totalHbarEarned  += _hbarEarned;
    }

    /// @notice Blacklist a collector for confirmed fraud. Only admin.
    function blacklistCollector(address _collector, string memory _reason) external onlyAdmin {
        collectors[_collector].isActive = false;
        emit CollectorBlacklisted(_collector, _reason);
    }

    function getCollector(address _collector) external view returns (Collector memory) {
        return collectors[_collector];
    }

    function isCollectorActive(address _collector) external view returns (bool) {
        return collectors[_collector].isActive;
    }

    function getCollectorCount() external view returns (uint256) {
        return collectorAddresses.length;
    }

    function getCollectorByPhone(bytes32 _phoneHash) external view returns (address) {
        return phoneHashToAddress[_phoneHash];
    }
}
