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

export const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
  baseSepolia: {
    id: 'baseSepolia',
    name: 'Base Sepolia',
    badge: 'Testnet',
    badgeLabel: 'Live V1 Testnet on Base Sepolia',
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
