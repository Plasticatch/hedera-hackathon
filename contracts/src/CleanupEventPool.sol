// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract CleanupEventPool {
    struct CleanupEvent {
        string eventId;
        address organizer;
        string eventName;
        string[] zones;
        uint256 startDate;
        uint256 endDate;
        uint256 targetKg;
        string description;
        address sponsor;
        string sponsorName;
        uint256 poolAmount;
        uint256 multiplier; // Stored as basis points (e.g., 1250 = 1.25x)
        uint256 totalKgCollected;
        uint256 collectorsParticipating;
        EventStatus status;
        uint256 hcsEventSequence;
        uint256 createdAt;
    }

    enum EventStatus { Upcoming, Active, Completed, Cancelled }

    mapping(string => CleanupEvent) public cleanupEvents;
    mapping(string => bool) public activeEvents;
    string[] public eventIds;
    
    uint256 public constant PLATFORM_FEE_BPS = 500; // 5%
    uint256 public constant MIN_POOL_AMOUNT = 50 ether; // 50 HBAR minimum

    event EventRegistered(
        string indexed eventId,
        address indexed organizer,
        string eventName,
        string[] zones,
        uint256 startDate,
        uint256 endDate
    );

    event EventSponsored(
        string indexed eventId,
        address indexed sponsor,
        string sponsorName,
        uint256 poolAmount,
        uint256 multiplier
    );

    event EventStarted(string indexed eventId, uint256 multiplier);
    event EventCompleted(
        string indexed eventId,
        uint256 totalKg,
        uint256 collectorCount,
        uint256 hbarDistributed
    );

    function registerEvent(
        string memory _eventId,
        string memory _eventName,
        string[] memory _zones,
        uint256 _startDate,
        uint256 _endDate,
        uint256 _targetKg,
        string memory _description
    ) external {
        require(bytes(cleanupEvents[_eventId].eventId).length == 0, "Event ID already exists");
        require(_startDate > block.timestamp, "Start date must be in future");
        require(_endDate > _startDate, "End date must be after start date");
        require(_endDate <= _startDate + 14 days, "Event duration max 14 days");

        cleanupEvents[_eventId] = CleanupEvent({
            eventId: _eventId,
            organizer: msg.sender,
            eventName: _eventName,
            zones: _zones,
            startDate: _startDate,
            endDate: _endDate,
            targetKg: _targetKg,
            description: _description,
            sponsor: address(0),
            sponsorName: "",
            poolAmount: 0,
            multiplier: 10000, // 1.0x default (10000 basis points)
            totalKgCollected: 0,
            collectorsParticipating: 0,
            status: EventStatus.Upcoming,
            hcsEventSequence: 0,
            createdAt: block.timestamp
        });

        eventIds.push(_eventId);

        emit EventRegistered(_eventId, msg.sender, _eventName, _zones, _startDate, _endDate);
    }

    function sponsorEvent(
        string memory _eventId,
        string memory _sponsorName,
        uint256 _expectedTotalPayout
    ) external payable {
        require(bytes(cleanupEvents[_eventId].eventId).length > 0, "Event does not exist");
        require(cleanupEvents[_eventId].status == EventStatus.Upcoming, "Event not in upcoming status");
        require(msg.value >= MIN_POOL_AMOUNT, "Pool amount too small");

        uint256 platformFee = (msg.value * PLATFORM_FEE_BPS) / 10000;
        uint256 netPoolAmount = msg.value - platformFee;

        // Calculate sustainable multiplier: 1 + (poolAmount / expectedTotalPayout)
        uint256 multiplier = 10000; // 1.0x base
        if (_expectedTotalPayout > 0) {
            multiplier += (netPoolAmount * 10000) / _expectedTotalPayout;
        }

        cleanupEvents[_eventId].sponsor = msg.sender;
        cleanupEvents[_eventId].sponsorName = _sponsorName;
        cleanupEvents[_eventId].poolAmount = netPoolAmount;
        cleanupEvents[_eventId].multiplier = multiplier;

        emit EventSponsored(_eventId, msg.sender, _sponsorName, netPoolAmount, multiplier);
    }

    function startEvent(string memory _eventId) external {
        require(bytes(cleanupEvents[_eventId].eventId).length > 0, "Event does not exist");
        require(block.timestamp >= cleanupEvents[_eventId].startDate, "Event not ready to start");
        require(cleanupEvents[_eventId].status == EventStatus.Upcoming, "Event already started");

        cleanupEvents[_eventId].status = EventStatus.Active;
        activeEvents[_eventId] = true;

        emit EventStarted(_eventId, cleanupEvents[_eventId].multiplier);
    }

    function completeEvent(
        string memory _eventId,
        uint256 _totalKgCollected,
        uint256 _collectorCount,
        uint256 _hbarDistributed
    ) external {
        require(bytes(cleanupEvents[_eventId].eventId).length > 0, "Event does not exist");
        require(cleanupEvents[_eventId].status == EventStatus.Active, "Event not active");
        require(
            block.timestamp >= cleanupEvents[_eventId].endDate || 
            msg.sender == cleanupEvents[_eventId].organizer,
            "Event not ready to complete"
        );

        cleanupEvents[_eventId].status = EventStatus.Completed;
        cleanupEvents[_eventId].totalKgCollected = _totalKgCollected;
        cleanupEvents[_eventId].collectorsParticipating = _collectorCount;
        activeEvents[_eventId] = false;

        emit EventCompleted(_eventId, _totalKgCollected, _collectorCount, _hbarDistributed);
    }

    function getEventMultiplier(string memory _eventId) external view returns (uint256) {
        if (!activeEvents[_eventId]) return 10000; // 1.0x if no active event
        return cleanupEvents[_eventId].multiplier;
    }

    function isEventActive(string memory _eventId) external view returns (bool) {
        return activeEvents[_eventId] && 
               block.timestamp >= cleanupEvents[_eventId].startDate &&
               block.timestamp <= cleanupEvents[_eventId].endDate;
    }

    function getEvent(string memory _eventId) external view returns (CleanupEvent memory) {
        return cleanupEvents[_eventId];
    }

    function getActiveEventsForZone(string memory _zone) external view returns (string[] memory) {
        string[] memory activeEventsInZone = new string[](eventIds.length);
        uint256 count = 0;

        for (uint256 i = 0; i < eventIds.length; i++) {
            string memory eventId = eventIds[i];
            if (activeEvents[eventId]) {
                string[] memory zones = cleanupEvents[eventId].zones;
                for (uint256 j = 0; j < zones.length; j++) {
                    if (keccak256(bytes(zones[j])) == keccak256(bytes(_zone))) {
                        activeEventsInZone[count] = eventId;
                        count++;
                        break;
                    }
                }
            }
        }

        // Resize array to actual count
        string[] memory result = new string[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = activeEventsInZone[i];
        }
        return result;
    }

    function getEventCount() external view returns (uint256) {
        return eventIds.length;
    }

    // Emergency functions
    function cancelEvent(string memory _eventId) external {
        require(
            msg.sender == cleanupEvents[_eventId].organizer || 
            msg.sender == cleanupEvents[_eventId].sponsor,
            "Not authorized"
        );
        require(cleanupEvents[_eventId].status != EventStatus.Completed, "Event already completed");

        cleanupEvents[_eventId].status = EventStatus.Cancelled;
        activeEvents[_eventId] = false;

        // Refund sponsor if event is cancelled
        if (cleanupEvents[_eventId].poolAmount > 0) {
            payable(cleanupEvents[_eventId].sponsor).transfer(cleanupEvents[_eventId].poolAmount);
        }
    }
}