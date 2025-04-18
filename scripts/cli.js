// scripts/cli.js

const hre = require("hardhat");
const readline = require("readline");

/* 
    Entry point of the CLI that will deploy and interact with the ScholaraDAO smart contract.
    We use Hardhat Runtime Environment (hre) to compile and deploy ScholaraDAO, then allow
    for terminal-based interaction using the built-in readline interface for node.js.
*/

async function main() {
  const ScholaraDAO = await hre.ethers.getContractFactory("ScholaraDAO");
  const signers = await hre.ethers.getSigners();

  /*
      Sets up two default reviewers from available test signers and sets quorum threshold 
      (i.e., number of YES votes needed for DAO consensus). Deploys the DAO contract and
      waits for full blockchain commitment of the deploy.
  */
  const reviewers = [signers[1].address, signers[2].address];
  const quorum = 2;
  const dao = await ScholaraDAO.deploy(reviewers, quorum);
  await dao.waitForDeployment();
  console.log("ScholaraDAO deployed at:", await dao.getAddress());

  // Sets current user as the first signer (author by default) for simulation purposes.
  let currentUser = signers[0];

  /*
      Initializes standard input/output for user to interact with the DAO from the CLI.
      Uses promise-wrapped readline to handle sequential async input cleanly.
  */
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  function ask(q) {
    return new Promise((resolve) => rl.question(q, resolve));
  }

  /*
      Helper function to determine if a wallet address is a reviewer or an author.
      This simplifies role-based logic enforcement throughout the CLI.
  */
  function getRole(address) {
    if (address === signers[1].address || address === signers[2].address) {
      return "Reviewer";
    } else {
      return "Author";
    }
  }

  /*
      Main control loop that repeatedly prompts the user with possible actions
      including submitting proposals, voting, executing proposals, switching users,
      and retrieving metadata. Makes the DAO truly interactive from the command line.
  */
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

      /* 
          Proposal submission is ONLY allowed by authors (i.e., non-reviewers). 
          We connect to the DAO using the user's wallet and call the smart contract
          to submit their paper metadata.
      */
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

      /*
          Reviewers can vote on proposals. This checks the proposal ID and asks the user
          to vote yes or no. The command-line vote input is converted into a boolean for
          compatibility with the smart contract logic.
      */
      } else if (choice === "2") {
        if (getRole(currentUser.address) !== "Reviewer") {
          console.log("Only reviewers can vote on proposals.");
          continue;
        }
        const id = await ask("Proposal ID (Index of paper's submission): ");
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

      /*
          Allows reviewers to execute a proposal if and only if the vote has passed.
          Smart contract handles checks on quorum, vote totals, and execution status.
      */
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

      /*
          Retrieves metadata for a specific proposal based on its ID. This is helpful for 
          authors checking status or frontend renderers accessing on-chain content.
      */
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

      /*
          Enables real-time switching of the simulated account wallet. This is 
          particularly useful in test environments for seeing DAO behavior under 
          different user roles.
      */
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

      /*
          Exits the CLI. Shuts down the readline interface and terminates
          the smart contract simulation session.
      */
      } else if (choice === "6") {
        rl.close();
        break;

      // Fallback if invalid user input is entered.
      } else {
        console.log("Invalid choice.");
      }
    }
  }

  // Begin main user interaction loop after deployment is successful.
  await menu();
}

// Error handling for any unanticipated CLI-level or contract-level runtime exceptions.
main().catch(console.error);
