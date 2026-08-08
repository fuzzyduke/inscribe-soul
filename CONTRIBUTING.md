# Contributing to InscribeSoul

Thank you for your interest in contributing to InscribeSoul!

---

## 1. Architectural Guidelines & Principles

1. **Protocol Integrity First**: InscribeSoul is built around a non-custodial, minimal core protocol. Do NOT add tokens, NFTs, cloud databases, user accounts, or social features.
2. **Client-Side Privacy**: Private Proofs must never transmit raw text or secret salt keys over HTTP or RPC while sealed. All commitment hashing occurs client-side using `window.crypto`.
3. **Exact UTF-8 Semantics**: Never modify user content with `.trim()` or normalization functions. InscribeSoul hashes exact UTF-8 byte sequences.
4. **Fail-Closed RPC & Preflight**: RPC reads (fee, bytecode, domain constants, protocol version) must fail closed cleanly without optimistic fallback defaults.

---

## 2. Local Setup & Testing

```bash
# Install dependencies
npm install

# Start local Vite development server
npm run dev

# Run full Hardhat contract & integration test suite
npm test

# Build production bundle
npm run build
```

---

## 3. Modifying Documentation & Specifications

- When updating protocol rules, ensure [`PROTOCOL_SPEC.md`](PROTOCOL_SPEC.md), [`DEPLOYMENTS.md`](DEPLOYMENTS.md), [`SECURITY.md`](SECURITY.md), and [`TEST_VECTORS.md`](TEST_VECTORS.md) are updated in sync.
- Relative links must remain repository-relative (never use `file:///` or local OS paths).
