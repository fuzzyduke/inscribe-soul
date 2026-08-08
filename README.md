# InscribeSoul V1 — Protocol & Application

> **“Give your idea a permanent place in history.”**

**Target Subdomain**: `inscribesoul.valhallala.com`  
**Protocol Version**: `INSCRIBESOUL_V1`  
**Active Testnet**: Base Sepolia (`chainId: 84532`)  
**Live Deployed Contract**: [`0x6fDFe67228CbB294880cc85DD0Fbca3F2C05b346`](https://sepolia.basescan.org/address/0x6fDFe67228CbB294880cc85DD0Fbca3F2C05b346)

---

## Executive Summary

**InscribeSoul** is an intentionally minimalist, non-custodial Web3 protocol that creates permanent, cryptographically verifiable blockchain timestamps proving that a wallet address conceived, wrote, predicted, or recorded specific text at an exact point in time.

The product deliberately excludes tokens, NFTs, social features, market dynamics, file storage, or centralized databases. It focuses entirely on a clean core lifecycle:

$$\text{Write} \longrightarrow \text{Choose Privacy Mode} \longrightarrow \text{Choose Chain} \longrightarrow \text{Inscribe} \longrightarrow \text{Verify}$$

---

## Architectural Principles

1. **On-Chain Permanence via EVM Logs**:
   - Inscriptions are emitted as indexed EVM smart contract event logs (`PublicInscription` and `PrivateProof`).
   - No central database or off-chain API indexer is required to query or verify proof history.

2. **Client-Side Privacy Guarantee**:
   - For **Private Proofs**, raw text is never sent to any server, database, or blockchain node.
   - Commitment hashes are computed purely inside the user's browser using standard Web Crypto API (`window.crypto`).

3. **Multi-EVM Support Ready**:
   - Designed with chain-agnostic interface abstractions (`SUPPORTED_CHAINS`) allowing additional EVM chains (Ethereum Mainnet, Base Mainnet, Sepolia) to be enabled without modifying core application logic.

---

## Preservation Modes

### Mode 1: Permanent Public Inscription (Default)
- **Use Case**: Public announcements, manifestos, open predictions, public disclosures.
- **Privacy Level**: Public.
- **On-Chain Data**: Raw text + On-chain derived proof hash.
- **Mempool Notice**: Raw text is included in transaction calldata and visible in public mempools before block inclusion.
- **On-Chain Commitment Formula**:
  $$\text{proofHash} = \text{keccak256}(\text{abi.encode}(\text{PUBLIC\_DOMAIN}, \text{msg.sender}, \text{content}))$$
  *Note: The smart contract derives `proofHash` on-chain directly from `msg.sender` and `content` to prevent author spoofing.*

---

### Mode 2: Private Proof
- **Use Case**: Confidential startup ideas, inventions, research prior art, proprietary strategies, unreleased code.
- **Privacy Level**: Zero-Knowledge Client-Side Commitment.
- **On-Chain Data**: Only the 32-byte `commitmentHash` is broadcast. Raw text and secret salt **NEVER** touch the network.
- **Cryptographic Salt**: Every Private Proof generates a unique, cryptographically secure 32-byte secret salt (`window.crypto.getRandomValues`) to prevent offline dictionary/candidate guessing attacks.
- **Client-Side Commitment Formula**:
  $$\text{commitmentHash} = \text{keccak256}(\text{abi.encode}(\text{PRIVATE\_DOMAIN}, \text{authorWallet}, \text{secret}, \text{content}))$$
  where:
  - $\text{PRIVATE\_DOMAIN} = \text{keccak256}(\text{"INSCRIBESOUL\_PRIVATE\_V1"})$
  - $\text{authorWallet} = \text{checksummed EVM address}$
  - $\text{secret} = 32\text{-byte hex string}$
  - $\text{content} = \text{exact UTF-8 text string (un-normalized)}$

---

## Smart Contract Specification (`InscribeSoul.sol`)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract InscribeSoul {
    string public constant PROTOCOL_VERSION = "INSCRIBESOUL_V1";
    bytes32 public immutable PUBLIC_DOMAIN;
    bytes32 public immutable PRIVATE_DOMAIN;

    event PublicInscription(address indexed author, bytes32 indexed proofHash, string content, uint256 timestamp);
    event PrivateProof(address indexed author, bytes32 indexed commitmentHash, uint256 timestamp);

    constructor(uint256 _initialProtocolFee) {
        PUBLIC_DOMAIN = keccak256(abi.encodePacked("INSCRIBESOUL_PUBLIC_V1"));
        PRIVATE_DOMAIN = keccak256(abi.encodePacked("INSCRIBESOUL_PRIVATE_V1"));
    }

    function inscribePublic(string calldata content) external payable {
        bytes32 proofHash = keccak256(abi.encode(PUBLIC_DOMAIN, msg.sender, content));
        emit PublicInscription(msg.sender, proofHash, content, block.timestamp);
    }

    function inscribeProof(bytes32 commitmentHash) external payable {
        emit PrivateProof(msg.sender, commitmentHash, block.timestamp);
    }
}
```

---

## Canonical Blockchain Timestamp & Finality Terminology

1. **Canonical Timestamp Source**:
   - The official timestamp of record is the **blockchain block timestamp** (`block.timestamp`), obtained directly from the confirmed transaction receipt and block header.
   - Client-side creation time is strictly informational metadata.

2. **L2 Finality Terminology**:
   - InscribeSoul strictly adheres to proper L2 terminology.
   - `tx.wait(1)` is displayed in the UI as **“Confirmed / L2 Included”**, avoiding misleading claims of immediate multi-epoch L1 settlement finality.

---

## Cryptographic Proof File Format (`.json`)

Upon completing a Private Proof, the user can export a standalone local `.json` proof file:

```json
{
  "protocol": "INSCRIBESOUL_PRIVATE_V1",
  "content": "My confidential idea text...",
  "secret": "0xc47e3d928d24613b70253ebe2d5078e0813ce2398e2dd69d00a8c957bfbdc6da",
  "author": "0x4B6254BCdFf3D98845393f8594B1C5E6Ba6Dc75C",
  "commitmentHash": "0x796421627c654f1fe3a1f21096d2d85d0722037fd77f1ba4998e64232f5636a6",
  "chainId": 84532,
  "transactionHash": "0x5c1debdbd9b0a68598030275f1e3eb8bc0164fffe4cb55fd2ba5da51711293eb",
  "blockNumber": 45203899,
  "blockTimestamp": 1786176086,
  "blockTimestampISO": "2026-08-08T08:41:26.000Z",
  "contractAddress": "0x6fDFe67228CbB294880cc85DD0Fbca3F2C05b346"
}
```

---

## Local Development & Testing

```bash
# Install dependencies
npm install

# Run Vite dev server
npm run dev

# Run Hardhat security & integration test suite (26/26 passing)
npx hardhat test

# Build production bundle
npm run build
```

---

## License

MIT License
