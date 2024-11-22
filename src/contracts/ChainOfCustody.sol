// SPDX-License-Identifier: MIT
pragma solidity ^0.5.0;

contract ChainOfCustody {
    enum EvidenceState { CHECKEDIN, CHECKEDOUT, REMOVED }
    enum RemovalReason { NONE, DISPOSED, DESTROYED, RELEASED }
    
    struct Evidence {
        string caseId;
        uint256 itemId;
        address creator;
        EvidenceState state;
        RemovalReason removalReason;
        string releasedTo;
        uint256 timestamp;
        bool exists;
    }
    
    struct Action {
        string caseId;
        uint256 itemId;
        EvidenceState state;
        address actor;
        uint256 timestamp;
        RemovalReason removalReason;
        string releasedTo;
    }
    
    mapping(uint256 => Evidence) public evidenceItems;
    Action[] public actions;
    mapping(string => bool) public cases;
    mapping(address => bool) public authorizedUsers;
    
    address public admin;
    
    event EvidenceAdded(string caseId, uint256 itemId, address creator);
    event EvidenceCheckedOut(uint256 itemId, address by);
    event EvidenceCheckedIn(uint256 itemId, address by);
    event EvidenceRemoved(uint256 itemId, RemovalReason reason, string releasedTo);
    
    constructor() public {
        admin = msg.sender;
        authorizedUsers[msg.sender] = true;
    }
    
    modifier onlyAuthorized() {
        require(authorizedUsers[msg.sender], "Not authorized");
        _;
    }
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    function addAuthorizedUser(address user) public onlyAdmin {
        authorizedUsers[user] = true;
    }
    
    function removeAuthorizedUser(address user) public onlyAdmin {
        require(user != admin, "Cannot remove admin");
        authorizedUsers[user] = false;
    }
    
    function addEvidence(string memory caseId, uint256 itemId) public onlyAuthorized {
        require(!evidenceItems[itemId].exists, "Evidence already exists");
        
        Evidence memory newEvidence = Evidence({
            caseId: caseId,
            itemId: itemId,
            creator: msg.sender,
            state: EvidenceState.CHECKEDIN,
            removalReason: RemovalReason.NONE,
            releasedTo: "",
            timestamp: now,
            exists: true
        });
        
        evidenceItems[itemId] = newEvidence;
        cases[caseId] = true;
        
        actions.push(Action({
            caseId: caseId,
            itemId: itemId,
            state: EvidenceState.CHECKEDIN,
            actor: msg.sender,
            timestamp: now,
            removalReason: RemovalReason.NONE,
            releasedTo: ""
        }));
        
        emit EvidenceAdded(caseId, itemId, msg.sender);
    }
    
    function checkoutEvidence(uint256 itemId) public onlyAuthorized {
        require(evidenceItems[itemId].exists, "Evidence does not exist");
        require(evidenceItems[itemId].state == EvidenceState.CHECKEDIN, "Evidence must be checked in");
        
        evidenceItems[itemId].state = EvidenceState.CHECKEDOUT;
        evidenceItems[itemId].timestamp = now;
        
        actions.push(Action({
            caseId: evidenceItems[itemId].caseId,
            itemId: itemId,
            state: EvidenceState.CHECKEDOUT,
            actor: msg.sender,
            timestamp: now,
            removalReason: RemovalReason.NONE,
            releasedTo: ""
        }));
        
        emit EvidenceCheckedOut(itemId, msg.sender);
    }
    
    function checkinEvidence(uint256 itemId) public onlyAuthorized {
        require(evidenceItems[itemId].exists, "Evidence does not exist");
        require(evidenceItems[itemId].state == EvidenceState.CHECKEDOUT, "Evidence must be checked out");
        
        evidenceItems[itemId].state = EvidenceState.CHECKEDIN;
        evidenceItems[itemId].timestamp = now;
        
        actions.push(Action({
            caseId: evidenceItems[itemId].caseId,
            itemId: itemId,
            state: EvidenceState.CHECKEDIN,
            actor: msg.sender,
            timestamp: now,
            removalReason: RemovalReason.NONE,
            releasedTo: ""
        }));
        
        emit EvidenceCheckedIn(itemId, msg.sender);
    }
    
    function removeEvidence(
        uint256 itemId, 
        RemovalReason reason,
        string memory releasedTo
    ) public onlyAuthorized {
        require(evidenceItems[itemId].exists, "Evidence does not exist");
        require(evidenceItems[itemId].state == EvidenceState.CHECKEDIN, "Evidence must be checked in");
        require(evidenceItems[itemId].creator == msg.sender, "Only creator can remove evidence");
        require(reason != RemovalReason.NONE, "Must provide valid removal reason");
        
        if (reason == RemovalReason.RELEASED) {
            require(bytes(releasedTo).length > 0, "Must provide release recipient");
        }
        
        evidenceItems[itemId].state = EvidenceState.REMOVED;
        evidenceItems[itemId].removalReason = reason;
        evidenceItems[itemId].releasedTo = releasedTo;
        evidenceItems[itemId].timestamp = now;
        
        actions.push(Action({
            caseId: evidenceItems[itemId].caseId,
            itemId: itemId,
            state: EvidenceState.REMOVED,
            actor: msg.sender,
            timestamp: now,
            removalReason: reason,
            releasedTo: releasedTo
        }));
        
        emit EvidenceRemoved(itemId, reason, releasedTo);
    }
    
    function getEvidenceHistory(uint256 itemId) public view returns (
        string[] memory caseIds,
        uint256[] memory itemIds,
        EvidenceState[] memory states,
        address[] memory actors,
        uint256[] memory timestamps,
        RemovalReason[] memory reasons,
        string[] memory releasedTos
    ) {
        uint count = 0;
        for(uint i = 0; i < actions.length; i++) {
            if(actions[i].itemId == itemId) {
                count++;
            }
        }
        
        caseIds = new string[](count);
        itemIds = new uint256[](count);
        states = new EvidenceState[](count);
        actors = new address[](count);
        timestamps = new uint256[](count);
        reasons = new RemovalReason[](count);
        releasedTos = new string[](count);
        
        uint index = 0;
        for(uint i = 0; i < actions.length; i++) {
            if(actions[i].itemId == itemId) {
                caseIds[index] = actions[i].caseId;
                itemIds[index] = actions[i].itemId;
                states[index] = actions[i].state;
                actors[index] = actions[i].actor;
                timestamps[index] = actions[i].timestamp;
                reasons[index] = actions[i].removalReason;
                releasedTos[index] = actions[i].releasedTo;
                index++;
            }
        }
        return (caseIds, itemIds, states, actors, timestamps, reasons, releasedTos);
    }
    
    function getCases() public view returns (string[] memory) {
        uint count = 0;
        string[] memory allCases = new string[](1000); // Arbitrary limit
        
        for(uint i = 0; i < actions.length; i++) {
            if(!stringExists(allCases, actions[i].caseId, count)) {
                allCases[count] = actions[i].caseId;
                count++;
            }
        }
        
        string[] memory result = new string[](count);
        for(uint i = 0; i < count; i++) {
            result[i] = allCases[i];
        }
        
        return result;
    }
    
    function stringExists(string[] memory arr, string memory value, uint count) private pure returns (bool) {
        for(uint i = 0; i < count; i++) {
            if(keccak256(bytes(arr[i])) == keccak256(bytes(value))) {
                return true;
            }
        }
        return false;
    }
}