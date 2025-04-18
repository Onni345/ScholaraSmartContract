// scripts/cli.js
const hre = require("hardhat");
const readline = require("readline");

async function main() {
  const ScholaraDAO = await hre.ethers.getContractFactory("ScholaraDAO");
  const signers = await hre.ethers.getSigners();

  const reviewers = [signers[1].address, signers[2].address];
  const quorum = 2;
  const dao = await ScholaraDAO.deploy(reviewers, quorum);
  await dao.waitForDeployment();
  console.log("ScholaraDAO deployed at:", await dao.getAddress());

  let currentUser = signers[0];

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  function ask(q) {
    return new Promise((resolve) => rl.question(q, resolve));
  }

  function getRole(address) {
    if (address === signers[1].address || address === signers[2].address) {
      return "Reviewer";
    } else {
      return "Author";
    }
  }

  async function menu() {
    while (true) {
      console.log("\nCurrent Account:", currentUser.address);
      console.log("Role:", getRole(currentUser.address));
      console.log("Options:");
      console.log("1. Submit Proposal");
      console.log("2. Vote on Proposal");
      console.log("3. Execute Proposal");
      console.log("4. Get Proposal Info");
      console.log("5. Switch Account");
      console.log("6. Exit\n");

      const choice = await ask("Choose an option: ");

      if (choice === "1") {
        if (getRole(currentUser.address) !== "Author") {
          console.log("Only authors can submit proposals.");
          continue;
        }
        const title = await ask("Title: ");
        const summary = await ask("Summary: ");
        const ipfsHash = await ask("IPFS Hash: ");
        const daoAsUser = dao.connect(currentUser);
        const tx = await daoAsUser.submitProposal(title, summary, ipfsHash);
        await tx.wait();
        console.log("Proposal submitted.");

      } else if (choice === "2") {
        if (getRole(currentUser.address) !== "Reviewer") {
          console.log("Only reviewers can vote on proposals.");
          continue;
        }
        const id = await ask("Proposal ID: ");
        const voteInput = await ask("Vote 'yes' or 'no': ");
        const support = voteInput.toLowerCase() === "yes";
        const daoAsUser = dao.connect(currentUser);
        try {
          const tx = await daoAsUser.vote(id, support);
          await tx.wait();
          console.log(`Voted '${voteInput}' on proposal.`);
        } catch (err) {
          console.log("Error voting:", err.message);
        }

      } else if (choice === "3") {
        if (getRole(currentUser.address) !== "Reviewer") {
          console.log("Only reviewers can execute proposals.");
          continue;
        }
        const id = await ask("Proposal ID: ");
        const daoAsUser = dao.connect(currentUser);
        try {
          const tx = await daoAsUser.executeProposal(id);
          await tx.wait();
          console.log("Proposal executed.");
        } catch (err) {
          console.log("Error executing proposal:", err.message);
        }

      } else if (choice === "4") {
        const id = await ask("Proposal ID: ");
        try {
          const prop = await dao.getProposal(id);
          console.log("\nProposal:", {
            title: prop[0],
            summary: prop[1],
            ipfsHash: prop[2],
            author: prop[3],
            yesVotes: prop[4].toString(),
            noVotes: prop[5].toString(),
            approved: prop[6],
            executed: prop[7],
            timestamp: new Date(Number(prop[8]) * 1000).toISOString()
          });
        } catch (err) {
          console.log("Error fetching proposal:", err.message);
        }

      } else if (choice === "5") {
        console.log("Available accounts:");
        signers.forEach((s, i) => {
          console.log(`${i}: ${s.address} (${getRole(s.address)})`);
        });
        const index = parseInt(await ask("Enter index of account to switch to: "));
        if (!isNaN(index) && index >= 0 && index < signers.length) {
          currentUser = signers[index];
          console.log("Switched to:", currentUser.address);
        } else {
          console.log("Invalid index.");
        }

      } else if (choice === "6") {
        rl.close();
        break;

      } else {
        console.log("Invalid choice.");
      }
    }
  }

  await menu();
}

main().catch(console.error);
