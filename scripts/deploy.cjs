const { ethers } = require("hardhat");

async function main() {
  const signers = await ethers.getSigners();
  let deployer;

  if (signers.length > 0) {
    deployer = signers[0];
  } else {
    // If no PRIVATE_KEY in env, fallback to Hardhat default deterministic testnet signer
    const provider = ethers.provider;
    const wallet = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
    deployer = wallet;
  }

  console.log("--------------------------------------------------");
  console.log("Deploying InscribeSoul V1 to Base Sepolia Testnet");
  console.log("Deployer Wallet:", deployer.address);

  const initialFee = 0; // 0 ETH protocol fee for MVP testnet
  const Factory = await ethers.getContractFactory("InscribeSoul", deployer);
  const contract = await Factory.deploy(initialFee);

  await contract.waitForDeployment();
  const address = await contract.getAddress();
  const deployTx = contract.deploymentTransaction();
  const receipt = await deployTx.wait();

  console.log("--------------------------------------------------");
  console.log("Contract Address:", address);
  console.log("Deployment Tx Hash:", deployTx.hash);
  console.log("Deployment Block Number:", receipt.blockNumber);
  console.log("Chain ID: 84532 (Base Sepolia)");
  console.log("Protocol Version: INSCRIBESOUL_V1");
  console.log("Initial Protocol Fee:", initialFee, "ETH");
  console.log("--------------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
