# InscribeSoul Test Vectors & Reproducibility Guide

This specification provides verified, implementation-independent test vectors for verifying InscribeSoul V1.1 cryptographic commitments and ABI encodings without relying on the application frontend.

---

## 1. Domain Constants

```solidity
bytes32 public constant PUBLIC_DOMAIN = keccak256(bytes("INSCRIBESOUL_PUBLIC_V1"));
// Hex: 0xc00bd1280f0e33060f3d5a20ee35c0547aed0428775278235daa2a2dc87da9a2

bytes32 public constant PRIVATE_DOMAIN = keccak256(bytes("INSCRIBESOUL_PRIVATE_V1"));
// Hex: 0x600839658e1d010994e7bfec2d665e8315b99808c0749aec6e12dcaf62454200
```

---

## 2. Common Test Vector Parameters

- **Author Wallet Address**: `0x4B6254BCdFf3D98845393f8594B1C5E6Ba6Dc75C`
- **Secret Salt Key**: `0xc47e3d928d24613b70253ebe2d5078e0813ce2398e2dd69d00a8c957bfbdc6da`

---

## 3. Official Test Vectors

### Vector 1: Plain ASCII Text
- **Content**: `"Hello world"`
- **UTF-8 Hex Bytes**: `48656c6c6f20776f726c64`
- **Public ABI Payload (`bytes32`, `address`, `string`)**:
  `0xc00bd1280f0e33060f3d5a20ee35c0547aed0428775278235daa2a2dc87da9a20000000000000000000000004b6254bcdff3d98845393f8594b1c5e6ba6dc75c0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000b48656c6c6f20776f726c64000000000000000000000000000000000000000000`
- **Expected Public `proofHash`**: `0x653e43869146ccf8b6eb91466c77afe3284ca06657df16522f1c0e97d2a508e6`
- **Private ABI Payload (`bytes32`, `address`, `bytes32`, `string`)**:
  `0x600839658e1d010994e7bfec2d665e8315b99808c0749aec6e12dcaf624542000000000000000000000000004b6254bcdff3d98845393f8594b1c5e6ba6dc75cc47e3d928d24613b70253ebe2d5078e0813ce2398e2dd69d00a8c957bfbdc6da0000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000b48656c6c6f20776f726c64000000000000000000000000000000000000000000`
- **Expected Private `commitmentHash`**: `0xdb1c7d7ab8481c44976cbbfb56024bf78eae04e8d5043a014c4a736216cb56f2`

---

### Vector 2: Unicode & Emojis
- **Content**: `"InscribeSoul 📜⚡ 🔐"`
- **UTF-8 Hex Bytes**: `496e736372696265536f756c20f09f939ce29aa120f09f9490`
- **Public ABI Payload**:
  `0xc00bd1280f0e33060f3d5a20ee35c0547aed0428775278235daa2a2dc87da9a20000000000000000000000004b6254bcdff3d98845393f8594b1c5e6ba6dc75c00000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000019496e736372696265536f756c20f09f939ce29aa120f09f949000000000000000`
- **Expected Public `proofHash`**: `0xee9c0e7743a207b64dff2422c7b9595f5bf06864e3a58325863ebb63083c8b92`
- **Private ABI Payload**:
  `0x600839658e1d010994e7bfec2d665e8315b99808c0749aec6e12dcaf624542000000000000000000000000004b6254bcdff3d98845393f8594b1c5e6ba6dc75cc47e3d928d24613b70253ebe2d5078e0813ce2398e2dd69d00a8c957bfbdc6da00000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000019496e736372696265536f756c20f09f939ce29aa120f09f949000000000000000`
- **Expected Private `commitmentHash`**: `0xb784c1c9bed98748f8dba4a15db5d791f22f30ff734d991120bf79a9fb986829`

---

### Vector 3: Multiline Standard Line Feed (`\n`)
- **Content**: `"Line 1\nLine 2\nLine 3"`
- **UTF-8 Hex Bytes**: `4c696e6520310a4c696e6520320a4c696e652033`
- **Expected Public `proofHash`**: `0x729909023272e351520e74d6d4db463b389d03613e2fdb32fea7a3968414c093`
- **Expected Private `commitmentHash`**: `0x754b9d3d1ab4feed34b232cfb7382c6af6f98c61ca01d5733978a8bdd05a9a4a`

---

### Vector 4: Multiline Carriage Return + Line Feed (`\r\n`)
- **Content**: `"Line 1\r\nLine 2\r\nLine 3"`
- **UTF-8 Hex Bytes**: `4c696e6520310d0a4c696e6520320d0a4c696e652033`
- **Expected Public `proofHash`**: `0x1ed8f94db42c2d595d480f19448edaeeb795eeb0db3a96038c6b8e28db83ef54`
- **Expected Private `commitmentHash`**: `0x4d9f68b26787c0968a27ed85371208ffea4d121375706017d3c569fcb4099248`

---

### Vector 5: Leading Whitespace Exactness
- **Content**: `"   Leading spaces matter"`
- **UTF-8 Hex Bytes**: `2020204c656164696e6720737061636573206d6174746572`
- **Expected Public `proofHash`**: `0xae68b4a9ea48e6520064b51c9180a46581db0660b0425d8d04b82ccb5ca25ad2`
- **Expected Private `commitmentHash`**: `0x106606e2f3345e9bbfe9356e89146d7a4a4772c52802eb29aa840296117397e5`

---

### Vector 6: Trailing Whitespace Exactness
- **Content**: `"Trailing spaces matter   "`
- **UTF-8 Hex Bytes**: `547261696c696e6720737061636573206d6174746572202020`
- **Expected Public `proofHash`**: `0xc7758d2e1beaec2643fd71bcef78902ac4239c8b10eb8daa8eb0b0c5ff64f65f`
- **Expected Private `commitmentHash`**: `0x2186f3cd4551a292d5df73c6ada23186558d060a314bb305667c3defda0e2ca4`

---

### Vector 7: Tab Character Exactness
- **Content**: `"Tabbed\tcontent"`
- **UTF-8 Hex Bytes**: `54616262656409636f6e74656e74`
- **Expected Public `proofHash`**: `0xd0f1386535dac5ed911a1ff495eb7c0f1c5bce60d54d0fed6b1a0c8185e530bf`
- **Expected Private `commitmentHash`**: `0x7d344b1d8b7df0059be895692e2ead95bf040395642bc3ff9dd24d4a11e07067`
