# InscribeSoul V1.1 — Protocol & Application

> **“Give your idea a permanent place in history.”**

**Target Subdomain**: `inscribesoul.valhallala.com`  
**Protocol Version**: `INSCRIBESOUL_V1_1`  

---

## Deployment Status Matrix

| Network | Status | Canonical Contract Address | Selectable in UI |
| :--- | :--- | :--- | :--- |
| **Base Sepolia (Testnet)** | **LIVE V1.1 TESTNET** | [`0xdD7317881A75522Cd5B8853003A0f8D6dFA99AcB`](https://sepolia.basescan.org/address/0xdD7317881A75522Cd5B8853003A0f8D6dFA99AcB) | **Yes** |
| **Base Mainnet** | NOT DEPLOYED | `N/A (Coming Soon)` | No |
| **Ethereum Sepolia** | NOT DEPLOYED | `N/A (Coming Soon)` | No |
| **Ethereum Mainnet** | NOT DEPLOYED | `N/A (Coming Soon)` | No |

---

## Executive Summary

**InscribeSoul** is an intentionally minimalist, non-custodial Web3 protocol that creates permanent, cryptographically verifiable blockchain timestamps proving that a wallet address conceived, wrote, predicted, or recorded specific text at an exact point in time.

The product deliberately excludes tokens, NFTs, social features, market dynamics, file storage, or centralized databases. It focuses entirely on a clean core lifecycle:

$$\text{Write} \longrightarrow \text{Choose Privacy Mode} \longrightarrow \text{Choose Chain} \longrightarrow \text{Inscribe} \longrightarrow \text{Verify / Reveal}$$

---

## Architectural Principles

1. **On-Chain Permanence via EVM Logs**:
   - Inscriptions are emitted as indexed EVM smart contract event logs (`PublicInscription`, `PrivateProof`, and `ProofRevealed`).
   - No central database or off-chain API indexer is required to query or verify proof history.

2. **Client-Side Privacy Guarantee**:
   - For **Private Proofs**, raw text is never sent to any server, database, or blockchain node.
   - Commitment hashes are computed purely inside the user's browser using standard Web Crypto API (`window.crypto`).

3. **Multi-EVM Support Ready**:
   - Designed with chain-agnostic interface abstractions (`SUPPORTED_CHAINS`) allowing additional EVM chains (Ethereum Mainnet, Base Mainnet, Sepolia) to be enabled without modifying core application logic.

---

## Preservation & Reveal Modes

### Mode 1: Permanent Public Inscription (Default)
- **Use Case**: Public announcements, manifestos, open predictions, public disclosures.
- **Privacy Level**: Public.
- **On-Chain Data**: Raw text + On-chain derived proof hash.
- **Mempool Notice**: Raw text is included in transaction calldata and visible in public mempools before block inclusion.
- **On-Chain Commitment Formula**:
  $$\text{proofHash} = \text{keccak256}(\text{abi.encode}(\text{PUBLIC\_DOMAIN}, \text{msg.sender}, \text{content}))$$

---

### Mode 2: Private Proof
- **Use Case**: Confidential startup ideas, inventions, research prior art, proprietary strategies, unreleased code.
- **Privacy Level**: Zero-Knowledge Client-Side Commitment.
- **On-Chain Data**: Only the 32-byte `commitmentHash` is broadcast. Raw text and secret salt **NEVER** touch the network.
- **Cryptographic Salt**: Every Private Proof generates a unique, cryptographically secure 32-byte secret salt (`window.crypto.getRandomValues`) to prevent offline dictionary/candidate guessing attacks.
- **Client-Side Commitment Formula**:
  $$\text{commitmentHash} = \text{keccak256}(\text{abi.encode}(\text{PRIVATE\_DOMAIN}, \text{authorWallet}, \text{secret}, \text{content}))$$

---

### Mode 3: Reveal Proof (V1.1 Capability)
- **Use Case**: Publicly unsealing a previously recorded Private Proof while cryptographically proving when the idea was originally committed.
- **Privacy Level**: Unsealed / Revealed.
- **On-Chain Data**: Emits `ProofRevealed(author, originalCommitmentHash, originalTransactionHash, secret, content, timestamp)`.
- **Smart Contract Verification**:
  Recomputes $\text{keccak256}(\text{PRIVATE\_DOMAIN}, \text{msg.sender}, \text{secret}, \text{content})$ live on-chain and verifies it equals `originalCommitmentHash` before emitting the event.

---

## Recovery Material & Portable Proof Blob

To ensure users never need to record or manage raw technical hashes:

1. **Downloadable JSON Proof File**:
   Contains complete `PrivateProofPackage` JSON (`inscribesoul-proof-XXXXXXXX.json`).
2. **Copyable Portable Proof Blob**:
   Format: `INSCRIBESOUL-PROOF-V1:<base64url-encoded-utf8-json>`
   Copy-paste safe, versioned string that can be backed up in password managers or encrypted notes.
3. **Manual Recovery**:
   Given **Exact Original Text** + **Secret Salt Key**, InscribeSoul automatically queries blockchain RPC logs to discover the original commitment transaction hash, block height, and timestamp.

---

## Exact UTF-8 Content Semantics

InscribeSoul V1.1 hashes exact UTF-8 content. Any character, whitespace, trailing space, line-ending (CRLF vs LF), or capitalization change creates a completely different proof hash.

---

## Smart Contract Specification

The canonical Solidity implementation is maintained strictly in [`contracts/InscribeSoul.sol`](file:///c:/Users/graci/.gemini/antigravity-ide/scratch/inscribesoul/contracts/InscribeSoul.sol).

### Overview:
- **Solidity Version**: `^0.8.24`
- **Protocol Version**: `INSCRIBESOUL_V1_1`
- **Event Signatures**:
  - `PublicInscription(address indexed author, bytes32 indexed proofHash, string content, uint256 timestamp)`
  - `PrivateProof(address indexed author, bytes32 indexed commitmentHash, uint256 timestamp)`
  - `ProofRevealed(address indexed author, bytes32 indexed originalCommitmentHash, bytes32 indexed originalTransactionHash, bytes32 secret, string content, uint256 timestamp)`

---

## Local Development & Testing

```bash
# Install dependencies
npm install

# Run Vite dev server
npm run dev

# Run Hardhat test suite (43 passing tests)
npx hardhat test

# Build production bundle
npm run build
```

---

## License

MIT License
