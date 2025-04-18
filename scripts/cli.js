const readline = require("readline");
const hre = require("hardhat");

const DAO_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const TOKEN_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

let signer, dao, token;
let STAKE_AMOUNT;

async function init() {
  STAKE_AMOUNT = hre.ethers.parseEther("100");

  [signer] = await hre.ethers.getSigners();

  const ScholaraDAO = await hre.ethers.getContractFactory("ScholaraDAO");
  const ScholaraToken = await hre.ethers.getContractFactory("ScholaraToken");

  dao = ScholaraDAO.attach(DAO_ADDRESS);
  token = ScholaraToken.attach(TOKEN_ADDRESS);
}

async function submitPaper() {
  const hash = await ask("Enter IPFS Hash: ");
  const metadata = await ask("Enter metadata: ");

  const tx = await dao.submitPaper(hash, metadata);
  await tx.wait();
  console.log("✅ Paper submitted!");
}

async function votePaper() {
  const paperId = await ask("Enter Paper ID: ");
  const vote = await ask("Vote (1 = yes, 0 = no): ");

  const approveTx = await token.approve(DAO_ADDRESS, STAKE_AMOUNT);
  await approveTx.wait();

  const tx = await dao.stakeAndVote(paperId, vote === "1");
  await tx.wait();
  console.log("🗳️ Voted on paper", paperId);
}

async function distributeRewards() {
  const paperId = await ask("Enter Paper ID: ");
  const tx = await dao.distributeRewards(paperId);
  await tx.wait();
  console.log("💰 Rewards distributed for paper", paperId);
}

function ask(q) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((res) =>
    rl.question(q, (ans) => {
      rl.close();
      res(ans);
    })
  );
}

async function main() {
  await init();

  console.log("\n🎓 ScholaraDAO CLI\n");
  console.log("1. Submit Paper");
  console.log("2. Stake and Vote on Paper");
  console.log("3. Distribute Rewards\n");

  const choice = await ask("Select an action: ");

  if (choice === "1") await submitPaper();
  else if (choice === "2") await votePaper();
  else if (choice === "3") await distributeRewards();
  else console.log("Invalid option.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
