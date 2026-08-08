# InscribeSoul — Permanent Blockchain Timestamps

> **“Give your idea a permanent place in history.”**

[![Protocol Version](https://img.shields.io/badge/Protocol-INSCRIBESOUL__V1__1-blue.svg)](PROTOCOL_SPEC.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Network: Base Sepolia](https://img.shields.io/badge/Network-Base%20Sepolia%20Live-brightgreen.svg)](DEPLOYMENTS.md)

---

## Status Banner

```text
Status: Public Testnet Live on Base Sepolia
Active Protocol Version: INSCRIBESOUL_V1_1
Canonical Contract: 0xdD7317881A75522Cd5B8853003A0f8D6dFA99AcB
Base Mainnet: Not yet deployed
```

---

## Documentation Index

- 📜 [PROTOCOL_SPEC.md](PROTOCOL_SPEC.md) — Complete technical specification, hashing algorithms, and contract ABI.
- 🚀 [DEPLOYMENTS.md](DEPLOYMENTS.md) — Canonical contract deployment registry, block heights, and network statuses.
- 🔒 [SECURITY.md](SECURITY.md) — Threat model, privacy boundaries, sealed vs revealed states, and admin powers.
- 🧪 [TEST_VECTORS.md](TEST_VECTORS.md) — Independent test vectors with full ABI-encoded byte payloads.
- 📜 [CHANGELOG.md](CHANGELOG.md) — Protocol version history and client change log.
- 📄 [LICENSE](LICENSE) — Root MIT License text.
- 🤝 [CONTRIBUTING.md](CONTRIBUTING.md) — Contributor setup and architecture principles.

---

## What InscribeSoul Does

**InscribeSoul** is an intentionally minimalist, non-custodial Web3 protocol that creates permanent, cryptographically verifiable blockchain timestamps.

It allows users to write text (manifestos, inventions, predictions, code, prior art) and anchor it permanently to an EVM blockchain in one of two modes:
1. **Public Inscription**: The content is stored publicly on-chain.
2. **Private Proof**: The content is hashed locally with a random 32-byte secret salt. Only the 32-byte commitment hash is recorded on-chain while the text remains private. Later, the original author can choose to **Reveal** the proof publicly on-chain.

---

## What InscribeSoul Proves — and What It Does Not

### What It Proves:
- Cryptographic evidence that a specific EVM wallet publicly inscribed content, or committed to hidden content, **no later than a specific blockchain block timestamp**.
- For Private Proofs, a valid later reveal proves that the revealed content and secret reproduce a commitment previously recorded on-chain by the same wallet.

### What It Does NOT Prove:
- It does **NOT** prove that the user was the legal inventor, author, or copyright owner.
- It does **NOT** prove legal patent priority or copyright ownership in a court of law.
- It does **NOT** prove that the content is original or that no one else conceived it earlier.
- It does **NOT** prove that a human (rather than a bot) generated the text.

---

## Three Modes of Preservation

```text
+---------------------+-----------------------------------+-----------------------------------+
| Feature             | Mode 1: Public Inscription        | Mode 2: Private Proof (Sealed)    |
+---------------------+-----------------------------------+-----------------------------------+
| Privacy             | Public                            | Salted Client-Side Commitment     |
| On-Chain Data       | Raw text + On-chain proof hash    | 32-byte commitment hash only      |
| Network Payload     | Text in calldata                  | Secret salt NEVER touches network |
| Unsealing / Reveal  | N/A (Already public)              | Optional on-chain reveal (Mode 3) |
+---------------------+-----------------------------------+-----------------------------------+
```

### Mode 3: Reveal Proof (V1.1 Capability)
Publicly unseals a previously recorded Private Proof on-chain. The smart contract recomputes the salted commitment live on-chain. Upon success, it emits a `ProofRevealed` event containing the unsealed text and secret, while proving the timestamp of the original private commitment.

> **Privacy Notice**: Revealing a Private Proof permanently publishes the text and secret to the public blockchain.

---

## Simple Mental Model

$$\text{Write Content} \longrightarrow \text{Select Privacy Mode} \longrightarrow \text{Inscribe to L2} \longrightarrow \text{Save Proof Package} \longrightarrow \text{Verify / Reveal}$$

---

## Live Base Sepolia Verification Example

An actual execution lifecycle recorded on Base Sepolia:

- **Network**: Base Sepolia (`chainId: 84532`)
- **Canonical V1.1 Contract**: [`0xdD7317881A75522Cd5B8853003A0f8D6dFA99AcB`](https://sepolia.basescan.org/address/0xdD7317881A75522Cd5B8853003A0f8D6dFA99AcB)
- **Author Wallet**: `0x4B6254BCdFf3D98845393f8594B1C5E6Ba6Dc75C`
- **Original Private Proof Transaction**: [`0x4684bdcc7d76200b96951158df4e3c482acf3a2d6f5cba3a557048ff42f937c1`](https://sepolia.basescan.org/tx/0x4684bdcc7d76200b96951158df4e3c482acf3a2d6f5cba3a557048ff42f937c1) (Block `#45207153`)
- **Original Commitment Hash**: `0x89ee78787ed0066a9bb82c0015cc362d0249ca50b827a6a3c10be41b79edcf15`
- **Reveal Transaction Hash**: [`0xd557818322d26018cfb77b66be4d78746fb9126b001b3377a7f515b71fcd0141`](https://sepolia.basescan.org/tx/0xd557818322d26018cfb77b66be4d78746fb9126b001b3377a7f515b71fcd0141`) (Block `#45207192`)
- **Revealed Plaintext**: `"hidden 6"`

---

## Private Proof Recovery & Portable Proof Material

Users can recover and reveal Private Proofs using three redundant input methods:
1. **JSON Proof File**: Complete `PrivateProofPackage` JSON file (`inscribesoul-proof-XXXXXXXX.json`).
2. **Portable Proof Blob**: Copy-paste string in the format `INSCRIBESOUL-PROOF-V1:<base64url-encoded-json>`.
3. **Manual Recovery**: Exact original text + secret salt key. The application automatically scans historical RPC logs to discover the original commitment transaction.

> **Security Warning**: Base64URL encoding is **NOT** encryption. Anyone possessing your JSON proof package or Portable Proof Blob can read your raw text and secret salt. Store recovery files securely in password managers or encrypted archives.

---

## Local Development & Running Tests

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Run Hardhat test suite (44 passing tests)
npm test

# Build production distribution
npm run build
```

---

## License

InscribeSoul is released under the open-source [MIT License](LICENSE).
