const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("InscribeSoul Reveal Proof Contract & Verification Test Suite (Items 1-30)", function () {
  let contract;
  let owner;
  let user;
  let otherUser;

  const PUBLIC_DOMAIN = ethers.keccak256(ethers.toUtf8Bytes("INSCRIBESOUL_PUBLIC_V1"));
  const PRIVATE_DOMAIN = ethers.keccak256(ethers.toUtf8Bytes("INSCRIBESOUL_PRIVATE_V1"));

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
      // Commitment created for 'user.address'
      const commitmentHashUser = computePrivateCommitmentHash(user.address, secret, content);
      const fakeTxHash = ethers.keccak256(ethers.toUtf8Bytes("fake-tx"));

      // 'otherUser' attempts to reveal user's commitment
      await expect(
        contract.connect(otherUser).revealProof(
          commitmentHashUser,
          fakeTxHash,
          secret,
          content
        )
      ).to.be.revertedWithCustomError(contract, "CommitmentMismatch");
    });

    it("6. Zero commitment hash fails", async function () {
      const fakeTxHash = ethers.keccak256(ethers.toUtf8Bytes("fake-tx"));
      const secret = "0x" + "6".repeat(64);

      await expect(
        contract.connect(user).revealProof(
          ethers.ZeroHash,
          fakeTxHash,
          secret,
          "content"
        )
      ).to.be.revertedWithCustomError(contract, "InvalidCommitmentHash");
    });

    it("7. Zero original transaction hash fails", async function () {
      const secret = "0x" + "7".repeat(64);
      const commitmentHash = computePrivateCommitmentHash(user.address, secret, "content");

      await expect(
        contract.connect(user).revealProof(
          commitmentHash,
          ethers.ZeroHash,
          secret,
          "content"
        )
      ).to.be.revertedWithCustomError(contract, "InvalidTransactionHash");
    });

    it("8. Empty content fails", async function () {
      const secret = "0x" + "8".repeat(64);
      const fakeTxHash = ethers.keccak256(ethers.toUtf8Bytes("fake-tx"));

      await expect(
        contract.connect(user).revealProof(
          fakeTxHash,
          fakeTxHash,
          secret,
          ""
        )
      ).to.be.revertedWithCustomError(contract, "EmptyContent");
    });

    it("9. Zero secret fails", async function () {
      const fakeTxHash = ethers.keccak256(ethers.toUtf8Bytes("fake-tx"));

      await expect(
        contract.connect(user).revealProof(
          fakeTxHash,
          fakeTxHash,
          ethers.ZeroHash,
          "content"
        )
      ).to.be.revertedWithCustomError(contract, "InvalidSecret");
    });

    it("10. Protocol fee enforced for reveal", async function () {
      const fee = ethers.parseEther("0.005");
      await contract.connect(owner).setProtocolFee(fee);

      const secret = "0x" + "9".repeat(64);
      const content = "Fee test";
      const commitmentHash = computePrivateCommitmentHash(user.address, secret, content);
      const fakeTxHash = ethers.keccak256(ethers.toUtf8Bytes("fake-tx"));

      await expect(
        contract.connect(user).revealProof(
          commitmentHash,
          fakeTxHash,
          secret,
          content,
          { value: 0 }
        )
      ).to.be.revertedWithCustomError(contract, "InsufficientFee");

      await expect(
        contract.connect(user).revealProof(
          commitmentHash,
          fakeTxHash,
          secret,
          content,
          { value: fee }
        )
      ).to.emit(contract, "ProofRevealed");
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

    it("26 & 27. LF multiline vs CRLF multiline reveals remain distinct", async function () {
      const secret = "0x" + "b".repeat(64);
      const contentLF = "Line 1\nLine 2";
      const contentCRLF = "Line 1\r\nLine 2";

      const commitLF = computePrivateCommitmentHash(user.address, secret, contentLF);
      const fakeTxHash = ethers.keccak256(ethers.toUtf8Bytes("fake-tx"));

      // Attempting to reveal CRLF against LF commitment fails
      await expect(
        contract.connect(user).revealProof(
          commitLF,
          fakeTxHash,
          secret,
          contentCRLF
        )
      ).to.be.revertedWithCustomError(contract, "CommitmentMismatch");
    });

    it("28. Leading/trailing whitespace reveal works", async function () {
      const content = "  Idea with trailing space  ";
      const secret = "0x" + "c".repeat(64);
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
  });
});
