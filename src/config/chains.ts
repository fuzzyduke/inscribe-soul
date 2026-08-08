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
}

export const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
  base: {
    id: 'base',
    name: 'Base',
    badge: 'Economical',
    badgeLabel: 'Fast and inexpensive inscription',
    chainId: 8453,
    hexChainId: '0x2105',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://mainnet.base.org',
    blockExplorerUrl: 'https://basescan.org',
    contractAddress: '0x4386cA840656D1FbcCcCA37c6EbCE931448b1111',
    estimatedFeeUsd: '$0.04',
  },
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    badge: 'Permanent / Premium',
    badgeLabel: 'Higher network fee with Ethereum provenance',
    chainId: 1,
    hexChainId: '0x1',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://rpc.ankr.com/eth',
    blockExplorerUrl: 'https://etherscan.io',
    contractAddress: '0x4386cA840656D1FbcCcCA37c6EbCE931448b1111',
    estimatedFeeUsd: '$2.50',
  },
  baseSepolia: {
    id: 'baseSepolia',
    name: 'Base Sepolia (Testnet)',
    badge: 'Testnet',
    badgeLabel: 'Testing on Base Sepolia',
    chainId: 84532,
    hexChainId: '0x14a34',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://sepolia.base.org',
    blockExplorerUrl: 'https://sepolia.basescan.org',
    contractAddress: '0x6fDFe67228CbB294880cc85DD0Fbca3F2C05b346',
    estimatedFeeUsd: '$0.00',
  },
  sepolia: {
    id: 'sepolia',
    name: 'Ethereum Sepolia (Testnet)',
    badge: 'Testnet',
    badgeLabel: 'Testing on Sepolia',
    chainId: 11155111,
    hexChainId: '0xaa36a7',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://rpc.ankr.com/eth_sepolia',
    blockExplorerUrl: 'https://sepolia.etherscan.io',
    contractAddress: '0x6fDFe67228CbB294880cc85DD0Fbca3F2C05b346',
    estimatedFeeUsd: '$0.00',
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
  "event PublicInscription(address indexed author, bytes32 indexed proofHash, string content, uint256 timestamp)",
  "event PrivateProof(address indexed author, bytes32 indexed commitmentHash, uint256 timestamp)"
];
