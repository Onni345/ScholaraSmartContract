// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ScholaraDAO {

    /* 
        The Proposal struct represents the main piece that authors/reviewers/general users interact with. 
        It contains many useful things to delineate papers from one another, including a title, abstract,
        wallet address of the author. The wallet address being stored on the blockchain ledger guards against
        privacy and intellectual property concerns --the first to post a paper is forever immutably held 
        as an author. The ipfs hash is also important because it links our DAO to a public decentralized 
        data storage network using the interplanetary file system (IPFS). This lets any user read papers. The 
        proposal has yes and no votes and variables to show if it has been approved by reviewers, and if the
        DAO vote has been executed. It also has a timestamp and a dynamic mapping of all voters to see if the 
        DAO members have actually voted/contributed (address maps to a boolean).
    */

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

    /* Here we initialize the main variables of interest for a smart contract run. */

    address public owner;
    uint public quorum;
    mapping(address => bool) public reviewers;
    Proposal[] public proposals;
    mapping(string => uint) public ipfsToId;

    /* 
        Helper function MODIFIER to only allow reviewers of the DAO to vote on papers. Reviewers 
        represent supposed academia professionals. This is tagged along any functions that require
        some type of "administrative" access from a reviewer.
    */

    modifier onlyReviewer() {
        require(reviewers[msg.sender], "Not an authorized reviewer");

        /* 
            Inserts function logic of ANY function that uses this modifier below. Saves code space
            and is extremely scalable, as well as following Object Oriented Principles like abstraction.
            In the future if we change what constitutes a reviewer, we only need to change this method 
            and all methods using the modifier will change.
        */
        _;
    }

    /* 
        Sets up the DAO principles including a number of voters to be considered the 
        quorum (min number of yes votes). It iterates through all reviewers and intializes
        the voting body.
    */

    constructor(address[] memory _reviewers, uint _quorum) {
        owner = msg.sender;
        quorum = _quorum;

        /* 
            The for loop goes through and marks addresses that are reviewers from 
            the inputted parameter as true for the smart contract's own reviewer array.
        */

        for (uint i = 0; i < _reviewers.length; i++) {
            reviewers[_reviewers[i]] = true;
        }
    }

    /* 
        Submits a proposal with the minimum needed info. We first make a proposal that uses the storage
        keyword to create IMMUTABLE contract-level storage on the blockchain of a given proposal. This 
        proposal wont be deleted after this function ends. We then fill its fields with the inputted fields.
    */

    function submitProposal(string memory _title, string memory _summary, string memory _ipfsHash) public {
        Proposal storage prop = proposals.push();
        prop.title = _title;
        prop.abstractSummary = _summary;
        prop.ipfsHash = _ipfsHash;
        prop.author = msg.sender;

        /* Assigns value of timestamp to the global var of current time. */
        prop.timestamp = block.timestamp;

        /* 
            Matches and SETS a given ipfs (some arbitrary file) to a proposal id 
            (object rooted in the smart contract, and thus the DAO).
        */
        ipfsToId[_ipfsHash] = proposals.length - 1;
    }

    /*
        The vote function allows only reviewers to vote by the onlyReviewer
        function modifier, and then checks to see if they have not voted yet
        (uses a require statement to check). If they voted yes by the parameter,
        the proposal info changes to represent the yes vote. Vice versa for a no vote.
    */

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

    /*
        Execute proposal looks at the current vote and carries it through, pushing the paper onto 
        the blockchain or giving an error message if the vote failed/has already been executed/the 
        initial proposal was rejected.
    */

    function executeProposal(uint proposalId) public onlyReviewer {
        Proposal storage prop = proposals[proposalId];
        require(!prop.executed, "Already executed");

        require(prop.yesVotes > prop.noVotes, "Proposal rejected"); // ✅ flipped order
        require(prop.yesVotes >= quorum, "Not enough yes votes");

        prop.executed = true;
        prop.approved = true;
    }

    /*
        This returns proposal metadata for print functions in our command line interface, or future 
        frontend access (helps scalability and sustainability of the program). It stores most of the data
        using the memory keyword so that gas fees are NOT used. This saves blockchain time/resource efficiency
        for a simple frontend access method.
    */

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

    /*
        This allows our contract to receive ether directly without being through other functions
        later down the line if DAO members need to pay for special fees/stake to become reviewers
        by a new concensus mechanism. This is another effort of ours to improve scalability of our
        product.
    */

    receive() external payable {}
}
