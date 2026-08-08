# InscribeSoul Protocol Specification V1.1

**Protocol Version**: `INSCRIBESOUL_V1_1`

---

## 1. Scope & Protocol Purpose

InscribeSoul is an intentionally minimalist, non-custodial Web3 protocol that creates permanent, cryptographically verifiable blockchain timestamps.

The protocol provides cryptographic evidence that a specific EVM wallet address publicly inscribed specific content, or committed to specific hidden content, **no later than a particular blockchain block timestamp**.

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

Commitment hashing in the application client (`src/utils/hashing.ts`) uses `ethers.AbiCoder` for standard EVM ABI-encoding combined with Keccak-256 (`ethers.keccak256`).

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
- **`secret`**: `bytes32` (32 random entropy bytes generated via Browser Web Crypto API `window.crypto.getRandomValues`)
- **`content`**: `string` (exact UTF-8)

---

## 6. On-Chain Reveal Algorithm

The Solidity `revealProof()` function in [`contracts/InscribeSoul.sol`](contracts/InscribeSoul.sol) unseals a Private Proof on-chain:

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

1. Recomputes $\text{keccak256}(\text{abi.encode}(\text{PRIVATE\_DOMAIN}, \text{msg.sender}, \text{secret}, \text{content}))$.
2. Reverts with custom error `CommitmentMismatch()` if the recomputed commitment does not equal `originalCommitmentHash`.
3. Emits `ProofRevealed(author, originalCommitmentHash, originalTransactionHash, secret, content, timestamp)`.

---

## 7. Fee Semantics & Payment Rules

InscribeSoul smart contracts enforce:

```solidity
if (msg.value < protocolFee) revert InsufficientFee(protocolFee, msg.value);
```

- **Execution Condition**: `msg.value >= protocolFee`.
- **Payment Below Fee**: Transaction reverts with `InsufficientFee(required, provided)`.
- **Exact Payment**: Transaction succeeds.
- **Overpayment**: Transaction succeeds, and any excess ETH above `protocolFee` is retained by the contract balance.
- **Protocol Fee Cap**: `MAX_PROTOCOL_FEE = 0.1 ether` (`100000000000000000 wei`).
- **Current Observed Fee**: `0 ETH` on Base Sepolia V1.1 deployment (owner-adjustable up to `MAX_PROTOCOL_FEE`).

---

## 8. Canonical Timestamp & Block Provenance Semantics

- **Canonical InscribeSoul Timestamp**: Defined strictly as the `block.timestamp` of the L2 blockchain block header containing the event log.
- **Non-Canonical Reference Data**: Local client clock time (`new Date()`) and `clientCreationTimeISO` package fields are cached reference metadata only. Verifiers should re-fetch canonical block headers directly from RPC.
- **Proven Timestamp Scope**: A timestamp establishes that the inscription or commitment was included in a block **no later than the containing block timestamp**.
- **Public vs Private vs Reveal Timestamps**:
  - **Public Inscription**: Timestamp of the block containing `PublicInscription`.
  - **Private Proof**: Timestamp of the block containing `PrivateProof`.
  - **Reveal Proof**: Contains TWO timestamps: (1) original `PrivateProof` block timestamp, and (2) `ProofRevealed` block timestamp (`origBlockNumber < revealBlockNumber`).

---

## 9. Historical Provenance Verification Algorithm

Client verification of a Private Proof and Reveal provenance follows a 15-step deterministic algorithm:

1. Resolve network chain configuration (`chainId`).
2. Resolve registered historical contracts (`getApprovedContractsForChain`).
3. Locate original transaction receipt via RPC (`getTransactionReceipt`).
4. Require receipt exists and status indicates execution success (`status === 1`).
5. Require `receipt.to` matches an approved historical contract address in `CANONICAL_HISTORICAL_REGISTRY`.
6. Verify contract bytecode exists at `receipt.to` (`getCode != 0x`).
7. Query `PROTOCOL_VERSION()` from contract via RPC.
8. Require `PROTOCOL_VERSION()` strictly matches the exact registered `protocolVersion` for that address.
9. Parse receipt logs using contract ABI.
10. Require receipt contains a matching `PrivateProof` event emitted by `receipt.to`.
11. Require event `author` matches claimed author address.
12. Require event `commitmentHash` matches claimed/recomputed commitment hash.
13. Fetch canonical block header (`getBlock(receipt.blockNumber)`).
14. Record canonical block timestamp (`block.timestamp`).
15. If evaluating Reveal Proof, verify `origBlockNumber < revealBlockNumber`.

---

## 10. Smart Contract Custom Errors Reference

The complete custom error interface from [`contracts/InscribeSoul.sol`](contracts/InscribeSoul.sol) is specified below:

```solidity
error InsufficientFee(uint256 required, uint256 provided);
error InvalidCommitmentHash();
error InvalidTransactionHash();
error InvalidSecret();
error EmptyContent();
error CommitmentMismatch();
error FeeExceedsMaximum(uint256 requested, uint256 maximum);
error Unauthorized();
error WithdrawFailed();
```

### Error Conditions:
- **`InsufficientFee(uint256 required, uint256 provided)`**: Reverts when `msg.value` sent with transaction is less than `protocolFee`.
- **`InvalidCommitmentHash()`**: Reverts when `commitmentHash` or `originalCommitmentHash` parameter is `bytes32(0)`.
- **`InvalidTransactionHash()`**: Reverts when `originalTransactionHash` parameter is `bytes32(0)`.
- **`InvalidSecret()`**: Reverts when `secret` salt parameter is `bytes32(0)`.
- **`EmptyContent()`**: Reverts when string `content` payload has length `0`.
- **`CommitmentMismatch()`**: Reverts during `revealProof()` when `keccak256(abi.encode(PRIVATE_DOMAIN, msg.sender, secret, content))` does not equal `originalCommitmentHash`.
- **`FeeExceedsMaximum(uint256 requested, uint256 maximum)`**: Reverts when `setProtocolFee` attempts to set `protocolFee` above `MAX_PROTOCOL_FEE` (`0.1 ETH`).
- **`Unauthorized()`**: Reverts when a function protected by `onlyOwner` is called by an account other than `owner`.
- **`WithdrawFailed()`**: Reverts when low-level ETH transfer fails during `withdrawFees()`.

---

## 11. Private Proof Package Specification

The TypeScript `PrivateProofPackage` schema (`src/utils/hashing.ts`) defines recovery and verification packages:

| Field | Type | Required? | Sensitive? | Hashed in Commitment? | Data Class | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `format` | `string` | Yes | No | No | Protocol Header | Package format identifier (`INSCRIBESOUL_PROOF_PACKAGE_V1`). |
| `protocol` | `string` | Yes | No | No | Protocol Header | Hashing domain identifier (`INSCRIBESOUL_PRIVATE_V1`). |
| `content` | `string` | Yes | **YES** | **YES** | Sensitive Input | Raw, exact UTF-8 original content text. |
| `secret` | `string` | Yes | **YES** | **YES** | Sensitive Input | 32-byte hex secret salt key (`0x...`). |
| `author` | `string` | Yes | No | **YES** | Author Identity | Checksummed EVM author wallet address (`0x...`). |
| `commitmentHash` | `string` | Yes | No | **N/A** | Cryptographic Output | 32-byte hex Keccak-256 commitment hash. |
| `label` | `string` | No | Potentially | **NO** | Local Metadata | Optional user private label for local organization. |
| `chainId` | `number` | Yes | No | No | Cached Metadata | Target EVM chain ID (`84532` for Base Sepolia). |
| `transactionHash` | `string` | Optional | No | No | Cached Metadata | Hint hash of Private Proof transaction. |
| `blockNumber` | `number` | Optional | No | No | Cached Metadata | Hint block height of Private Proof transaction. |
| `blockTimestamp` | `number` | Optional | No | No | Cached Metadata | Hint Unix timestamp of Private Proof block. |
| `blockTimestampISO` | `string` | Optional | No | No | Cached Metadata | Hint ISO 8601 string of Private Proof block time. |
| `contractAddress` | `string` | Optional | No | No | Cached Metadata | Hint contract address of original Private Proof. |
| `clientCreationTimeISO` | `string` | Optional | No | No | Cached Metadata | Local browser clock time when proof was generated. |

> **Security Note on Cached Metadata**: All imported blockchain metadata fields (`transactionHash`, `blockNumber`, `blockTimestamp`, `contractAddress`) are treated as lookup hints and are independently re-verified against RPC data during provenance verification.

---

## 12. Portable Proof Blob Serialization

- **Format**: `INSCRIBESOUL-PROOF-V1:<base64url-payload>`
- **Serialization Pipeline**: `PrivateProofPackage` $\longrightarrow$ `JSON.stringify` $\longrightarrow$ UTF-8 Bytes $\longrightarrow$ Base64URL (stripping `=` padding).
- **Application Format Notice**: The Portable Proof Blob is an application serialization format for copy-paste portability. Hashing commitments depend strictly on `(author, secret, content)`, not JSON string formatting or property ordering.
