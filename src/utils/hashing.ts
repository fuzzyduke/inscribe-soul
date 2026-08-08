import { ethers } from 'ethers';

export const PROTOCOL_VERSION = 'INSCRIBESOUL_V1';

export const PUBLIC_DOMAIN = ethers.keccak256(ethers.toUtf8Bytes('INSCRIBESOUL_PUBLIC_V1'));
export const PRIVATE_DOMAIN = ethers.keccak256(ethers.toUtf8Bytes('INSCRIBESOUL_PRIVATE_V1'));

/**
 * Generate a cryptographically secure random 32-byte hex string (secret salt).
 * Throws an explicit error if Web Crypto is unavailable. Never falls back to Math.random().
 */
export function generateSecret32Bytes(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return ethers.hexlify(array);
  }
  throw new Error('Web Crypto API (window.crypto.getRandomValues) is unavailable. Private Proof generation requires secure randomness.');
}

/**
 * Validates and checksums an EVM address. Throws explicitly if invalid.
 * Never substitutes a fallback mock address.
 */
export function validateAndChecksumAddress(address: string): string {
  if (!address || typeof address !== 'string') {
    throw new Error('Wallet address is required.');
  }
  const clean = address.trim();
  if (!ethers.isAddress(clean)) {
    throw new Error(`Invalid EVM wallet address: ${address}`);
  }
  return ethers.getAddress(clean);
}

/**
 * Computes Public Proof Hash using exact ABI encoding matching smart contract:
 * keccak256(abi.encode(PUBLIC_DOMAIN, author, content))
 * Pure, deterministic function. Throws if author address is invalid.
 */
export function computePublicProofHash(author: string, content: string): string {
  const cleanAuthor = validateAndChecksumAddress(author);
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const encoded = abiCoder.encode(
    ['bytes32', 'address', 'string'],
    [PUBLIC_DOMAIN, cleanAuthor, content]
  );
  return ethers.keccak256(encoded);
}

/**
 * Computes Private Proof Commitment Hash using exact ABI encoding matching smart contract:
 * keccak256(abi.encode(PRIVATE_DOMAIN, author, secret, content))
 * Pure, deterministic function. Throws if author or secret is invalid.
 * NEVER generates a secret implicitly.
 */
export function computePrivateCommitmentHash(
  author: string,
  secret: string,
  content: string
): string {
  const cleanAuthor = validateAndChecksumAddress(author);
  
  if (!secret || typeof secret !== 'string') {
    throw new Error('Secret salt key is required for Private Proof commitment hash computation.');
  }
  const cleanSecret = secret.trim();
  if (!cleanSecret.startsWith('0x') || cleanSecret.length !== 66) {
    throw new Error('Invalid secret salt key format. Secret salt must be a 32-byte hex string (66 characters starting with 0x).');
  }

  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const encoded = abiCoder.encode(
    ['bytes32', 'address', 'bytes32', 'string'],
    [PRIVATE_DOMAIN, cleanAuthor, cleanSecret, content]
  );
  return ethers.keccak256(encoded);
}

/**
 * Shorten hex hash or address for display
 */
export function truncateHash(hash: string, startChars = 8, endChars = 6): string {
  if (!hash) return '';
  if (hash.length <= startChars + endChars + 3) return hash;
  return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
}

export interface InscribeSoulPrivateProofJSON {
  protocol: 'INSCRIBESOUL_PRIVATE_V1';
  content: string;
  secret: string;
  author: string;
  commitmentHash: string;
  chainId: string | number;
  transactionHash: string;
  blockNumber: string | number;
  blockTimestamp: number;
  blockTimestampISO: string;
  contractAddress: string;
  clientCreationTimeISO?: string;
}

/**
 * Export Proof file locally for Private Proof mode.
 */
export function exportProofJSON(proof: InscribeSoulPrivateProofJSON) {
  const shortHash = proof.commitmentHash.slice(2, 10);
  const filename = `inscribesoul-proof-${shortHash}.json`;
  const jsonString = JSON.stringify(proof, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
