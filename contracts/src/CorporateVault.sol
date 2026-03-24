// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./PRCToken.sol";

/// @title CorporateVault
/// @notice Manages corporate buyer registration, PRC purchases, retirements,
///         and the protocol payment pool that funds collector HBAR payouts.
///         Protocol split (per spec §12.1):
///           - 50% of PRC revenue → payment pool (collector payouts)
///           - 13.5% → protocol treasury
///           - 36.5% → payment pool reserve buffer
contract CorporateVault {
    struct CorporateBuyer {
        address walletAddress;
        string companyName;
        string industry;
        string contactEmail;
        string registrationNumber;
        uint256 totalPrcsOwned;
        uint256 totalPrcsRetired;
        uint256 totalHbarSpent;
        uint256 collectorsSupported;
        bool isActive;
        uint256 registeredAt;
    }

    mapping(address => CorporateBuyer) public corporateBuyers;
    address[] public buyerAddresses;

    PRCToken public prcToken;
    address public admin;
    address public recoveryAgent;

    uint256 public constant REGISTRATION_FEE = 50 ether;    // 50 HBAR one-time
    uint256 public constant DEFAULT_PRC_PRICE = 1.1 ether;  // 1.1 HBAR per PRC (average)
    uint256 public constant POOL_SHARE_BPS    = 8650;        // 86.5% to payment pool reserve
    uint256 public constant TREASURY_SHARE_BPS = 1350;       // 13.5% to treasury

    uint256 public paymentPool;   // HBAR available to pay collectors
    uint256 public treasury;      // Protocol treasury balance

    event CorporateBuyerRegistered(
        address indexed buyerAddress,
        string companyName,
        string industry
    );

    event PRCPurchased(
        address indexed buyer,
        string companyName,
        uint256 prcsBought,
        uint256 hbarPaid
    );

    event PaymentPoolDeposit(uint256 amount);
    event CollectorPaid(address indexed collector, uint256 amount, string attestationId);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier onlyAdminOrAgent() {
        require(msg.sender == admin || msg.sender == recoveryAgent, "Not authorized");
        _;
    }

    constructor(address _prcToken) {
        prcToken = PRCToken(_prcToken);
        admin = msg.sender;
    }

    function setRecoveryAgent(address _agent) external onlyAdmin {
        recoveryAgent = _agent;
    }

    function registerCorporateBuyer(
        string memory _companyName,
        string memory _industry,
        string memory _contactEmail,
        string memory _registrationNumber
    ) external payable {
        require(corporateBuyers[msg.sender].walletAddress == address(0), "Already registered");
        require(msg.value >= REGISTRATION_FEE, "Insufficient registration fee");

        corporateBuyers[msg.sender] = CorporateBuyer({
            walletAddress: msg.sender,
            companyName: _companyName,
            industry: _industry,
            contactEmail: _contactEmail,
            registrationNumber: _registrationNumber,
            totalPrcsOwned: 0,
            totalPrcsRetired: 0,
            totalHbarSpent: 0,
            collectorsSupported: 0,
            isActive: true,
            registeredAt: block.timestamp
        });

        // Registration fee goes to treasury
        treasury += msg.value;
        buyerAddresses.push(msg.sender);
        emit CorporateBuyerRegistered(msg.sender, _companyName, _industry);
    }

    function purchasePRCs(uint256 _prcAmount) external payable {
        require(corporateBuyers[msg.sender].isActive, "Buyer not registered");
        require(_prcAmount > 0, "Invalid amount");

        uint256 totalPrice = (_prcAmount * DEFAULT_PRC_PRICE) / 1000; // /1000 because PRC has 3 decimals (gram granularity)
        require(msg.value >= totalPrice, "Insufficient payment");

        // Transfer PRCs from vault to buyer
        prcToken.transfer(msg.sender, _prcAmount);

        // Split revenue: 86.5% to payment pool, 13.5% to treasury
        uint256 toTreasury = (msg.value * TREASURY_SHARE_BPS) / 10000;
        uint256 toPool     = msg.value - toTreasury;

        paymentPool += toPool;
        treasury    += toTreasury;

        corporateBuyers[msg.sender].totalPrcsOwned  += _prcAmount;
        corporateBuyers[msg.sender].totalHbarSpent  += msg.value;

        emit PRCPurchased(msg.sender, corporateBuyers[msg.sender].companyName, _prcAmount, msg.value);
        emit PaymentPoolDeposit(toPool);
    }

    function retirePRCs(uint256 _amount, string memory _reportRef) external {
        require(corporateBuyers[msg.sender].isActive, "Buyer not registered");
        require(prcToken.getBalance(msg.sender) >= _amount, "Insufficient PRCs");

        prcToken.retire(_amount, corporateBuyers[msg.sender].companyName, _reportRef);

        corporateBuyers[msg.sender].totalPrcsOwned   -= _amount;
        corporateBuyers[msg.sender].totalPrcsRetired += _amount;
    }

    /// @notice Called by Recovery Agent to pay a collector after attestation verification.
    /// @dev In production this triggers a Hedera Scheduled Transaction; this function
    ///      records the pool deduction and emits the audit event.
    function triggerCollectorPayment(
        address _collector,
        uint256 _amountTinybar,
        string calldata _attestationId
    ) external onlyAdminOrAgent {
        require(paymentPool >= _amountTinybar, "Insufficient pool balance");
        paymentPool -= _amountTinybar;

        // In Hedera EVM, native token transfers use: payable(_collector).transfer(...)
        // For testnet demo, the actual transfer uses Hedera Scheduled Transactions off-chain.
        payable(_collector).transfer(_amountTinybar);

        emit CollectorPaid(_collector, _amountTinybar, _attestationId);
    }

    function getPaymentPoolBalance() external view returns (uint256) {
        return paymentPool;
    }

    function getTreasuryBalance() external view returns (uint256) {
        return treasury;
    }

    function getCorporateBuyer(address _buyer) external view returns (CorporateBuyer memory) {
        return corporateBuyers[_buyer];
    }

    function getBuyerCount() external view returns (uint256) {
        return buyerAddresses.length;
    }

    /// @notice Check payment pool health. Healthy = pool covers 30+ days of payouts.
    function checkPaymentPoolHealth(uint256 _dailyPayoutEstimate)
        external view returns (bool isHealthy, uint256 daysRemaining)
    {
        if (_dailyPayoutEstimate == 0) return (true, type(uint256).max);
        daysRemaining = paymentPool / _dailyPayoutEstimate;
        isHealthy     = daysRemaining >= 30;
    }

    receive() external payable {
        paymentPool += msg.value;
        emit PaymentPoolDeposit(msg.value);
    }
}
