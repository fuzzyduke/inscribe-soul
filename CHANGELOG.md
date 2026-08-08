# InscribeSoul Protocol Changelog

All notable changes to the InscribeSoul protocol, smart contracts, security architecture, and application client are documented in this file.

---

## [V1.1] - 2026-08-08 (Base Sepolia Live Testnet)

### Smart Contract Changes
- **On-Chain Proof Reveal Support**: Introduced the `revealProof(bytes32 originalCommitmentHash, bytes32 originalTransactionHash, bytes32 secret, string calldata content)` function in `InscribeSoul.sol`.
- **`ProofRevealed` Event**: Added event emitting `author`, `originalCommitmentHash`, `originalTransactionHash`, `secret`, `content`, and `timestamp`.
- **On-Chain Commitment Verification**: Recomputes `keccak256(abi.encode(PRIVATE_DOMAIN, msg.sender, secret, content))` live on-chain during `revealProof` execution and enforces equality against `originalCommitmentHash`.
- **Deployed Contract Address**: Deployed new immutable V1.1 contract to Base Sepolia at [`0xdD7317881A75522Cd5B8853003A0f8D6dFA99AcB`](https://sepolia.basescan.org/address/0xdD7317881A75522Cd5B8853003A0f8D6dFA99AcB) (Deployment Block: `#45207053`).

### Client & Application Infrastructure Changes
- **Shared Canonical Contract Preflight**: Added `verifyCanonicalContract` enforcing network switching, bytecode verification, `PROTOCOL_VERSION()` matching, domain constant validation (`PUBLIC_DOMAIN`, `PRIVATE_DOMAIN`), and fail-closed fee reading (`protocolFee()`) before transaction preview or signature prompt.
- **Chunked Historical Query Engine**: Implemented `getLogsChunked` retrieving event logs in bounded 1,800-block iterations starting from `deploymentBlock`.
- **Historical V1 Compatibility**: Added `CANONICAL_HISTORICAL_REGISTRY` allowing historical V1 proofs (`0x6fDFe67228CbB294880cc85DD0Fbca3F2C05b346`) to be discovered, verified, and revealed on V1.1.
- **Recovery Package Formats**: Supported downloadable JSON proof package (`inscribesoul-proof-XXXXXXXX.json`), Base64URL Portable Proof Blob (`INSCRIBESOUL-PROOF-V1:<base64url>`), and manual recovery (`exact text + secret`).
- **Exact UTF-8 Content Semantics**: Enforced strict UTF-8 hashing without `.trim()` or normalization across all recovery and verification screens.

---

## [V1.0] - 2026-08-08 (Base Sepolia Initial Deployment)

### Smart Contract Changes
- **Initial Smart Contract**: Deployed original `InscribeSoul.sol` (Protocol Version `INSCRIBESOUL_V1`) to Base Sepolia at [`0x6fDFe67228CbB294880cc85DD0Fbca3F2C05b346`](https://sepolia.basescan.org/address/0x6fDFe67228CbB294880cc85DD0Fbca3F2C05b346) (Deployment Block: `#45206768`).
- **Public Inscriptions**: Added `inscribePublic(string calldata content)` emitting `PublicInscription`.
- **Private Proofs**: Added `inscribeProof(bytes32 commitmentHash)` emitting `PrivateProof`.
- **Protocol Fee Management**: Added owner fee configuration up to `MAX_PROTOCOL_FEE` (`0.1 ETH`) and fee withdrawal functionality.

### Client & Application Features
- Initial release featuring Public Inscriptions, Private Proof creation, local label storage, and verification search.
