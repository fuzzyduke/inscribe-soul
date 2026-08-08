# InscribeSoul V1 — Protocol & Application

> **“Give your idea a permanent place in history.”**

**Target Subdomain**: `inscribesoul.valhallala.com`  
**Protocol Version**: `INSCRIBESOUL_V1`  

---

## Deployment Status Matrix

| Network | Status | Canonical Contract Address | Selectable in UI |
| :--- | :--- | :--- | :--- |
| **Base Sepolia (Testnet)** | **LIVE TESTNET** | [`0x6fDFe67228CbB294880cc85DD0Fbca3F2C05b346`](https://sepolia.basescan.org/address/0x6fDFe67228CbB294880cc85DD0Fbca3F2C05b346) | **Yes** |
| **Base Mainnet** | NOT DEPLOYED | `N/A (Coming Soon)` | No |
| **Ethereum Sepolia** | NOT DEPLOYED | `N/A (Coming Soon)` | No |
| **Ethereum Mainnet** | NOT DEPLOYED | `N/A (Coming Soon)` | No |

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

---

### Mode 2: Private Proof
- **Use Case**: Confidential startup ideas, inventions, research prior art, proprietary strategies, unreleased code.
- **Privacy Level**: Zero-Knowledge Client-Side Commitment.
- **On-Chain Data**: Only the 32-byte `commitmentHash` is broadcast. Raw text and secret salt **NEVER** touch the network.
- **Cryptographic Salt**: Every Private Proof generates a unique, cryptographically secure 32-byte secret salt (`window.crypto.getRandomValues`) to prevent offline dictionary/candidate guessing attacks.
- **Client-Side Commitment Formula**:
  $$\text{commitmentHash} = \text{keccak256}(\text{abi.encode}(\text{PRIVATE\_DOMAIN}, \text{authorWallet}, \text{secret}, \text{content}))$$

---

## Exact UTF-8 Content Semantics

InscribeSoul V1 hashes exact UTF-8 content. Any character, whitespace, trailing space, line-ending (CRLF vs LF), or capitalization change creates a completely different proof hash.

**Any character, whitespace, encoding-relevant change, or line-ending change produces a different proof.**

---

## Smart Contract Specification

The canonical Solidity implementation is maintained strictly in [`contracts/InscribeSoul.sol`](file:///c:/Users/graci/.gemini/antigravity-ide/scratch/inscribesoul/contracts/InscribeSoul.sol).

### Overview:
- **Solidity Version**: `^0.8.20`
- **Ownership / Admin**: `Ownable` (allows updating `protocolFee` capped by `MAX_PROTOCOL_FEE = 0.1 ether`)
- **Event Signatures**:
  - `PublicInscription(address indexed author, bytes32 indexed proofHash, string content, uint256 timestamp)`
  - `PrivateProof(address indexed author, bytes32 indexed commitmentHash, uint256 timestamp)`

---

## Local Development & Testing

```bash
# Install dependencies
npm install

# Run Vite dev server
npm run dev

# Run Hardhat security & integration test suite
npx hardhat test

# Build production bundle
npm run build
```

---

## License

MIT License
