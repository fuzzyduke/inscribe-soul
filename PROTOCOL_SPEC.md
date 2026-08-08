# InscribeSoul Protocol Specification V1.1

**Protocol Version**: `INSCRIBESOUL_V1_1`

---

## 1. Domain Constants

```solidity
bytes32 public constant PUBLIC_DOMAIN = keccak256(bytes("INSCRIBESOUL_PUBLIC_V1"));
// Value: 0xc00bd1280f0e33060f3d5a20ee35c0547aed0428775278235daa2a2dc87da9a2

bytes32 public constant PRIVATE_DOMAIN = keccak256(bytes("INSCRIBESOUL_PRIVATE_V1"));
// Value: 0x600839658e1d010994e7bfec2d665e8315b99808c0749aec6e12dcaf62454200
```

---

## 2. Cryptographic Hashing Specifications

### Public Inscription Proof Hash

$$\text{proofHash} = \text{keccak256}(\text{abi.encode}(\text{PUBLIC\_DOMAIN}, \text{authorAddress}, \text{content}))$$

### Private Proof Commitment Hash

$$\text{commitmentHash} = \text{keccak256}(\text{abi.encode}(\text{PRIVATE\_DOMAIN}, \text{authorAddress}, \text{secret}, \text{content}))$$

---

## 3. Private Proof Package & Portable Blob Specification

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
- **Encoding**: UTF-8 JSON $\longrightarrow$ Base64URL (url-safe, copy-paste resilient without line wraps or character mangling).
- **Format**:
  `INSCRIBESOUL-PROOF-V1:<base64url-encoded-utf8-json>`
- **Security Property**: The Portable Proof Blob is sensitive recovery material. Anyone with access to it can read the original content and secret salt.

---

## 4. Optional Local Private Labels

- **Purpose**: Helps users distinguish sealed inscriptions in browser UI.
- **Privacy Boundary**: `label` is stored **ONLY** locally in browser storage or inside the user's exported `.json` proof / Portable Blob.
- **Cryptographic Independence**: `label` **NEVER** enters `commitmentHash`, transaction calldata, smart contract events, or backend indexers.

---

## 5. Official Test Vectors

Common Parameters across all test vectors:
- **Author Wallet**: `0x4B6254BCdFf3D98845393f8594B1C5E6Ba6Dc75C`
- **Secret Salt Key**: `0xc47e3d928d24613b70253ebe2d5078e0813ce2398e2dd69d00a8c957bfbdc6da`

### Vector 1: Plain ASCII
- **Content**: `"Hello world"`
- **UTF-8 Hex**: `48656c6c6f20776f726c64`
- **Expected `proofHash` (Public)**: `0x653e43869146ccf8b6eb91466c77afe3284ca06657df16522f1c0e97d2a508e6`
- **Expected `commitmentHash` (Private)**: `0xdb1c7d7ab8481c44976cbbfb56024bf78eae04e8d5043a014c4a736216cb56f2`

---

### Vector 2: Unicode & Emojis
- **Content**: `"InscribeSoul 📜⚡ 🔐"`
- **UTF-8 Hex**: `496e736372696265536f756c20f09f939ce29aa120f09f9490`
- **Expected `proofHash` (Public)**: `0xee9c0e7743a207b64dff2422c7b9595f5bf06864e3a58325863ebb63083c8b92`
- **Expected `commitmentHash` (Private)**: `0xb784c1c9bed98748f8dba4a15db5d791f22f30ff734d991120bf79a9fb986829`

---

### Vector 3: Multiline LF (`\n`)
- **Content**: `"Line 1\nLine 2\nLine 3"`
- **UTF-8 Hex**: `4c696e6520310a4c696e6520320a4c696e652033`
- **Expected `proofHash` (Public)**: `0x729909023272e351520e74d6d4db463b389d03613e2fdb32fea7a3968414c093`
- **Expected `commitmentHash` (Private)**: `0x754b9d3d1ab4feed34b232cfb7382c6af6f98c61ca01d5733978a8bdd05a9a4a`

---

### Vector 4: Multiline CRLF (`\r\n`)
- **Content**: `"Line 1\r\nLine 2\r\nLine 3"`
- **UTF-8 Hex**: `4c696e6520310d0a4c696e6520320d0a4c696e652033`
- **Expected `proofHash` (Public)**: `0x1ed8f94db42c2d595d480f19448edaeeb795eeb0db3a96038c6b8e28db83ef54`
- **Expected `commitmentHash` (Private)**: `0x4d9f68b26787c0968a27ed85371208ffea4d121375706017d3c569fcb4099248`
