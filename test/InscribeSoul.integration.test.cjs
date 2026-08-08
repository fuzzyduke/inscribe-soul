const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("InscribeSoul Live Integration & Portability Suite", function () {
  let contract;
  let deployer;
  let user;
  let otherUser;

  const PUBLIC_DOMAIN = ethers.keccak256(ethers.toUtf8Bytes("INSCRIBESOUL_PUBLIC_V1"));
  const PRIVATE_DOMAIN = ethers.keccak256(ethers.toUtf8Bytes("INSCRIBESOUL_PRIVATE_V1"));

  function generateSecret() {
    return ethers.hexlify(ethers.randomBytes(32));
  }

  function computePublicProofHash(author, content) {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encoded = abiCoder.encode(
      ["bytes32", "address", "string"],
      [PUBLIC_DOMAIN, ethers.getAddress(author), content]
    );
    return ethers.keccak256(encoded);
  }

  function computePrivateCommitmentHash(author, secret, content) {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encoded = abiCoder.encode(
      ["bytes32", "address", "bytes32", "string"],
      [PRIVATE_DOMAIN, ethers.getAddress(author), secret, content]
    );
    return ethers.keccak256(encoded);
  }

  beforeEach(async function () {
    [deployer, user, otherUser] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("InscribeSoul");
    contract = await Factory.deploy(0);
    await contract.waitForDeployment();
  });

  describe("Live Test Scenarios 1-6 (Private Proofs)", function () {
    it("Test 1: Standard idea - plaintext & secret absent from calldata, block timestamp captured", async function () {
      const idea = "A protocol where inactive concentrated liquidity assets automatically migrate into lending markets.";
      const secret = generateSecret();
      const commitment = computePrivateCommitmentHash(user.address, secret, idea);

      const tx = await contract.connect(user).inscribeProof(commitment);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      // Verify privacy
      expect(tx.data.toLowerCase().includes(secret.slice(2).toLowerCase())).to.be.false;
      expect(Buffer.from(tx.data.slice(2), "hex").toString("utf-8").includes(idea)).to.be.false;

      // Verify event
      const events = await contract.queryFilter(contract.filters.PrivateProof());
      expect(events[0].args.commitmentHash).to.equal(commitment);

      // Verify proof JSON schema with canonical block timestamp
      const proofJSON = {
        protocol: "INSCRIBESOUL_PRIVATE_V1",
        content: idea,
        secret,
        author: user.address,
        commitmentHash: commitment,
        chainId: 84532,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        blockTimestamp: block.timestamp,
        blockTimestampISO: new Date(block.timestamp * 1000).toISOString(),
        contractAddress: await contract.getAddress(),
      };

      const recomputed = computePrivateCommitmentHash(proofJSON.author, proofJSON.secret, proofJSON.content);
      expect(recomputed).to.equal(proofJSON.commitmentHash);
    });

    it("Test 2: Emoji & Unicode Private Proof", async function () {
      const content = "InscribeSoul 📜⚡ 🔐 Special chars: 🚀 ☯ 𓀀";
      const secret = generateSecret();
      const commitment = computePrivateCommitmentHash(user.address, secret, content);

      const tx = await contract.connect(user).inscribeProof(commitment);
      await tx.wait();

      const events = await contract.queryFilter(contract.filters.PrivateProof());
      expect(events[0].args.commitmentHash).to.equal(commitment);
    });

    it("Test 3: Multiline Private Proof", async function () {
      const content = "Paragraph 1: Executive Summary\n\nParagraph 2: Architecture Details\r\nParagraph 3: Conclusion";
      const secret = generateSecret();
      const commitment = computePrivateCommitmentHash(user.address, secret, content);

      const tx = await contract.connect(user).inscribeProof(commitment);
      await tx.wait();

      const events = await contract.queryFilter(contract.filters.PrivateProof());
      expect(events[0].args.commitmentHash).to.equal(commitment);
    });

    it("Test 4: Single-character mutation MUST fail verification", async function () {
      const content = "Valid idea string";
      const secret = generateSecret();
      const validCommitment = computePrivateCommitmentHash(user.address, secret, content);

      // Mutate 1 char
      const mutatedContent = "Valid idea strinG";
      const mutatedCommitment = computePrivateCommitmentHash(user.address, secret, mutatedContent);

      expect(mutatedCommitment).to.not.equal(validCommitment);
    });

    it("Test 5: Wrong secret MUST fail verification", async function () {
      const content = "Valid idea string";
      const secret = generateSecret();
      const wrongSecret = generateSecret();
      const validCommitment = computePrivateCommitmentHash(user.address, secret, content);
      const wrongCommitment = computePrivateCommitmentHash(user.address, wrongSecret, content);

      expect(wrongCommitment).to.not.equal(validCommitment);
    });

    it("Test 6: Wrong author MUST NOT produce valid author-bound proof", async function () {
      const content = "Author bound secret";
      const secret = generateSecret();
      const validCommitment = computePrivateCommitmentHash(user.address, secret, content);

      const tx = await contract.connect(user).inscribeProof(validCommitment);
      const receipt = await tx.wait();

      const iface = contract.interface;
      const logs = receipt.logs.map(log => iface.parseLog(log));
      const eventLog = logs.find(l => l.name === "PrivateProof");

      // Verify that testing with otherUser address fails against event.args.author
      expect(eventLog.args.author).to.equal(user.address);
      expect(eventLog.args.author).to.not.equal(otherUser.address);
    });
  });

  describe("Live Test Scenarios 7-9 (Public Inscriptions)", function () {
    it("Test 7: Standard Public Inscription - contract derives proofHash", async function () {
      const content = "Public announcement of discovery";
      const expectedHash = computePublicProofHash(user.address, content);

      const tx = await contract.connect(user).inscribePublic(content);
      const receipt = await tx.wait();

      const events = await contract.queryFilter(contract.filters.PublicInscription());
      expect(events[0].args.author).to.equal(user.address);
      expect(events[0].args.proofHash).to.equal(expectedHash);
      expect(events[0].args.content).to.equal(content);
    });

    it("Test 8 & 9: Unicode & Multiline Public Inscriptions", async function () {
      const unicodeContent = "Public Announcement 📢 ✨ 🌐";
      const multilineContent = "Heading 1\nSubtitle\nBody paragraph line 1";

      await contract.connect(user).inscribePublic(unicodeContent);
      await contract.connect(user).inscribePublic(multilineContent);

      const events = await contract.queryFilter(contract.filters.PublicInscription());
      expect(events.length).to.equal(2);
      expect(events[0].args.content).to.equal(unicodeContent);
      expect(events[1].args.content).to.equal(multilineContent);
    });
  });

  describe("Wallet History & Independent Proof Portability (Tests 10-12)", function () {
    it("Wallet History accurately discovers Public & Private logs for connected wallet", async function () {
      await contract.connect(user).inscribePublic("Public item 1");
      const secret = generateSecret();
      const commitment = computePrivateCommitmentHash(user.address, secret, "Private item 1");
      await contract.connect(user).inscribeProof(commitment);

      const publicLogs = await contract.queryFilter(contract.filters.PublicInscription(user.address));
      const privateLogs = await contract.queryFilter(contract.filters.PrivateProof(user.address));

      expect(publicLogs.length).to.equal(1);
      expect(privateLogs.length).to.equal(1);
    });

    it("Independent Proof Portability Test: Verifies exported JSON without central database", async function () {
      const secret = generateSecret();
      const content = "Portable standalone discovery text";
      const commitment = computePrivateCommitmentHash(user.address, secret, content);

      const tx = await contract.connect(user).inscribeProof(commitment);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      const exportedProofFile = {
        protocol: "INSCRIBESOUL_PRIVATE_V1",
        content,
        secret,
        author: user.address,
        commitmentHash: commitment,
        chainId: 84532,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        blockTimestamp: block.timestamp,
        blockTimestampISO: new Date(block.timestamp * 1000).toISOString(),
        contractAddress: await contract.getAddress(),
      };

      // 1. Recompute commitment locally from proof file data
      const recomputedHash = computePrivateCommitmentHash(
        exportedProofFile.author,
        exportedProofFile.secret,
        exportedProofFile.content
      );
      expect(recomputedHash).to.equal(exportedProofFile.commitmentHash);

      // 2. Query blockchain RPC for receipt
      const fetchedReceipt = await ethers.provider.getTransactionReceipt(exportedProofFile.transactionHash);
      const iface = contract.interface;
      const parsedLog = iface.parseLog(fetchedReceipt.logs[0]);

      expect(parsedLog.args.author).to.equal(exportedProofFile.author);
      expect(parsedLog.args.commitmentHash).to.equal(exportedProofFile.commitmentHash);
      expect(fetchedReceipt.blockNumber).to.equal(exportedProofFile.blockNumber);
    });
  });
});
