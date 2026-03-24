// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title StationRegistry
/// @notice Registers and manages Weighing Station operators.
///         Stations must stake 500 HBAR + pay 100 HBAR registration fee.
///         Admin approval required before a station becomes active.
///         Stake is slashed on confirmed fraud (15% → 50% → 100% + blacklist).
contract StationRegistry {
    struct Station {
        address   walletAddress;
        string    stationName;
        string    zone;
        int256    gpsLat;
        int256    gpsLng;
        string    facilityType;
        string[]  acceptedTypes;
        uint256   stakeAmount;
        StakeStatus stakeStatus;
        bytes32   calibrationCertHash;
        uint256   calibrationExpiry;
        uint256   attestationNonce;
        uint8     fraudStrikeCount;
        bool      isActive;
        uint256   approvedAt;
    }

    enum StakeStatus { Pending, Active, AtRisk, Slashed }

    mapping(address => Station) public stations;
    mapping(address => bool)    public approvedStations;
    address[] public stationAddresses;

    address public admin;
    address public recoveryAgent;

    uint256 public constant MINIMUM_STAKE    = 500 ether; // 500 HBAR
    uint256 public constant REGISTRATION_FEE = 100 ether; // 100 HBAR
    uint256 public constant ANNUAL_RENEWAL   =  50 ether; //  50 HBAR

    uint8   public constant MAX_FRAUD_STRIKES = 3;
    uint256[3] public SLASH_PERCENTAGES = [15, 50, 100]; // per-strike percentages

    event StationRegistered(address indexed stationAddress, string stationName, string zone);
    event StationApproved(address indexed stationAddress);
    event StakeSlashed(address indexed stationAddress, uint256 amount, uint8 strike, string reason);
    event StationBlacklisted(address indexed stationAddress);
    event CalibrationUpdated(address indexed stationAddress, bytes32 certHash, uint256 expiry);
    event AttestationNonceIncremented(address indexed stationAddress, uint256 newNonce);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier onlyAdminOrAgent() {
        require(msg.sender == admin || msg.sender == recoveryAgent, "Not authorized");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function setRecoveryAgent(address _agent) external onlyAdmin {
        recoveryAgent = _agent;
    }

    function registerStation(
        string   memory _stationName,
        string   memory _zone,
        int256          _gpsLat,
        int256          _gpsLng,
        string   memory _facilityType,
        string[] memory _acceptedTypes,
        bytes32         _calibrationCertHash,
        uint256         _calibrationExpiry
    ) external payable {
        require(stations[msg.sender].walletAddress == address(0), "Already registered");
        require(msg.value >= MINIMUM_STAKE + REGISTRATION_FEE, "Insufficient stake + fee");
        require(_calibrationExpiry > block.timestamp, "Calibration cert already expired");

        stations[msg.sender] = Station({
            walletAddress:       msg.sender,
            stationName:         _stationName,
            zone:                _zone,
            gpsLat:              _gpsLat,
            gpsLng:              _gpsLng,
            facilityType:        _facilityType,
            acceptedTypes:       _acceptedTypes,
            stakeAmount:         MINIMUM_STAKE,
            stakeStatus:         StakeStatus.Pending,
            calibrationCertHash: _calibrationCertHash,
            calibrationExpiry:   _calibrationExpiry,
            attestationNonce:    0,
            fraudStrikeCount:    0,
            isActive:            false,
            approvedAt:          0
        });

        stationAddresses.push(msg.sender);
        emit StationRegistered(msg.sender, _stationName, _zone);
    }

    /// @notice Admin-only: approve a station after physical verification.
    function approveStation(address _station) external onlyAdmin {
        require(stations[_station].walletAddress != address(0), "Station not registered");
        require(!stations[_station].isActive, "Already approved");

        stations[_station].isActive    = true;
        stations[_station].stakeStatus = StakeStatus.Active;
        stations[_station].approvedAt  = block.timestamp;
        approvedStations[_station]     = true;

        emit StationApproved(_station);
    }

    /// @notice Slash a station's stake on confirmed fraud. Called by admin or Recovery Agent.
    function slashStake(address _station, string memory _reason) external onlyAdminOrAgent {
        require(stations[_station].isActive, "Station not active");

        uint8 strike = stations[_station].fraudStrikeCount;
        uint256 slashPct = SLASH_PERCENTAGES[strike < 3 ? strike : 2];
        uint256 slashAmount = (stations[_station].stakeAmount * slashPct) / 100;

        stations[_station].stakeAmount    -= slashAmount;
        stations[_station].fraudStrikeCount++;

        emit StakeSlashed(_station, slashAmount, stations[_station].fraudStrikeCount, _reason);

        if (stations[_station].fraudStrikeCount >= MAX_FRAUD_STRIKES) {
            stations[_station].isActive    = false;
            stations[_station].stakeStatus = StakeStatus.Slashed;
            approvedStations[_station]     = false;
            emit StationBlacklisted(_station);
        }
    }

    /// @notice Station operator updates their calibration certificate annually.
    function updateCalibration(bytes32 _certHash, uint256 _expiry) external payable {
        require(stations[msg.sender].isActive, "Station not active");
        require(msg.value >= ANNUAL_RENEWAL, "Insufficient renewal fee");
        require(_expiry > block.timestamp, "Invalid expiry");

        stations[msg.sender].calibrationCertHash = _certHash;
        stations[msg.sender].calibrationExpiry   = _expiry;
        emit CalibrationUpdated(msg.sender, _certHash, _expiry);
    }

    /// @notice Increment attestation nonce to prevent replay attacks.
    function incrementNonce(address _station) external onlyAdminOrAgent {
        require(stations[_station].isActive, "Station not active");
        stations[_station].attestationNonce++;
        emit AttestationNonceIncremented(_station, stations[_station].attestationNonce);
    }

    /// @notice Returns true only when station is fully active, staked, and calibration is current.
    function isStationActive(address _station) external view returns (bool) {
        Station storage s = stations[_station];
        return s.isActive
            && s.stakeStatus == StakeStatus.Active
            && s.calibrationExpiry > block.timestamp
            && s.stakeAmount >= MINIMUM_STAKE;
    }

    function getStation(address _station) external view returns (Station memory) {
        return stations[_station];
    }

    function getStationCount() external view returns (uint256) {
        return stationAddresses.length;
    }
}
