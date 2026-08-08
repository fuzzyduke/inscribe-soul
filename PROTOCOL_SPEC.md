# InscribeSoul Protocol Specification V1.1

**Protocol Version**: `INSCRIBESOUL_V1_1`

---

## 1. Scope & Protocol Purpose

InscribeSoul is an intentionally minimalist, non-custodial Web3 protocol that creates permanent, cryptographically verifiable blockchain timestamps.

The protocol provides cryptographic evidence that a specific EVM wallet address publicly inscribed specific content, or committed to specific hidden content, no later than a particular blockchain block timestamp.

---

## 2. Versioning Model & Namespace Separation

InscribeSoul explicitly separates version namespaces to ensure backwards compatibility:

- **Contract Protocol Version** (`PROTOCOL_VERSION()`): `INSCRIBESOUL_V1_1` (identifies active contract bytecode capabilities).
- **Public Cryptographic Hashing Domain** (`PUBLIC_DOMAIN`): `INSCRIBESOUL_PUBLIC_V1` (`0xc00bd1280f0e33060f3d5a20ee35c0547aed0428775278235daa2a2dc87da9a2`).
- **Private Cryptographic Hashing Domain** (`PRIVATE_DOMAIN`): `INSCRIBESOUL_PRIVATE_V1` (`0x600839658e1d010994e7bfec2d665e8315b99808c0749aec6e12dcaf62454200`).
- **Proof Package Format** (`format`): `INSCRIBESOUL_PROOF_PACKAGE_V1`.
- **Portable Proof Blob Prefix**: `INSCRIBESOUL-PROOF-V1:`.

> **Compatibility Guarantee**: Hashing domains remain identical across V1 and V1.1 deployments. Private Proof commitments generated under V1 recompute identically under V1.1.

---

## 3. Official Deployment Matrix & Historical Registry

Detailed deployment block numbers, contract addresses, and verification receipts are maintained in [`DEPLOYMENTS.md`](DEPLOYMENTS.md).

| Contract Version | Network | Contract Address | Deployment Block | Reveal Support |
| :--- | :--- | :--- | :--- | :--- |
| `INSCRIBESOUL_V1` | Base Sepolia (`84532`) | [`0x6fDFe67228CbB294880cc85DD0Fbca3F2C05b346`](https://sepolia.basescan.org/address/0x6fDFe67228CbB294880cc85DD0Fbca3F2C05b346) | `#45206768` | False |
| `INSCRIBESOUL_V1_1` | Base Sepolia (`84532`) | [`0xdD7317881A75522Cd5B8853003A0f8D6dFA99AcB`](https://sepolia.basescan.org/address/0xdD7317881A75522Cd5B8853003A0f8D6dFA99AcB) | `#45207053` | True |

---

## 4. Exact Content Semantics

InscribeSoul operates strictly on **exact UTF-8 byte sequences**:
- **No Whitespace Normalization**: Leading spaces, trailing spaces, tabs (`\t`), line feeds (`\n`), and carriage returns (`\r\n`) are preserved strictly.
- **No Unicode Normalization**: Unicode string bytes are hashed exactly as input.
- **No String Trimming**: The protocol never calls `.trim()` on user content. Any modification of whitespace or capitalization produces a completely different cryptographic commitment.

---

## 5. Cryptographic Hashing Algorithms

### Public Inscription Proof Hash

$$\text{proofHash} = \text{keccak256}(\text{abi.encode}(\text{PUBLIC\_DOMAIN}, \text{authorAddress}, \text{content}))$$

- **`PUBLIC_DOMAIN`**: `bytes32`
- **`authorAddress`**: `address`
- **`content`**: `string` (exact UTF-8)

---

### Private Proof Commitment Hash (Salted Commitment)

$$\text{commitmentHash} = \text{keccak256}(\text{abi.encode}(\text{PRIVATE\_DOMAIN}, \text{authorAddress}, \text{secret}, \text{content}))$$

- **`PRIVATE_DOMAIN`**: `bytes32`
- **`authorAddress`**: `address`
- **`secret`**: `bytes32` (32 random entropy bytes generated via `window.crypto.getRandomValues`)
- **`content`**: `string` (exact UTF-8)

---

## 6. On-Chain Reveal Algorithm

The Solidity `revealProof()` function unseals a Private Proof on-chain:

1. Recomputes $\text{keccak256}(\text{abi.encode}(\text{PRIVATE\_DOMAIN}, \text{msg.sender}, \text{secret}, \text{content}))$.
2. Reverts with `CommitmentMismatch()` if recomputed commitment does not equal `originalCommitmentHash`.
3. Emits `ProofRevealed(author, originalCommitmentHash, originalTransactionHash, secret, content, timestamp)`.

---

## 7. Shared Canonical Preflight & Fee Source of Truth

Every transaction preview and signature request for new write operations executes a unified canonical preflight check (`verifyCanonicalContract`):

1. **Network Chain Switch**: Forces wallet network switch to target chain ID before querying contract.
2. **Bytecode Verification**: Ensures smart contract bytecode exists at `contractAddress`.
3. **Protocol Version Match**: Validates `PROTOCOL_VERSION()` equals `INSCRIBESOUL_V1_1`.
4. **Domain Constants Match**: Verifies `PUBLIC_DOMAIN` and `PRIVATE_DOMAIN` match expected constants.
5. **Fail-Closed Protocol Fee Read**: Reads `protocolFee()` live from RPC. Fails closed with an explicit network error if fee cannot be determined; never falls back to 0 ETH.

---

## 8. Smart Contract Interface & Events

The canonical Solidity interface is defined in [`contracts/InscribeSoul.sol`](contracts/InscribeSoul.sol):

### View Functions
- `PROTOCOL_VERSION() external view returns (string)`
- `PUBLIC_DOMAIN() external view returns (bytes32)`
- `PRIVATE_DOMAIN() external view returns (bytes32)`
- `protocolFee() external view returns (uint256)`
- `MAX_PROTOCOL_FEE() external view returns (uint256)`

### State-Changing Functions
- `inscribePublic(string calldata content) external payable`
- `inscribeProof(bytes32 commitmentHash) external payable`
- `revealProof(bytes32 originalCommitmentHash, bytes32 originalTransactionHash, bytes32 secret, string calldata content) external payable`
- `setProtocolFee(uint256 newFee) external` (Owner only)
- `withdrawFees() external` (Owner only)

### Contract Events
- `event PublicInscription(address indexed author, bytes32 indexed proofHash, string content, uint256 timestamp)`
- `event PrivateProof(address indexed author, bytes32 indexed commitmentHash, uint256 timestamp)`
- `event ProofRevealed(address indexed author, bytes32 indexed originalCommitmentHash, bytes32 indexed originalTransactionHash, bytes32 secret, string content, uint256 timestamp)`
- `event FeeUpdated(uint256 newFee)`
- `event FeesWithdrawn(address indexed recipient, uint256 amount)`

### Custom Errors
- `error InsufficientProtocolFee(uint256 provided, uint256 required)`
- `error CommitmentMismatch()`
- `error FeeExceedsMaximum(uint256 provided, uint256 maximum)`
- `error Unauthorized()`
- `error WithdrawFailed()`

---

## 9. Private Proof Package & Portable Blob Specification

InscribeSoul uses a single canonical `PrivateProofPackage` schema that serializes into two portable recovery representations:

### Canonical JSON Schema (`PrivateProofPackage`)

```json
{
  "format": "INSCRIBESOUL_PROOF_PACKAGE_V1",
  "protocol": "INSCRIBESOUL_PRIVATE_V1",
  "label": "Concentrated Liquidity Lending Idea",
  "content": "exact original text",
  "secret": "0x...",
  "author": "0x...",
  "commitmentHash": "0x...",
  "chainId": 84532,
  "transactionHash": "0x...",
  "blockNumber": 1234567,
  "blockTimestamp": 1700000000,
  "blockTimestampISO": "2026-08-08T00:00:00.000Z",
  "contractAddress": "0xdD7317881A75522Cd5B8853003A0f8D6dFA99AcB"
}
```

### Copyable Portable Proof Blob Specification

- **Prefix**: `INSCRIBESOUL-PROOF-V1:`
- **Encoding**: UTF-8 JSON $\longrightarrow$ Base64URL (url-safe, copy-paste resilient without line wraps).
- **Format**: `INSCRIBESOUL-PROOF-V1:<base64url-encoded-utf8-json>`
- **Security Property**: Base64URL is an encoding format, NOT encryption. Anyone with access to the Portable Proof Blob can read the original text and secret salt.

---

## 10. Official Reproducible Test Vectors

For implementation-independent test vectors with full ABI-encoded byte payloads, consult [`TEST_VECTORS.md`](TEST_VECTORS.md).
