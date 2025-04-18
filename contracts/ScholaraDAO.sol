// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ScholaraToken is ERC20, Ownable {
    constructor(address initialOwner) ERC20("Scholara Token", "SCHLR") Ownable(initialOwner) {
        _mint(initialOwner, 1_000_000 * 10 ** decimals());
    }
}


contract ScholaraDAO {
    ScholaraToken public token;
    uint256 public paperCounter;
    uint256 public stakeAmount = 100 * 10 ** 18;

    struct Paper {
        string ipfsHash;
        string metadata;
        uint256 votesFor;
        uint256 votesAgainst;
        bool published;
        address submitter;
        mapping(address => bool) voted;
    }

    mapping(uint256 => Paper) public papers;

    event PaperSubmitted(uint256 paperId, address submitter, string ipfsHash);
    event Voted(uint256 paperId, address voter, bool support);
    event RewardsDistributed(uint256 paperId, bool published);

    constructor(address _tokenAddress) {
        token = ScholaraToken(_tokenAddress);
    }

    function submitPaper(string memory ipfsHash, string memory metadata) external returns (uint256) {
        paperCounter++;
        Paper storage p = papers[paperCounter];
        p.ipfsHash = ipfsHash;
        p.metadata = metadata;
        p.submitter = msg.sender;

        emit PaperSubmitted(paperCounter, msg.sender, ipfsHash);
        return paperCounter;
    }

    function stakeAndVote(uint256 paperId, bool support) external {
        Paper storage p = papers[paperId];
        require(!p.voted[msg.sender], "Already voted");
        require(!p.published, "Paper already published");

        // Stake tokens
        token.transferFrom(msg.sender, address(this), stakeAmount);

        // Record vote
        if (support) {
            p.votesFor += 1;
        } else {
            p.votesAgainst += 1;
        }

        p.voted[msg.sender] = true;
        emit Voted(paperId, msg.sender, support);
    }

    function distributeRewards(uint256 paperId) external {
        Paper storage p = papers[paperId];
        require(!p.published, "Already finalized");

        if (p.votesFor > p.votesAgainst) {
            p.published = true;
            // Simple reward to submitter
            token.transfer(p.submitter, 200 * 10 ** 18);
        }

        emit RewardsDistributed(paperId, p.published);
    }

    // Optional: Oracle placeholder for plagiarism check
    function checkPlagiarismOracle(uint256 paperId) public view returns (bool) {
        // Future integration with Chainlink oracle
        return true;
    }

    // Optional: Merkle proof placeholder
    function verifyEligibility(bytes32[] memory proof, bytes32 root) public pure returns (bool) {
        // To be implemented: Merkle Tree Proof check
        return true;
    }
}
