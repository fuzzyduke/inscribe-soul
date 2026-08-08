# InscribeSoul V1.1 — Protocol & Application

> **“Give your idea a permanent place in history.”**

**Target Subdomain**: `inscribesoul.valhallala.com`  
**Protocol Version**: `INSCRIBESOUL_V1_1`  

---

## Deployment Status Matrix

| Network | Status | Canonical Contract Address | Verified Deployment Block | Selectable in UI |
| :--- | :--- | :--- | :--- | :--- |
| **Base Sepolia (Testnet)** | **LIVE V1.1 TESTNET** | [`0xdD7317881A75522Cd5B8853003A0f8D6dFA99AcB`](https://sepolia.basescan.org/address/0xdD7317881A75522Cd5B8853003A0f8D6dFA99AcB) | `#45207053` | **Yes** |
| **Base Mainnet** | NOT DEPLOYED | `N/A (Coming Soon)` | `N/A` | No |
| **Ethereum Sepolia** | NOT DEPLOYED | `N/A (Coming Soon)` | `N/A` | No |
| **Ethereum Mainnet** | NOT DEPLOYED | `N/A (Coming Soon)` | `N/A` | No |

---

## Historical Contract Registry

For provenance, historical queries, and manual recovery, InscribeSoul accepts original Private Proof commitments from registered canonical contracts:

- **Historical V1 Contract**: [`0x6fDFe67228CbB294880cc85DD0Fbca3F2C05b346`](https://sepolia.basescan.org/address/0x6fDFe67228CbB294880cc85DD0Fbca3F2C05b346) — `INSCRIBESOUL_V1` (Deployment Block: `#45206768`)
- **Current Canonical V1.1 Contract**: [`0xdD7317881A75522Cd5B8853003A0f8D6dFA99AcB`](https://sepolia.basescan.org/address/0xdD7317881A75522Cd5B8853003A0f8D6dFA99AcB) — `INSCRIBESOUL_V1_1` (Deployment Block: `#45207053`)

> **Note**: All new writes (Public Inscription, Private Proof, and Reveal Proof) execute strictly against the active canonical V1.1 contract.

---

## Executive Summary

**InscribeSoul** is an intentionally minimalist, non-custodial Web3 protocol that creates permanent, cryptographically verifiable blockchain timestamps proving that a wallet address conceived, wrote, predicted, or recorded specific text at an exact point in time.

The product deliberately excludes tokens, NFTs, social features, market dynamics, file storage, or centralized databases. It focuses entirely on a clean core lifecycle:

$$\text{Write} \longrightarrow \text{Choose Privacy Mode} \longrightarrow \text{Choose Chain} \longrightarrow \text{Inscribe} \longrightarrow \text{Verify / Reveal}$$

---

## Architectural Principles

1. **On-Chain Permanence via Chunked EVM Event Logs**:
   - Inscriptions are emitted as indexed EVM smart contract event logs (`PublicInscription`, `PrivateProof`, and `ProofRevealed`).
   - Querying uses a reusable chunked log scanner (`getLogsChunked`) starting from verified deployment blocks (`deploymentBlock`).
   - Deduplicates and preserves strict blockchain ordering without relying on off-chain databases or centralized indexers.

2. **Client-Side Privacy Guarantee**:
   - For **Private Proofs**, raw text is never sent to any server, database, or blockchain node.
   - Commitment hashes are computed purely inside the user's browser using standard Web Crypto API (`window.crypto`).

3. **Shared Fail-Closed Contract Preflight**:
   - Every write transaction (Public, Private, Reveal) and preview executes a unified canonical preflight check (`verifyCanonicalContract`).
   - Enforces wallet chain switching first, validates bytecode presence, verifies exact `PROTOCOL_VERSION()`, matches cryptographic domain constants (`PUBLIC_DOMAIN`, `PRIVATE_DOMAIN`), and reads `protocolFee()` fail-closed (never falling back to 0 ETH on RPC failure).

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
- **Privacy Level**: Salted Client-Side Cryptographic Commitment.
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

## Live V1.1 Reveal Validation Example

The following is an actual, live execution lifecycle recorded on Base Sepolia:

- **Network**: Base Sepolia (`chainId: 84532`)
- **Canonical V1.1 Contract**: [`0xdD7317881A75522Cd5B8853003A0f8D6dFA99AcB`](https://sepolia.basescan.org/address/0xdD7317881A75522Cd5B8853003A0f8D6dFA99AcB)
- **Author Wallet**: `0x4B6254BCdFf3D98845393f8594B1C5E6Ba6Dc75C`
- **Original Private Proof Transaction**: [`0x4684bdcc7d76200b96951158df4e3c482acf3a2d6f5cba3a557048ff42f937c1`](https://sepolia.basescan.org/tx/0x4684bdcc7d76200b96951158df4e3c482acf3a2d6f5cba3a557048ff42f937c1)
- **Original Private Commitment Hash**: `0x89ee78787ed0066a9bb82c0015cc362d0249ca50b827a6a3c10be41b79edcf15`
- **Original Block Height**: `#45207153` (Timestamp: `2026-08-08T09:47:48.000Z`)
- **Reveal Transaction Hash**: [`0xd557818322d26018cfb77b66be4d78746fb9126b001b3377a7f515b71fcd0141`](https://sepolia.basescan.org/tx/0xd557818322d26018cfb77b66be4d78746fb9126b001b3377a7f515b71fcd0141)
- **Reveal Block Height**: `#45207192` (Timestamp: `2026-08-08T09:49:45.000Z`)
- **Revealed Content**: `"hidden 6"`

### On-Chain Provenance Verification Result:
```text
✓ Original PrivateProof event exists on Base Sepolia
✓ Original event emitted by canonical InscribeSoul contract 0xdD7317881A75522Cd5B8853003A0f8D6dFA99AcB
✓ Original author matches (0x4B6254...6Dc75C)
✓ Revealed content + secret reproduce original commitment 0x89ee78...edcf15
✓ Reveal author matches original author
✓ Original proof (#45207153) predates Reveal (#45207192)
```

---

## Recovery Material & Portable Proof Blob

To ensure users never need to record or manage raw technical hashes:

1. **Downloadable JSON Proof File**:
   Contains complete `PrivateProofPackage` JSON (`inscribesoul-proof-XXXXXXXX.json`).
2. **Copyable Portable Proof Blob**:
   Format: `INSCRIBESOUL-PROOF-V1:<base64url-encoded-utf8-json>`
   Copy-paste safe, versioned string that can be backed up in password managers or encrypted notes.
3. **Manual Recovery**:
   Given **Exact Original Text** + **Secret Salt Key**, InscribeSoul automatically queries blockchain RPC logs to discover the original commitment transaction hash, block height, and timestamp across historical deployment contracts.

---

## Exact UTF-8 Content Semantics

InscribeSoul V1.1 hashes exact UTF-8 content. Any character, whitespace, trailing space, line-ending (CRLF vs LF), or capitalization change creates a completely different proof hash.

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
