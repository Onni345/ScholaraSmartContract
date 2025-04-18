const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  const Token = await hre.ethers.getContractFactory("ScholaraToken");
  const token = await Token.deploy(deployer.address);
  await token.waitForDeployment();
  console.log("Token deployed to:", token.target);

  const DAO = await hre.ethers.getContractFactory("ScholaraDAO");
  const dao = await DAO.deploy(token.target);
  await dao.waitForDeployment();
  console.log("DAO deployed to:", dao.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
