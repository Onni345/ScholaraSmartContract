// test/ScholaraDAO.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ScholaraDAO", function () {
  let ScholaraDAO, dao, owner, author, reviewer1, reviewer2;

  beforeEach(async () => {
    [owner, author, reviewer1, reviewer2] = await ethers.getSigners();
    ScholaraDAO = await ethers.getContractFactory("ScholaraDAO");
    dao = await ScholaraDAO.deploy([reviewer1.address, reviewer2.address], 2);
    await dao.waitForDeployment();
  });

  it("should allow proposal submission by any account", async function () {
    const daoAsAuthor = dao.connect(author);
    await daoAsAuthor.submitProposal("Title A", "Summary A", "QmFakeHash1");
    const proposal = await dao.getProposal(0);
    expect(proposal.title).to.equal("Title A");
    expect(proposal.ipfsHash).to.equal("QmFakeHash1");
    expect(proposal.executed).to.equal(false);
  });

  it("should allow reviewers to vote on a proposal", async function () {
    await dao.connect(author).submitProposal("Title B", "Summary B", "QmFakeHash2");
    await dao.connect(reviewer1).vote(0, true);
    const proposal = await dao.getProposal(0);
    expect(proposal.yesVotes).to.equal(1);
    expect(proposal.noVotes).to.equal(0);
  });

  it("should not allow double voting from same reviewer", async function () {
    await dao.connect(author).submitProposal("Title C", "Summary C", "QmFakeHash3");
    await dao.connect(reviewer1).vote(0, true);
    await expect(
      dao.connect(reviewer1).vote(0, false)
    ).to.be.revertedWith("Already voted");
  });

  it("should execute a proposal when quorum is met with majority yes votes", async function () {
    await dao.connect(author).submitProposal("Title D", "Summary D", "QmFakeHash4");
    await dao.connect(reviewer1).vote(0, true);
    await dao.connect(reviewer2).vote(0, true);
    await dao.connect(reviewer1).executeProposal(0);
    const proposal = await dao.getProposal(0);
    expect(proposal.approved).to.equal(true);
    expect(proposal.executed).to.equal(true);
  });

  it("should not execute a proposal if not enough yes votes", async function () {
    await dao.connect(author).submitProposal("Title E", "Summary E", "QmFakeHash5");
    await dao.connect(reviewer1).vote(0, false);
    await dao.connect(reviewer2).vote(0, true);
    await expect(
      dao.connect(reviewer1).executeProposal(0)
    ).to.be.revertedWith("Proposal rejected");
  });

  it("should map IPFS hash to proposal ID", async function () {
    await dao.connect(author).submitProposal("Title F", "Summary F", "QmHashXYZ");
    const id = await dao.ipfsToId("QmHashXYZ");
    expect(id).to.equal(0);
  });
});