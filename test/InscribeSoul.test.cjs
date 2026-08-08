const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("InscribeSoul Protocol Hardening V1 Security Suite", function () {
  let contract;
  let owner;
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
    [owner, user, otherUser] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("InscribeSoul");
    contract = await Factory.deploy(0);
    await contract.waitForDeployment();
  });

  describe("Contract Constants & Setup", function () {
    it("1. Should return correct domain separators and protocol version", async function () {
      expect(await contract.PROTOCOL_VERSION()).to.equal("INSCRIBESOUL_V1_1");
      expect(await contract.PUBLIC_DOMAIN()).to.equal(PUBLIC_DOMAIN);
      expect(await contract.PRIVATE_DOMAIN()).to.equal(PRIVATE_DOMAIN);
    });
  });

  describe("Private Proof Cryptographic Hardening", function () {
    it("1. Same content + same secret + same author = same commitment", async function () {
      const content = "Secret discovery";
      const secret = generateSecret();
      const hash1 = computePrivateCommitmentHash(user.address, secret, content);
      const hash2 = computePrivateCommitmentHash(user.address, secret, content);
      expect(hash1).to.equal(hash2);
    });

    it("2. Same content + different secret = different commitment", async function () {
      const content = "Secret discovery";
      const secret1 = generateSecret();
      const secret2 = generateSecret();
      const hash1 = computePrivateCommitmentHash(user.address, secret1, content);
      const hash2 = computePrivateCommitmentHash(user.address, secret2, content);
      expect(hash1).to.not.equal(hash2);
    });

    it("3. Same content + same secret + different author = different commitment", async function () {
      const content = "Secret discovery";
      const secret = generateSecret();
      const hash1 = computePrivateCommitmentHash(user.address, secret, content);
      const hash2 = computePrivateCommitmentHash(otherUser.address, secret, content);
      expect(hash1).to.not.equal(hash2);
    });

    it("4. One changed character changes commitment", async function () {
      const secret = generateSecret();
      const hash1 = computePrivateCommitmentHash(user.address, secret, "Secret idea A");
      const hash2 = computePrivateCommitmentHash(user.address, secret, "Secret idea B");
      expect(hash1).to.not.equal(hash2);
    });

    it("5. Handles Unicode & Emojis deterministically", async function () {
      const secret = generateSecret();
      const content = "InscribeSoul 📜⚡ 🔐 Unicode content: 🚀";
      const commitment = computePrivateCommitmentHash(user.address, secret, content);
      
      const tx = await contract.connect(user).inscribeProof(commitment);
      await tx.wait();

      const events = await contract.queryFilter(contract.filters.PrivateProof());
      expect(events[0].args.commitmentHash).to.equal(commitment);
    });

    it("6. Newline behavior is deterministic", async function () {
      const secret = generateSecret();
      const content = "Line 1\nLine 2\r\nLine 3";
      const hash1 = computePrivateCommitmentHash(user.address, secret, content);
      const hash2 = computePrivateCommitmentHash(user.address, secret, content);
      expect(hash1).to.equal(hash2);
    });

    it("7 & 8. CRITICAL SECURITY: Secret and Plaintext NEVER appear in private tx calldata", async function () {
      const secret = "0xa1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";
      const plaintext = "Top secret patent idea plaintext string";
      const commitment = computePrivateCommitmentHash(user.address, secret, plaintext);

      const tx = await contract.connect(user).inscribeProof(commitment);
      const receipt = await tx.wait();

      const calldataHex = tx.data.toLowerCase();
      const secretClean = secret.slice(2).toLowerCase();
      
      expect(calldataHex.includes(secretClean)).to.be.false;

      const rawUtf8 = Buffer.from(tx.data.slice(2), "hex").toString("utf-8");
      expect(rawUtf8.includes(plaintext)).to.be.false;
    });

    it("9. Private transaction contains only expected ABI data", async function () {
      const secret = generateSecret();
      const content = "Test content";
      const commitment = computePrivateCommitmentHash(user.address, secret, content);

      const tx = await contract.connect(user).inscribeProof(commitment);
      const iface = contract.interface;
      const parsed = iface.parseTransaction({ data: tx.data });

      expect(parsed.name).to.equal("inscribeProof");
      expect(parsed.args.commitmentHash).to.equal(commitment);
    });

    it("10. Proof exported locally can reproduce the blockchain commitment", async function () {
      const secret = generateSecret();
      const content = "Exportable proof content";
      const commitment = computePrivateCommitmentHash(user.address, secret, content);

      const localProofFile = {
        protocol: "INSCRIBESOUL_PRIVATE_V1",
        content,
        secret,
        author: user.address,
        commitmentHash: commitment,
      };

      const recomputed = computePrivateCommitmentHash(
        localProofFile.author,
        localProofFile.secret,
        localProofFile.content
      );

      expect(recomputed).to.equal(localProofFile.commitmentHash);
    });
  });

  describe("Public Inscription On-Chain Derivation", function () {
    it("11 & 12. Contract derives public proof hash on-chain (caller cannot mismatch content/hash)", async function () {
      const content = "Public declaration of discovery";
      const expectedHash = computePublicProofHash(user.address, content);

      const tx = await contract.connect(user).inscribePublic(content);
      await tx.wait();

      const events = await contract.queryFilter(contract.filters.PublicInscription());
      expect(events[0].args.author).to.equal(user.address);
      expect(events[0].args.proofHash).to.equal(expectedHash);
      expect(events[0].args.content).to.equal(content);
    });

    it("13. Different author changes public proof hash", async function () {
      const content = "Identical public statement";
      const hashUser1 = computePublicProofHash(user.address, content);
      const hashUser2 = computePublicProofHash(otherUser.address, content);

      expect(hashUser1).to.not.equal(hashUser2);
    });

    it("14. Event content matches submitted content", async function () {
      const content = "Exact match verification content";
      await contract.connect(user).inscribePublic(content);
      const events = await contract.queryFilter(contract.filters.PublicInscription());
      expect(events[0].args.content).to.equal(content);
    });
  });

  describe("Protocol Fees & Admin Safeguards", function () {
    it("15. Incorrect fee behavior reverts appropriately", async function () {
      const fee = ethers.parseEther("0.005");
      await contract.connect(owner).setProtocolFee(fee);

      await expect(
        contract.connect(user).inscribePublic("Fee test")
      ).to.be.revertedWithCustomError(contract, "InsufficientFee");

      await expect(
        contract.connect(user).inscribeProof(generateSecret(), { value: fee })
      ).to.emit(contract, "PrivateProof");
    });

    it("16. Withdrawal behavior transfers funds safely", async function () {
      const fee = ethers.parseEther("0.01");
      await contract.connect(owner).setProtocolFee(fee);

      await contract.connect(user).inscribePublic("Public fee content", { value: fee });

      const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
      const withdrawTx = await contract.connect(owner).withdrawFees();
      const receipt = await withdrawTx.wait();

      const gasPaid = receipt.gasUsed * receipt.gasPrice;
      const finalOwnerBalance = await ethers.provider.getBalance(owner.address);

      expect(finalOwnerBalance + gasPaid - initialOwnerBalance).to.equal(fee);
      expect(await ethers.provider.getBalance(await contract.getAddress())).to.equal(0);
    });

    it("17. Unauthorized or excessive fee operations fail", async function () {
      await expect(
        contract.connect(user).setProtocolFee(ethers.parseEther("0.001"))
      ).to.be.revertedWithCustomError(contract, "Unauthorized");

      const excessFee = ethers.parseEther("0.2"); // MAX is 0.1 ETH
      await expect(
        contract.connect(owner).setProtocolFee(excessFee)
      ).to.be.revertedWithCustomError(contract, "FeeExceedsMaximum");
    });
  });
});
