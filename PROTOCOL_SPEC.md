# InscribeSoul Protocol Specification V1

**Protocol Version**: `INSCRIBESOUL_V1`

---

## 1. Domain Constants

```solidity
bytes32 public constant PUBLIC_DOMAIN = keccak256(bytes("INSCRIBESOUL_PUBLIC_V1"));
// Value: 0x9f1a070e1a3b5c7a5f36e890c5f21bd8a9c4d92a1705b1bf88f39589d380e224

bytes32 public constant PRIVATE_DOMAIN = keccak256(bytes("INSCRIBESOUL_PRIVATE_V1"));
// Value: 0x7b587d6061329a43a6d962058097f480678d2b99335f49e4d1f2e825a07c13aa
```

---

## 2. Cryptographic Hashing Specifications

### Public Inscription Proof Hash

Public content hashes are derived on-chain to bind the author wallet and guarantee that the content emitted in the event matches the hash.

```solidity
proofHash = keccak256(
    abi.encode(
        PUBLIC_DOMAIN,
        authorAddress,
        content
    )
);
```

### Private Proof Commitment Hash

Private proof commitments are computed client-side using a cryptographically secure 32-byte secret salt. Only the 32-byte commitment hash reaches the blockchain.

```solidity
commitmentHash = keccak256(
    abi.encode(
        PRIVATE_DOMAIN,
        authorAddress,
        secret,
        content
    )
);
```

---

## 3. Test Vectors

### Vector 1: Plain ASCII

- **Author**: `0x918FdB499826a76C247B259920194883A73e2A73`
- **Secret**: `0xa1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90`
- **Content**: `Hello world`
- **Public Domain**: `0x9f1a070e1a3b5c7a5f36e890c5f21bd8a9c4d92a1705b1bf88f39589d380e224`
- **Private Domain**: `0x7b587d6061329a43a6d962058097f480678d2b99335f49e4d1f2e825a07c13aa`

---

### Vector 2: Multiline String with Newlines

- **Author**: `0x918FdB499826a76C247B259920194883A73e2A73`
- **Secret**: `0x1111111111111111111111111111111111111111111111111111111111111111`
- **Content**: `Line 1\nLine 2\nLine 3`

---

### Vector 3: Unicode & Emojis

- **Author**: `0x918FdB499826a76C247B259920194883A73e2A73`
- **Secret**: `0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff`
- **Content**: `InscribeSoul 📜⚡ 🔐`

---

### Vector 4: Trailing Whitespace

- **Author**: `0x918FdB499826a76C247B259920194883A73e2A73`
- **Secret**: `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`
- **Content**: `  Idea with trailing space  `
