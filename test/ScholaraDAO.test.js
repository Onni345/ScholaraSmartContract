const { expect } = require("chai");
const { ethers } = require("hardhat");

/* 
    This is the Hardhat testing suite for ScholaraDAO. It rigorously verifies DAO logic
    under various usage scenarios including proposal submission, voting, and execution.
    We simulate both authors and reviewers using local signers. The tests follow the full
    smart contract lifecycle and help maintain contract invariants.
*/

describe("ScholaraDAO", function () {
  let ScholaraDAO, dao, owner, author, reviewer1, reviewer2, externalUser;

  beforeEach(async () => {
    /*
        Deploy a fresh ScholaraDAO instance before each test. We create 5 test accounts:
        - owner: contract deployer (unused in access control in current version)
        - author: proposer of papers (non-reviewer)
        - reviewer1 and reviewer2: registered reviewers who can vote and execute
        - externalUser: unregistered account to test access restrictions
    */
    [owner, author, reviewer1, reviewer2, externalUser] = await ethers.getSigners();
    ScholaraDAO = await ethers.getContractFactory("ScholaraDAO");
    dao = await ScholaraDAO.deploy([reviewer1.address, reviewer2.address], 2);
    await dao.waitForDeployment();
  });

  it("should allow a non-reviewer (author) to submit a proposal", async function () {
    /*
        Verifies that any account (even if not a reviewer) can submit a proposal
        to the DAO. Confirms title and IPFS hash are recorded properly.
    */
    const daoAsAuthor = dao.connect(author);
    await daoAsAuthor.submitProposal("Quantum Paper", "Quantum summary", "QmQuantumHash");
    const proposal = await dao.getProposal(0);
    expect(proposal.title).to.equal("Quantum Paper");
    expect(proposal.ipfsHash).to.equal("QmQuantumHash");
  });

  it("should revert if a non-reviewer attempts to vote", async function () {
    /*
        Ensures that voting is restricted to authorized reviewers only. Here,
        the author attempts to vote and is rejected by the onlyReviewer modifier.
    */
    await dao.connect(author).submitProposal("Title", "Summary", "QmHashA");
    await expect(dao.connect(author).vote(0, true)).to.be.revertedWith("Not an authorized reviewer");
  });

  it("should revert if a reviewer tries to execute before quorum is reached", async function () {
    /*
        Reviewer tries to execute a proposal after only 1 yes vote,
        which does not satisfy the quorum of 2. It should fail gracefully.
    */
    await dao.connect(author).submitProposal("Title", "Summary", "QmHashB");
    await dao.connect(reviewer1).vote(0, true);
    await expect(dao.connect(reviewer1).executeProposal(0)).to.be.revertedWith("Not enough yes votes");
  });

  it("should allow mixed votes but fail execution if not majority", async function () {
    /*
        Tests that even if quorum is reached, a proposal cannot be executed
        if the yesVotes are not in the majority over noVotes. Execution must fail.
    */
    await dao.connect(author).submitProposal("Mixed", "Summary", "QmHashMixed");
    await dao.connect(reviewer1).vote(0, true);
    await dao.connect(reviewer2).vote(0, false);
    await expect(dao.connect(reviewer1).executeProposal(0)).to.be.revertedWith("Proposal rejected");
  });

  it("should prevent double execution of a proposal", async function () {
    /*
        Tests execution finality. Once a proposal is executed, further execution
        attempts should be rejected to preserve DAO consistency.
    */
    await dao.connect(author).submitProposal("Executable", "Summary", "QmExecHash");
    await dao.connect(reviewer1).vote(0, true);
    await dao.connect(reviewer2).vote(0, true);
    await dao.connect(reviewer1).executeProposal(0);

    const proposal = await dao.getProposal(0);
    expect(proposal.executed).to.equal(true);
    expect(proposal.approved).to.equal(true);

    await expect(
      dao.connect(reviewer2).executeProposal(0)
    ).to.be.revertedWith("Already executed");
  });

  it("should correctly track yes/no vote counts", async function () {
    /*
        Validates that vote counts for yes and no are updated correctly
        in response to reviewer voting actions.
    */
    await dao.connect(author).submitProposal("Voting", "Details", "QmVoteHash");
    await dao.connect(reviewer1).vote(0, true);
    await dao.connect(reviewer2).vote(0, false);
    const proposal = await dao.getProposal(0);
    expect(proposal.yesVotes).to.equal(1);
    expect(proposal.noVotes).to.equal(1);
  });

  it("should map IPFS hash to correct proposal index", async function () {
    /*
        Ensures the DAO creates a reverse lookup: given an IPFS hash,
        we can retrieve the corresponding proposal ID using ipfsToId mapping.
    */
    await dao.connect(author).submitProposal("Paper", "Info", "QmPaperHash");
    const id = await dao.ipfsToId("QmPaperHash");
    expect(id).to.equal(0);
  });

  it("should store correct author address", async function () {
    /*
        Validates that the address of the proposer (author) is recorded
        accurately inside the proposal struct for traceability.
    */
    await dao.connect(author).submitProposal("Paper", "Info", "QmPaperHash2");
    const proposal = await dao.getProposal(0);
    expect(proposal.author).to.equal(author.address);
  });

  it("should not allow empty or duplicate IPFS hash (optional extension test)", async function () {
    /*
        Placeholder for an extension. Currently allows duplicate IPFS hashes,
        but this test anticipates a future upgrade to prevent duplicates.
    */
    await dao.connect(author).submitProposal("Original", "Desc", "QmUnique");
    await expect(
      dao.connect(author).submitProposal("Duplicate", "Desc", "QmUnique")
    ).to.not.be.reverted;
  });

  it("should allow multiple proposals and track them independently", async function () {
    /*
        Confirms that proposals are tracked independently and do not overwrite
        each other’s data. Also verifies IPFS-to-ID mapping for multiple entries.
    */
    await dao.connect(author).submitProposal("Paper 1", "Summary 1", "Hash1");
    await dao.connect(author).submitProposal("Paper 2", "Summary 2", "Hash2");

    const p1 = await dao.getProposal(0);
    const p2 = await dao.getProposal(1);

    expect(p1.title).to.equal("Paper 1");
    expect(p2.title).to.equal("Paper 2");
    expect(await dao.ipfsToId("Hash2")).to.equal(1);
  });

  it("should store timestamps at submission time", async function () {
    /*
        Uses Hardhat's internal block timestamps to verify that the proposal
        timestamp matches the block in which the transaction was mined.
        This avoids issues with Date.now() time drift between JS and EVM.
    */
    const daoAsAuthor = dao.connect(author);
  
    const blockBefore = await ethers.provider.getBlock("latest");
    const before = blockBefore.timestamp;
  
    const tx = await daoAsAuthor.submitProposal("Timed Paper", "Summary", "QmTimeHash");
    const receipt = await tx.wait();
  
    const blockAfter = await ethers.provider.getBlock(receipt.blockNumber);
    const after = blockAfter.timestamp;
  
    const proposal = await dao.getProposal(0);
    const ts = Number(proposal.timestamp);
    
    expect(ts).to.be.gte(before); // should not be before tx submission block
    expect(ts).to.be.lte(after);  // should not be after tx mined block
  });
});
