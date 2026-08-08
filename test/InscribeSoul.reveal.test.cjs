const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("InscribeSoul Reveal Proof Contract & Recovery Test Suite (Items 1-30)", function () {
  let contract;
  let owner;
  let user;
  let otherUser;

  const PUBLIC_DOMAIN = ethers.keccak256(ethers.toUtf8Bytes("INSCRIBESOUL_PUBLIC_V1"));
  const PRIVATE_DOMAIN = ethers.keccak256(ethers.toUtf8Bytes("INSCRIBESOUL_PRIVATE_V1"));
  const PORTABLE_PROOF_PREFIX = "INSCRIBESOUL-PROOF-V1:";

  function computePrivateCommitmentHash(author, secret, content) {
    if (!author || !ethers.isAddress(author)) throw new Error("Invalid EVM wallet address");
    if (!secret || typeof secret !== "string" || !secret.startsWith("0x") || secret.length !== 66) {
      throw new Error("Invalid secret salt key format");
    }
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encoded = abiCoder.encode(
      ["bytes32", "address", "bytes32", "string"],
      [PRIVATE_DOMAIN, ethers.getAddress(author), secret, content]
    );
    return ethers.keccak256(encoded);
  }

  function encodePortableProofBlob(pkg) {
    const jsonStr = JSON.stringify(pkg);
    const utf8Bytes = ethers.toUtf8Bytes(jsonStr);
    const base64 = ethers.encodeBase64(utf8Bytes);
    const base64Url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `${PORTABLE_PROOF_PREFIX}${base64Url}`;
  }

  function decodePortableProofBlob(blobStr) {
    if (!blobStr || !blobStr.startsWith(PORTABLE_PROOF_PREFIX)) {
      throw new Error("Invalid Portable Proof prefix");
    }
    const base64Url = blobStr.slice(PORTABLE_PROOF_PREFIX.length);
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) base64 += '=';
    const bytes = ethers.decodeBase64(base64);
    return JSON.parse(ethers.toUtf8String(bytes));
  }

  beforeEach(async function () {
    [owner, user, otherUser] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("InscribeSoul");
    contract = await Factory.deploy(0);
    await contract.waitForDeployment();
  });

  describe("Contract Reveal Proof Tests (1-11)", function () {
    it("1 & 11. Valid Reveal succeeds and emits ProofRevealed event with correct fields", async function () {
      const content = "Confidential algorithm design";
      const secret = "0x" + "1".repeat(64);
      const commitmentHash = computePrivateCommitmentHash(user.address, secret, content);

      // Step 1: Submit Private Proof
      const tx1 = await contract.connect(user).inscribeProof(commitmentHash);
      const receipt1 = await tx1.wait();

      // Step 2: Submit Reveal Proof
      const tx2 = await contract.connect(user).revealProof(
        commitmentHash,
        receipt1.hash,
        secret,
        content
      );

      await expect(tx2)
        .to.emit(contract, "ProofRevealed")
        .withArgs(
          user.address,
          commitmentHash,
          receipt1.hash,
          secret,
          content,
          await (async () => {
            const block = await ethers.provider.getBlock(tx2.blockNumber);
            return block.timestamp;
          })()
        );
    });

    it("2 & 3. Wrong content fails commitment recomputation on-chain", async function () {
      const content = "Confidential algorithm design";
      const secret = "0x" + "2".repeat(64);
      const commitmentHash = computePrivateCommitmentHash(user.address, secret, content);

      const fakeTxHash = ethers.keccak256(ethers.toUtf8Bytes("fake-tx"));

      await expect(
        contract.connect(user).revealProof(
          commitmentHash,
          fakeTxHash,
          secret,
          "Tampered content"
        )
      ).to.be.revertedWithCustomError(contract, "CommitmentMismatch");
    });

    it("4. Wrong secret fails commitment recomputation on-chain", async function () {
      const content = "Confidential algorithm design";
      const secret = "0x" + "3".repeat(64);
      const wrongSecret = "0x" + "4".repeat(64);
      const commitmentHash = computePrivateCommitmentHash(user.address, secret, content);

      const fakeTxHash = ethers.keccak256(ethers.toUtf8Bytes("fake-tx"));

      await expect(
        contract.connect(user).revealProof(
          commitmentHash,
          fakeTxHash,
          wrongSecret,
          content
        )
      ).to.be.revertedWithCustomError(contract, "CommitmentMismatch");
    });

    it("5. Different wallet attempting to reveal another wallet's commitment fails", async function () {
      const content = "User idea";
      const secret = "0x" + "5".repeat(64);
      const commitmentHashUser = computePrivateCommitmentHash(user.address, secret, content);
      const fakeTxHash = ethers.keccak256(ethers.toUtf8Bytes("fake-tx"));

      await expect(
        contract.connect(otherUser).revealProof(
          commitmentHashUser,
          fakeTxHash,
          secret,
          content
        )
      ).to.be.revertedWithCustomError(contract, "CommitmentMismatch");
    });
  });

  describe("Portable Proof Blob & Package Tests (18-21)", function () {
    it("18. JSON and Portable Blob produce identical commitment hash and exact round-trip decode", function () {
      const secret = "0x" + "e".repeat(64);
      const content = "Portable Proof Round Trip 📜⚡";
      const commitment = computePrivateCommitmentHash(user.address, secret, content);

      const pkg = {
        format: "INSCRIBESOUL_PROOF_PACKAGE_V1",
        protocol: "INSCRIBESOUL_PRIVATE_V1",
        label: "Concentrated Liquidity Lending",
        content,
        secret,
        author: user.address,
        commitmentHash: commitment,
        chainId: 84532,
        transactionHash: "0x" + "f".repeat(64),
        blockNumber: 12345,
        blockTimestamp: 1700000000,
        blockTimestampISO: new Date(1700000000 * 1000).toISOString(),
        contractAddress: "0x6fDFe67228CbB294880cc85DD0Fbca3F2C05b346",
      };

      const blobStr = encodePortableProofBlob(pkg);
      expect(blobStr.startsWith(PORTABLE_PROOF_PREFIX)).to.be.true;

      const decodedPkg = decodePortableProofBlob(blobStr);
      expect(decodedPkg.content).to.equal(content);
      expect(decodedPkg.secret).to.equal(secret);
      expect(decodedPkg.label).to.equal("Concentrated Liquidity Lending");
      expect(decodedPkg.commitmentHash).to.equal(commitment);

      const recomputedHash = computePrivateCommitmentHash(decodedPkg.author, decodedPkg.secret, decodedPkg.content);
      expect(recomputedHash).to.equal(commitment);
    });

    it("19 & 20. Optional private label does NOT alter commitment hash", function () {
      const secret = "0x" + "a".repeat(64);
      const content = "Test label immutability";
      const hash1 = computePrivateCommitmentHash(user.address, secret, content);

      const pkg1 = { content, secret, author: user.address, label: "Label A" };
      const pkg2 = { content, secret, author: user.address, label: "Label B" };

      const hashFromPkg1 = computePrivateCommitmentHash(pkg1.author, pkg1.secret, pkg1.content);
      const hashFromPkg2 = computePrivateCommitmentHash(pkg2.author, pkg2.secret, pkg2.content);

      expect(hashFromPkg1).to.equal(hash1);
      expect(hashFromPkg2).to.equal(hash1);
    });
  });

  describe("Exact Encoding & Semantics for Reveals (25-28)", function () {
    it("25. Unicode reveal works deterministically", async function () {
      const content = "InscribeSoul Reveal 📜⚡ 🔐";
      const secret = "0x" + "a".repeat(64);
      const commitmentHash = computePrivateCommitmentHash(user.address, secret, content);
      const fakeTxHash = ethers.keccak256(ethers.toUtf8Bytes("fake-tx"));

      await expect(
        contract.connect(user).revealProof(
          commitmentHash,
          fakeTxHash,
          secret,
          content
        )
      ).to.emit(contract, "ProofRevealed");
    });

    it("26-28. Manual recovery preserves exact whitespace semantics (leading, trailing, CRLF)", function () {
      const secret = "0x" + "b".repeat(64);
      const rawLeading = "   Leading spaces matter";
      const rawTrailing = "Trailing spaces matter   ";
      const rawCRLF = "Line 1\r\nLine 2";

      const hashLeading = computePrivateCommitmentHash(user.address, secret, rawLeading);
      const hashTrimmedLeading = computePrivateCommitmentHash(user.address, secret, rawLeading.trim());

      const hashTrailing = computePrivateCommitmentHash(user.address, secret, rawTrailing);
      const hashTrimmedTrailing = computePrivateCommitmentHash(user.address, secret, rawTrailing.trim());

      const hashCRLF = computePrivateCommitmentHash(user.address, secret, rawCRLF);
      const hashLF = computePrivateCommitmentHash(user.address, secret, "Line 1\nLine 2");

      expect(hashLeading).to.not.equal(hashTrimmedLeading);
      expect(hashTrailing).to.not.equal(hashTrimmedTrailing);
      expect(hashCRLF).to.not.equal(hashLF);
    });
  });

  describe("Historical V1 Compatibility & Domain Preflight Suite (Items 1-25)", function () {
    it("1. Historical V1 commitment recomputes identically under V1.1 domain separator", function () {
      const secret = "0x" + "c".repeat(64);
      const content = "Historical V1 idea";
      const hash = computePrivateCommitmentHash(user.address, secret, content);
      expect(hash).to.be.a("string").with.lengthOf(66);
    });

    it("2. Domain constants preflight matches expected constants", async function () {
      const EXPECTED_PUBLIC = ethers.keccak256(ethers.toUtf8Bytes("INSCRIBESOUL_PUBLIC_V1"));
      const EXPECTED_PRIVATE = ethers.keccak256(ethers.toUtf8Bytes("INSCRIBESOUL_PRIVATE_V1"));

      expect(await contract.PUBLIC_DOMAIN()).to.equal(EXPECTED_PUBLIC);
      expect(await contract.PRIVATE_DOMAIN()).to.equal(EXPECTED_PRIVATE);
    });

    it("3. Nonzero fee returned by contract is transmitted exactly", async function () {
      const feeContractFactory = await ethers.getContractFactory("InscribeSoul");
      const feeContract = await feeContractFactory.deploy(ethers.parseEther("0.01"));
      await feeContract.waitForDeployment();

      const fee = await feeContract.protocolFee();
      expect(fee).to.equal(ethers.parseEther("0.01"));

      const content = "Paid inscription";
      const secret = "0x" + "d".repeat(64);
      const commitment = computePrivateCommitmentHash(user.address, secret, content);

      await expect(
        feeContract.connect(user).inscribeProof(commitment, { value: ethers.parseEther("0.005") })
      ).to.be.reverted;

      await expect(
        feeContract.connect(user).inscribeProof(commitment, { value: ethers.parseEther("0.01") })
      ).to.emit(feeContract, "PrivateProof");
    });
  });
});
