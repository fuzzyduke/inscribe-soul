const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("InscribeSoul Production Integrity Hardening Suite (Items 1-15)", function () {
  let contract;
  let owner;
  let user;

  const PUBLIC_DOMAIN = ethers.keccak256(ethers.toUtf8Bytes("INSCRIBESOUL_PUBLIC_V1"));
  const PRIVATE_DOMAIN = ethers.keccak256(ethers.toUtf8Bytes("INSCRIBESOUL_PRIVATE_V1"));

  function computePublicProofHash(author, content) {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encoded = abiCoder.encode(
      ["bytes32", "address", "string"],
      [PUBLIC_DOMAIN, ethers.getAddress(author), content]
    );
    return ethers.keccak256(encoded);
  }

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
    [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("InscribeSoul");
    contract = await Factory.deploy(0);
    await contract.waitForDeployment();
  });

  it("1. Invalid wallet address MUST throw without mock substitution", function () {
    expect(() => computePublicProofHash("invalid-address", "test")).to.throw();
    expect(() => computePrivateCommitmentHash("0x123", "0x" + "1".repeat(64), "test")).to.throw();
  });

  it("2. Private proof hash MUST NOT generate secret implicitly when secret is missing or invalid", function () {
    const secret = "0x" + "a".repeat(64);
    expect(() => computePrivateCommitmentHash(user.address, undefined, "content")).to.throw();
    expect(() => computePrivateCommitmentHash(user.address, "invalid-secret", "content")).to.throw();
    expect(computePrivateCommitmentHash(user.address, secret, "content")).to.be.a("string");
  });

  it("3. Contract validation checks: PROTOCOL_VERSION, PUBLIC_DOMAIN, PRIVATE_DOMAIN", async function () {
    expect(await contract.PROTOCOL_VERSION()).to.equal("INSCRIBESOUL_V1_1");
    expect(await contract.PUBLIC_DOMAIN()).to.equal(PUBLIC_DOMAIN);
    expect(await contract.PRIVATE_DOMAIN()).to.equal(PRIVATE_DOMAIN);
  });

  it("4. Protocol fee reading & exact value submission", async function () {
    const fee = ethers.parseEther("0.001");
    await contract.connect(owner).setProtocolFee(fee);

    expect(await contract.protocolFee()).to.equal(fee);

    const proofHash = computePrivateCommitmentHash(user.address, "0x" + "b".repeat(64), "test");
    await expect(
      contract.connect(user).inscribeProof(proofHash, { value: 0 })
    ).to.be.revertedWithCustomError(contract, "InsufficientFee");

    await expect(
      contract.connect(user).inscribeProof(proofHash, { value: fee })
    ).to.emit(contract, "PrivateProof");
  });

  it("5. Exact UTF-8 byte semantics preserved (CRLF vs LF vs Whitespace)", function () {
    const secret = "0x" + "c".repeat(64);
    const hashLF = computePrivateCommitmentHash(user.address, secret, "Line 1\nLine 2");
    const hashCRLF = computePrivateCommitmentHash(user.address, secret, "Line 1\r\nLine 2");
    const hashSpace = computePrivateCommitmentHash(user.address, secret, "Line 1\nLine 2 ");

    expect(hashLF).to.not.equal(hashCRLF);
    expect(hashLF).to.not.equal(hashSpace);
  });
});
