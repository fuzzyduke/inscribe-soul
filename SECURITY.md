# InscribeSoul Security & Threat Model Specification

---

## 1. Security & Privacy Model Overview

InscribeSoul provides client-side cryptographic timestamping and verifiable secret-bound commitments. Understanding its security boundaries requires distinguishing between **Sealed State** and **Revealed State**.

```text
+-----------------------------------------------------------------------------------+
|                                 SEALED STATE                                      |
|                                                                                   |
|  [ User Content ] + [ Secret Salt ] ---> Client-Side Hashing (window.crypto)      |
|                                                    |                              |
|                                                    v                              |
|                                         32-byte commitmentHash                    |
|                                                    |                              |
|                                                    v                              |
|                                         EVM Calldata & Log                        |
|                                                                                   |
|  * Plaintext and secret salt NEVER leave the user's browser or touch RPC nodes.   |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                                REVEALED STATE                                     |
|                                                                                   |
|  User Submits Reveal ---> Contract Recomputes Commitment Live On-Chain            |
|                                                    |                              |
|                                                    v                              |
|                                  Emits ProofRevealed Event                        |
|                                                                                   |
|  * Plaintext, secret salt, and commitment become PERMANENTLY PUBLIC on-chain.      |
+-----------------------------------------------------------------------------------+
```

---

## 2. Private Proof Threat Model

### Security Guarantees While Sealed
1. **Confidentiality**: The original text and secret salt are never transmitted over HTTP, JSON-RPC, or EVM transaction calldata while sealed.
2. **Pre-image & Dictionary Resistance**: Every Private Proof requires a 32-byte cryptographically secure secret salt (`window.crypto.getRandomValues`). This entropy prevents attackers from using rainbow tables or candidate dictionary attacks to guess short or common texts from the public 32-byte `commitmentHash`.
3. **Immutability**: Once included in an L2 block, the block timestamp and `commitmentHash` cannot be altered, forged, or backdated.

### Security Boundaries & Unprotected Scenarios
Private Proof confidentiality **DOES NOT** protect against:
- **Local Device Compromise**: If malware, malicious browser extensions, or unauthorized users access the local browser storage or exported `.json` / Portable Proof files.
- **Exposure of Portable Proof Material**: The exported JSON proof package and `INSCRIBESOUL-PROOF-V1:` Portable Proof Blob contain the raw text and secret salt in plaintext (Base64URL encoded, NOT encrypted). Anyone with access to the blob can read the underlying text.
- **Physical Loss of Recovery Material**: If a user loses both their exported recovery package and their exact plaintext + secret salt, the on-chain commitment remains permanently, but the content can never be recovered or revealed.

---

## 3. Reveal Security Boundary & Architecture

When revealing a Private Proof, the Solidity `revealProof()` function performs on-chain recomputation:

```solidity
bytes32 recomputed = keccak256(
    abi.encode(PRIVATE_DOMAIN, msg.sender, secret, content)
);
require(recomputed == originalCommitmentHash, "CommitmentMismatch");
```

### Important Architectural Distinction:
- **On-Chain Check**: Verifies that the caller (`msg.sender`), `secret`, and `content` reproduce the exact `originalCommitmentHash`.
- **Off-Chain / Client Provenance Verification**: EVM smart contracts cannot query historical event log archives. The smart contract itself does not inspect past logs to confirm that `originalTransactionHash` emitted `originalCommitmentHash`. Full verification requires the InscribeSoul client/verifier to inspect canonical RPC block logs to confirm original event inclusion and block timestamp ordering (`origBlockNumber < revealBlockNumber`).

---

## 4. Wallet Security & Authorization

- **Author-Bound Commitments**: The `author` wallet address is explicitly encoded into both Public Inscription hashes and Private Proof commitment hashes.
- **Reveal Authorization**: Because `revealProof()` includes `msg.sender` in its on-chain hash derivation, **only the original author wallet** can submit a transaction that successfully passes contract verification and emits a `ProofRevealed` event. A third party possessing the proof package can read the secret, but cannot execute an author-authenticated on-chain reveal from a different wallet address.

---

## 5. Administrative & Owner Powers

InscribeSoul contracts ([`InscribeSoul.sol`](contracts/InscribeSoul.sol)) are **non-proxy, non-upgradeable, immutable contracts**.

### What the Contract Owner CAN Do:
- **Modify Protocol Fee**: The contract owner can adjust `protocolFee` up to a hardcoded ceiling of `MAX_PROTOCOL_FEE` (`0.1 ETH`).
- **Withdraw Fees**: The contract owner can withdraw accumulated ETH protocol fee revenues to the owner address.

### What the Contract Owner CANNOT Do:
- The owner **CANNOT** alter, delete, or censor past event logs.
- The owner **CANNOT** modify historical block timestamps or event parameters.
- The owner **CANNOT** pause inscription submissions or proof reveals.
- The owner **CANNOT** alter smart contract bytecode or upgrade contract logic.
- The owner **CANNOT** access or reveal Private Proofs.

---

## 6. Vulnerability Disclosure Policy

For the current testnet phase on Base Sepolia, security vulnerabilities or concerns should be reported directly via GitHub repository issues or private message to the repository maintainers. Dedicated security disclosure contacts will be designated prior to mainnet deployment.
