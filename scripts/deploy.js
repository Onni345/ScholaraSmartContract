const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();


  const DAO = await hre.ethers.getContractFactory("ScholaraDAO");
  const reviewers = [deployer.address]; 
  const quorum = 2;

  const dao = await DAO.deploy(reviewers, quorum);
  await dao.waitForDeployment();
  console.log("DAO deployed to:", dao.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
