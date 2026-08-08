export interface ChainConfig {
  id: string;
  name: string;
  badge: string;
  badgeLabel: string;
  chainId: number;
  hexChainId: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrl: string;
  blockExplorerUrl: string;
  contractAddress: string;
  estimatedFeeUsd: string;
  deploymentStatus: 'live' | 'testnet' | 'coming_soon';
}

export interface HistoricalContractConfig {
  protocolVersion: string;
  address: string;
  supportsReveal: boolean;
}

export const CANONICAL_HISTORICAL_REGISTRY: Record<number, HistoricalContractConfig[]> = {
  // Base Sepolia (Chain ID 84532)
  84532: [
    {
      protocolVersion: 'INSCRIBESOUL_V1',
      address: '0x6fDFe67228CbB294880cc85DD0Fbca3F2C05b346',
      supportsReveal: false,
    },
    {
      protocolVersion: 'INSCRIBESOUL_V1_1',
      address: '0xdD7317881A75522Cd5B8853003A0f8D6dFA99AcB',
      supportsReveal: true,
    },
  ],
};

export function getApprovedContractsForChain(chainId: number): HistoricalContractConfig[] {
  const contracts = CANONICAL_HISTORICAL_REGISTRY[chainId] || [];
  const chainKey = Object.keys(SUPPORTED_CHAINS).find((k) => SUPPORTED_CHAINS[k].chainId === chainId);
  if (chainKey && SUPPORTED_CHAINS[chainKey].contractAddress) {
    const canonicalAddr = SUPPORTED_CHAINS[chainKey].contractAddress.toLowerCase();
    if (!contracts.some((c) => c.address.toLowerCase() === canonicalAddr)) {
      contracts.push({
        protocolVersion: 'INSCRIBESOUL_V1_1',
        address: SUPPORTED_CHAINS[chainKey].contractAddress,
        supportsReveal: true,
      });
    }
  }
  return contracts;
}

export const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
  baseSepolia: {
    id: 'baseSepolia',
    name: 'Base Sepolia',
    badge: 'Testnet',
    badgeLabel: 'Live V1.1 Testnet on Base Sepolia',
    chainId: 84532,
    hexChainId: '0x14a34',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://sepolia.base.org',
    blockExplorerUrl: 'https://sepolia.basescan.org',
    contractAddress: '0xdD7317881A75522Cd5B8853003A0f8D6dFA99AcB',
    estimatedFeeUsd: '$0.00',
    deploymentStatus: 'testnet',
  },
  base: {
    id: 'base',
    name: 'Base Mainnet',
    badge: 'Coming Soon',
    badgeLabel: 'Canonical Mainnet Deployment Coming Soon',
    chainId: 8453,
    hexChainId: '0x2105',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://mainnet.base.org',
    blockExplorerUrl: 'https://basescan.org',
    contractAddress: '',
    estimatedFeeUsd: '$0.04',
    deploymentStatus: 'coming_soon',
  },
  sepolia: {
    id: 'sepolia',
    name: 'Ethereum Sepolia',
    badge: 'Coming Soon',
    badgeLabel: 'Ethereum Sepolia Testnet Coming Soon',
    chainId: 11155111,
    hexChainId: '0xaa36a7',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://rpc.ankr.com/eth_sepolia',
    blockExplorerUrl: 'https://sepolia.etherscan.io',
    contractAddress: '',
    estimatedFeeUsd: '$0.00',
    deploymentStatus: 'coming_soon',
  },
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum Mainnet',
    badge: 'Coming Soon',
    badgeLabel: 'Canonical Mainnet Deployment Coming Soon',
    chainId: 1,
    hexChainId: '0x1',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://rpc.ankr.com/eth',
    blockExplorerUrl: 'https://etherscan.io',
    contractAddress: '',
    estimatedFeeUsd: '$2.50',
    deploymentStatus: 'coming_soon',
  },
};

export const EXPECTED_DOMAINS = {
  PUBLIC_DOMAIN: '0xc00bd1280f0e33060f3d5a20ee35c0547aed0428775278235daa2a2dc87da9a2',
  PRIVATE_DOMAIN: '0x600839658e1d010994e7bfec2d665e8315b99808c0749aec6e12dcaf62454200',
};

export const CONTRACT_ABI = [
  "function PROTOCOL_VERSION() external view returns (string)",
  "function PUBLIC_DOMAIN() external view returns (bytes32)",
  "function PRIVATE_DOMAIN() external view returns (bytes32)",
  "function protocolFee() external view returns (uint256)",
  "function MAX_PROTOCOL_FEE() external view returns (uint256)",
  "function inscribePublic(string calldata content) external payable",
  "function inscribeProof(bytes32 commitmentHash) external payable",
  "function revealProof(bytes32 originalCommitmentHash, bytes32 originalTransactionHash, bytes32 secret, string calldata content) external payable",
  "event PublicInscription(address indexed author, bytes32 indexed proofHash, string content, uint256 timestamp)",
  "event PrivateProof(address indexed author, bytes32 indexed commitmentHash, uint256 timestamp)",
  "event ProofRevealed(address indexed author, bytes32 indexed originalCommitmentHash, bytes32 indexed originalTransactionHash, bytes32 secret, string content, uint256 timestamp)"
];
