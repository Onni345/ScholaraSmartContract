// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ScholaraDAO {
    struct Proposal {
        string title;
        string abstractSummary;
        string ipfsHash;
        address author;
        uint yesVotes;
        uint noVotes;
        bool approved;
        bool executed;
        uint timestamp;
        mapping(address => bool) voters;
    }

    address public owner;
    uint public quorum;
    mapping(address => bool) public reviewers;
    Proposal[] public proposals;
    mapping(string => uint) public ipfsToId;

    modifier onlyReviewer() {
        require(reviewers[msg.sender], "Not an authorized reviewer");
        _;
    }

    constructor(address[] memory _reviewers, uint _quorum) {
        owner = msg.sender;
        quorum = _quorum;
        for (uint i = 0; i < _reviewers.length; i++) {
            reviewers[_reviewers[i]] = true;
        }
    }

    function submitProposal(string memory _title, string memory _summary, string memory _ipfsHash) public {
        Proposal storage prop = proposals.push();
        prop.title = _title;
        prop.abstractSummary = _summary;
        prop.ipfsHash = _ipfsHash;
        prop.author = msg.sender;
        prop.timestamp = block.timestamp;
        ipfsToId[_ipfsHash] = proposals.length - 1;
    }

    function vote(uint proposalId, bool support) public onlyReviewer {
        Proposal storage prop = proposals[proposalId];
        require(!prop.voters[msg.sender], "Already voted");
        prop.voters[msg.sender] = true;
        if (support) {
            prop.yesVotes++;
        } else {
            prop.noVotes++;
        }
    }

    function executeProposal(uint proposalId) public onlyReviewer {
        Proposal storage prop = proposals[proposalId];
        require(!prop.executed, "Already executed");
        require(prop.yesVotes >= quorum, "Not enough yes votes");
        require(prop.yesVotes > prop.noVotes, "Proposal rejected");
        prop.executed = true;
        prop.approved = true;
    }

    function getProposal(uint id) public view returns (
        string memory title,
        string memory summary,
        string memory ipfsHash,
        address author,
        uint yesVotes,
        uint noVotes,
        bool approved,
        bool executed,
        uint timestamp
    ) {
        Proposal storage p = proposals[id];
        return (
            p.title,
            p.abstractSummary,
            p.ipfsHash,
            p.author,
            p.yesVotes,
            p.noVotes,
            p.approved,
            p.executed,
            p.timestamp
        );
    }

    receive() external payable {}
}
