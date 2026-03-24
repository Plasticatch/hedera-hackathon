// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./CollectorRegistry.sol";
import "./StationRegistry.sol";

/// @title PRCToken
/// @notice HTS-compatible Fungible Token implementation for Plastic Recovery Credits.
///         1 PRC = 1 verified kilogram of ocean plastic removed.
///         Token has 3 decimal places → 0.001 PRC = 1 gram minimum granularity.
///         Provenance metadata for every batch is stored on-chain + anchored to HCS.
contract PRCToken {
    struct PRCBatch {
        string   attestationId;
        address  collectorId;
        address  stationId;
        string   zone;
        string   plasticType;
        uint256  weightGrams;
        uint256  payoutTinybar;
        uint256  hcsSequence;
        uint256  mintedAt;
        string   vintage;
    }

    struct RetirementCertificate {
        string    certId;
        address   company;
        string    companyName;
        string    reportRef;
        uint256   totalKgRetired;
        string[]  attestationIds;
        uint256   collectorsSupported;
        uint256   hbarPaidToCollectors;
        uint256   retiredAt;
        uint256   hcsSequence;
    }

    mapping(string => PRCBatch) public prcBatches;
    mapping(address => uint256) public balances;
    mapping(string => RetirementCertificate) public retirementCerts;

    address public admin;
    address public recoveryAgent;
    address public prcVault;
    CollectorRegistry public collectorRegistry;
    StationRegistry   public stationRegistry;

    uint256 public totalSupply;
    uint256 public totalRetired;
    uint256 private _certNonce;

    string[] public batchIds;
    string[] public retirementCertIds;

    event PRCMinted(
        string  indexed attestationId,
        address indexed collector,
        address indexed station,
        uint256 amount,
        string  plasticType,
        string  zone
    );

    event PRCRetired(
        address indexed company,
        string  companyName,
        uint256 amount,
        string  certId,
        string  reportRef
    );

    event PRCTransfer(address indexed from, address indexed to, uint256 amount);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier onlyAdminOrAgent() {
        require(msg.sender == admin || msg.sender == recoveryAgent, "Not authorized");
        _;
    }

    constructor(
        address _collectorRegistry,
        address _stationRegistry,
        address _prcVault
    ) {
        collectorRegistry = CollectorRegistry(_collectorRegistry);
        stationRegistry   = StationRegistry(_stationRegistry);
        prcVault          = _prcVault;
        admin             = msg.sender;
    }

    function setRecoveryAgent(address _agent) external onlyAdmin {
        recoveryAgent = _agent;
    }

    /// @notice Mint PRCs for a verified recovery attestation.
    ///         Called exclusively by the Recovery Agent after 5-check pipeline passes.
    function mintRecovery(
        string  memory _attestationId,
        address _collectorId,
        address _stationId,
        string  memory _plasticType,
        uint256 _weightGrams,
        string  memory _zoneId,
        uint256 _payoutTinybar,
        uint256 _hcsSequence
    ) external onlyAdminOrAgent {
        require(collectorRegistry.isCollectorActive(_collectorId), "Collector not active");
        require(stationRegistry.isStationActive(_stationId),       "Station not active");
        require(_weightGrams > 0,                                   "Invalid weight");
        require(bytes(prcBatches[_attestationId].attestationId).length == 0, "Batch already exists");

        // 1 gram = 1 token unit (3 decimal places → 1000 units = 1 PRC)
        uint256 prcAmount = _weightGrams;
        string memory vintage = _getVintage();

        prcBatches[_attestationId] = PRCBatch({
            attestationId:  _attestationId,
            collectorId:    _collectorId,
            stationId:      _stationId,
            zone:           _zoneId,
            plasticType:    _plasticType,
            weightGrams:    _weightGrams,
            payoutTinybar:  _payoutTinybar,
            hcsSequence:    _hcsSequence,
            mintedAt:       block.timestamp,
            vintage:        vintage
        });

        balances[prcVault] += prcAmount;
        totalSupply        += prcAmount;
        batchIds.push(_attestationId);

        emit PRCMinted(_attestationId, _collectorId, _stationId, prcAmount, _plasticType, _zoneId);
    }

    /// @notice Retire (burn) PRCs — called by corporate buyers to claim offset credit.
    ///         Mints a Retirement Certificate and anchors to HCS.
    function retire(
        uint256 _amount,
        string  memory _companyName,
        string  memory _reportRef
    ) external returns (string memory certId) {
        require(balances[msg.sender] >= _amount, "Insufficient PRC balance");

        certId = _generateCertId(_companyName);

        balances[msg.sender] -= _amount;
        totalRetired         += _amount;

        retirementCerts[certId] = RetirementCertificate({
            certId:               certId,
            company:              msg.sender,
            companyName:          _companyName,
            reportRef:            _reportRef,
            totalKgRetired:       _amount / 1000, // grams → kg
            attestationIds:       new string[](0),
            collectorsSupported:  0,
            hbarPaidToCollectors: 0,
            retiredAt:            block.timestamp,
            hcsSequence:          0 // Set by off-chain HCS anchoring
        });

        retirementCertIds.push(certId);

        emit PRCRetired(msg.sender, _companyName, _amount, certId, _reportRef);
        return certId;
    }

    function transfer(address _to, uint256 _amount) external {
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        balances[msg.sender] -= _amount;
        balances[_to]        += _amount;
        emit PRCTransfer(msg.sender, _to, _amount);
    }

    function getBalance(address _account) external view returns (uint256) {
        return balances[_account];
    }

    function getAvailablePRCs() external view returns (uint256) {
        return balances[prcVault];
    }

    function getPRCBatch(string memory _attestationId) external view returns (PRCBatch memory) {
        return prcBatches[_attestationId];
    }

    function getRetirementCert(string memory _certId) external view returns (RetirementCertificate memory) {
        return retirementCerts[_certId];
    }

    function getBatchCount() external view returns (uint256) {
        return batchIds.length;
    }

    function getRetirementCount() external view returns (uint256) {
        return retirementCertIds.length;
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    function _getVintage() internal view returns (string memory) {
        // Derive year from block.timestamp (seconds since Unix epoch)
        uint256 year = 1970 + block.timestamp / 365.25 days;
        return _uint2str(year);
    }

    /// @dev Generate a unique certificate ID:  PC-{YEAR}-CORP-{NONCE:04}
    function _generateCertId(string memory /*_companyName*/) internal returns (string memory) {
        _certNonce++;
        uint256 year = 1970 + block.timestamp / 365.25 days;
        return string(
            abi.encodePacked(
                "PC-",
                _uint2str(year),
                "-CORP-",
                _pad4(_certNonce)
            )
        );
    }

    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) return "0";
        uint256 j = _i;
        uint256 len;
        while (j != 0) { len++; j /= 10; }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) { k--; bstr[k] = bytes1(uint8(48 + _i % 10)); _i /= 10; }
        return string(bstr);
    }

    function _pad4(uint256 _n) internal pure returns (string memory) {
        string memory s = _uint2str(_n);
        bytes memory b = bytes(s);
        if (b.length >= 4) return s;
        bytes memory padded = new bytes(4);
        for (uint256 i = 0; i < 4 - b.length; i++) padded[i] = "0";
        for (uint256 i = 0; i < b.length; i++) padded[4 - b.length + i] = b[i];
        return string(padded);
    }
}
