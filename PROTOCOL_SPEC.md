# InscribeSoul Protocol Specification V1

**Protocol Version**: `INSCRIBESOUL_V1`

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

Public content hashes are derived on-chain to bind the author wallet and guarantee that the content emitted in the event matches the hash.

$$\text{proofHash} = \text{keccak256}(\text{abi.encode}(\text{PUBLIC\_DOMAIN}, \text{authorAddress}, \text{content}))$$

### Private Proof Commitment Hash

Private proof commitments are computed client-side using a cryptographically secure 32-byte secret salt (`window.crypto.getRandomValues`). Only the 32-byte commitment hash reaches the blockchain.

$$\text{commitmentHash} = \text{keccak256}(\text{abi.encode}(\text{PRIVATE\_DOMAIN}, \text{authorAddress}, \text{secret}, \text{content}))$$

---

## 3. Official Test Vectors

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

---

### Vector 5: Leading & Trailing Whitespace
- **Content**: `"  Idea with trailing space  "`
- **UTF-8 Hex**: `202049646561207769746820747261696c696e672073706163652020`
- **Expected `proofHash` (Public)**: `0x109d09d4715732f5f402b7ce917e495d5baf76b74691b24edea94126f216ed5b`
- **Expected `commitmentHash` (Private)**: `0x903f1d3b96a41a507bd7f72afbabdd23e8b1e72015903d19399869db264e3f8e`

---

### Vector 6: Single Character Difference (`Hello worle`)
- **Content**: `"Hello worle"`
- **UTF-8 Hex**: `48656c6c6f20776f726c65`
- **Expected `proofHash` (Public)**: `0x27379a849db41898908591711bb244580d5a436aea004dadd3a7fdfe98c3d6de`
- **Expected `commitmentHash` (Private)**: `0x010c72fad77741f6554dae726c666158b8dc5d97f56a4d563b4bcecd4eb8069c`
