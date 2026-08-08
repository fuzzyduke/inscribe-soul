# InscribeSoul Security & Threat Model Specification

---

## 1. Security & Privacy Model Overview

InscribeSoul provides client-side cryptographic timestamping and verifiable secret-bound commitments. Understanding its security boundaries requires distinguishing between **Sealed State** and **Revealed State**.

```text
+-----------------------------------------------------------------------------------+
|                                 SEALED STATE                                      |
|                                                                                   |
|  [ User Content ] + [ Secret Salt ] ---> Hashing (ethers.AbiCoder + keccak256)    |
|       (window.crypto.getRandomValues)                     |                       |
|                                                           v                       |
|                                                32-byte commitmentHash             |
|                                                           |                       |
|                                                           v                       |
|                                                EVM Calldata & Log                 |
|                                                                                   |
|  * Plaintext and secret salt NEVER leave the user's browser or touch RPC nodes.   |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                                REVEALED STATE                                     |
|                                                                                   |
|  User Submits Reveal ---> Contract Recomputes Commitment Live On-Chain            |
|                                                           |                       |
|                                                           v                       |
|                                         Emits ProofRevealed Event                 |
|                                                                                   |
|  * Plaintext, secret salt, and commitment become PERMANENTLY PUBLIC on-chain.      |
+-----------------------------------------------------------------------------------+
```

---

## 2. Cryptographic Operations vs Secret Salt Generation

To ensure technical accuracy across documentation:
- **Random Secret Salt Generation**: Uses the browser's native Web Crypto API `window.crypto.getRandomValues(new Uint8Array(32))` to generate cryptographically secure 32-byte random entropy.
- **Commitment & Proof Hashing**: Hashing operations use `ethers.AbiCoder` for standard EVM ABI-encoding combined with Keccak-256 (`ethers.keccak256`). Hashing operations do not use `window.crypto`.

---

## 3. Private Proof Threat Model

### Security Guarantees While Sealed
1. **Confidentiality**: Plaintext content and secret salt keys are never transmitted over HTTP, JSON-RPC, or EVM transaction calldata while sealed.
2. **Pre-image & Dictionary Resistance**: Every Private Proof requires a 32-byte secret salt (`window.crypto.getRandomValues`). This entropy prevents attackers from using rainbow tables or candidate dictionary attacks to guess short or common texts from the public 32-byte `commitmentHash`.
3. **Immutability & Consensus Protection**: Once included in a sufficiently confirmed blockchain block, transaction and event data are protected by network consensus. InscribeSoul does not control block timestamps.

### Security Boundaries & Unprotected Scenarios
Private Proof confidentiality **DOES NOT** protect against:
- **Local Device Compromise**: If malware, malicious browser extensions, or unauthorized users access local browser storage or exported `.json` / Portable Proof files.
- **Exposure of Portable Proof Material**: Exported JSON proof packages and `INSCRIBESOUL-PROOF-V1:` Portable Proof Blobs contain raw text and secret salt keys in plaintext (Base64URL encoded, NOT encrypted). Anyone with access to the blob can read the underlying text.
- **Loss of Recovery Material**: If a user loses both their exported recovery package and their exact plaintext + secret salt, the on-chain commitment remains permanently, but content recovery or unsealing becomes impossible.

---

## 4. Reveal Security Boundary & Contract Semantics

When revealing a Private Proof, the Solidity `revealProof()` function in [`contracts/InscribeSoul.sol`](contracts/InscribeSoul.sol) executes the following exact code:

```solidity
bytes32 computedCommitment = keccak256(
    abi.encode(
        PRIVATE_DOMAIN,
        msg.sender,
        secret,
        content
    )
);

if (computedCommitment != originalCommitmentHash) revert CommitmentMismatch();
```

### Important Architectural Distinction:
- **On-Chain Contract Verification**: Recomputes the salted commitment live on-chain and verifies that the caller (`msg.sender`), `secret`, and `content` produce `originalCommitmentHash`.
- **Off-Chain / Client Provenance Verification**: EVM smart contracts cannot query historical block event log archives. The smart contract itself does not inspect past logs to verify that `originalTransactionHash` emitted `originalCommitmentHash`. Full verification requires the InscribeSoul client/verifier to inspect canonical RPC block logs to confirm original event inclusion and block timestamp ordering (`origBlockNumber < revealBlockNumber`).

---

## 5. Wallet Security & Authorization

- **Author-Bound Commitments**: The `author` wallet address is explicitly encoded into both Public Inscription hashes and Private Proof commitment hashes.
- **Reveal Authorization**: Because `revealProof()` includes `msg.sender` in its on-chain hash derivation, **only the original author wallet** can submit a transaction that successfully passes contract verification and emits a `ProofRevealed` event. A third party possessing the proof package can read the text and secret, but cannot execute an author-authenticated on-chain reveal from a different wallet address.

---

## 6. Administrative & Owner Powers

InscribeSoul contracts ([`InscribeSoul.sol`](contracts/InscribeSoul.sol)) are **non-proxy, non-upgradeable, immutable contracts**.

### What the Contract Owner CAN Do:
- **Modify Protocol Fee**: The contract owner can adjust `protocolFee` up to a hardcapped ceiling of `MAX_PROTOCOL_FEE` (`0.1 ETH`).
- **Withdraw Fees**: The contract owner can withdraw accumulated ETH protocol fee revenues to the owner address.

### What the Contract Owner CANNOT Do:
- The owner **CANNOT** alter, delete, or censor past event logs.
- The owner **CANNOT** modify historical block timestamps or event parameters.
- The owner **CANNOT** pause inscription submissions or proof reveals.
- The owner **CANNOT** alter smart contract bytecode or upgrade contract logic.
- The owner **CANNOT** access or reveal Private Proofs.

---

## 7. Security Vulnerability Disclosure Policy

During the current testnet phase on Base Sepolia, do **NOT** publicly disclose potentially exploitable security vulnerabilities in a public GitHub issue. Contact the repository maintainer through available private communication channels. A dedicated security disclosure channel will be established before mainnet deployment.
