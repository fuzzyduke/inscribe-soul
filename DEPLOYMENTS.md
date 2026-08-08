# InscribeSoul Deployment & Historical Contract Registry

**Canonical Subdomain**: `inscribesoul.valhallala.com`  
**Current Active Version**: `INSCRIBESOUL_V1_1`  

---

## 1. Active Deployment Status Matrix

| Network | Chain ID | Contract Address | Deployment Block | Protocol Version | UI Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Base Sepolia (Testnet)** | `84532` | [`0xdD7317881A75522Cd5B8853003A0f8D6dFA99AcB`](https://sepolia.basescan.org/address/0xdD7317881A75522Cd5B8853003A0f8D6dFA99AcB) | `#45207053` | `INSCRIBESOUL_V1_1` | **Active / Live** |
| **Base Mainnet** | `8453` | `N/A (Not Deployed)` | `N/A` | `N/A` | Coming Soon |
| **Ethereum Sepolia** | `11155111` | `N/A (Not Deployed)` | `N/A` | `N/A` | Coming Soon |
| **Ethereum Mainnet** | `1` | `N/A (Not Deployed)` | `N/A` | `N/A` | Coming Soon |

---

## 2. Verified Canonical Deployments

### Base Sepolia V1.1 (Canonical Active Write Contract)

- **Protocol Version**: `INSCRIBESOUL_V1_1`
- **Network**: Base Sepolia (`chainId: 84532`)
- **Contract Address**: [`0xdD7317881A75522Cd5B8853003A0f8D6dFA99AcB`](https://sepolia.basescan.org/address/0xdD7317881A75522Cd5B8853003A0f8D6dFA99AcB)
- **Deployment Tx Hash**: [`0xba46b6f3ebe4a242d2037b81d49504d07e656eb54f62f73d4d4961119e0e9564`](https://sepolia.basescan.org/tx/0xba46b6f3ebe4a242d2037b81d49504d07e656eb54f62f73d4d4961119e0e9564)
- **Deployment Block**: `#45207053`
- **Deployment Block Timestamp**: `2026-08-08T09:46:34.000Z` (Unix: `1786182394`)
- **Deployer / Owner Wallet**: `0x4B6254BCdFf3D98845393f8594B1C5E6Ba6Dc75C`
- **Initial Protocol Fee**: `0 ETH` (`0 wei`)
- **Maximum Fee Ceiling (`MAX_PROTOCOL_FEE`)**: `0.1 ETH` (`100000000000000000 wei`)
- **Capabilities**: Public Inscriptions, Private Proofs, On-Chain Proof Reveals (`revealProof`)
- **Proxy Architecture**: Non-proxy, immutable, non-upgradeable contract bytecode

---

### Base Sepolia V1 (Historical Approved Provenance Contract)

- **Protocol Version**: `INSCRIBESOUL_V1`
- **Network**: Base Sepolia (`chainId: 84532`)
- **Contract Address**: [`0x6fDFe67228CbB294880cc85DD0Fbca3F2C05b346`](https://sepolia.basescan.org/address/0x6fDFe67228CbB294880cc85DD0Fbca3F2C05b346)
- **Deployment Block**: `#45206768` (Verified deployment block range)
- **Deployer / Owner Wallet**: `0x4B6254BCdFf3D98845393f8594B1C5E6Ba6Dc75C`
- **Capabilities**: Historical Public Inscriptions & Private Proofs (Read-only historical provenance source; does not support `revealProof`)
- **Proxy Architecture**: Non-proxy, immutable, non-upgradeable contract bytecode

---

## 3. Historical Contract Registry Rules

1. **New Writes**: All new Public Inscriptions, Private Proof commitments, and Proof Reveals execute strictly against the current canonical V1.1 deployment (`0xdD7317881A75522Cd5B8853003A0f8D6dFA99AcB`).
2. **Historical Read Compatibility**: InscribeSoul clients automatically search across all registered historical deployment addresses (`V1` and `V1_1`) when querying wallet history or verifying proofs.
3. **Cross-Version Reveal**: A Private Proof recorded on the historical V1 deployment (`0x6fDFe67228CbB294880cc85DD0Fbca3F2C05b346`) can be unsealed and revealed on the active V1.1 contract. The V1.1 `ProofRevealed` log explicitly links to the original V1 transaction hash and commitment.
