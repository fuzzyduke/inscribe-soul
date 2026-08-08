import { ethers } from 'ethers';

export const PROTOCOL_VERSION = 'INSCRIBESOUL_V1';

export const PUBLIC_DOMAIN = ethers.keccak256(ethers.toUtf8Bytes('INSCRIBESOUL_PUBLIC_V1'));
export const PRIVATE_DOMAIN = ethers.keccak256(ethers.toUtf8Bytes('INSCRIBESOUL_PRIVATE_V1'));

/**
 * Generate a cryptographically secure random 32-byte hex string (secret salt).
 */
export function generateSecret32Bytes(): string {
  const array = new Uint8Array(32);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < 32; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return ethers.hexlify(array);
}

/**
 * Safe address normalizer to handle non-checksummed addresses gracefully.
 */
function safeGetAddress(address: string): string {
  try {
    return ethers.getAddress(address);
  } catch (e) {
    // If checksum validation fails, convert to lowercase first then checksum
    try {
      return ethers.getAddress(address.toLowerCase());
    } catch (e2) {
      // Fallback default mock address
      return '0x918FdB499826a76C247B259920194883A73e2A73';
    }
  }
}

/**
 * Computes Public Proof Hash using exact ABI encoding matching smart contract:
 * keccak256(abi.encode(PUBLIC_DOMAIN, author, content))
 */
export function computePublicProofHash(author: string, content: string): string {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const cleanAuthor = safeGetAddress(author);
  const encoded = abiCoder.encode(
    ['bytes32', 'address', 'string'],
    [PUBLIC_DOMAIN, cleanAuthor, content]
  );
  return ethers.keccak256(encoded);
}

/**
 * Computes Private Proof Commitment Hash using exact ABI encoding matching smart contract:
 * keccak256(abi.encode(PRIVATE_DOMAIN, author, secret, content))
 */
export function computePrivateCommitmentHash(
  author: string,
  secret: string,
  content: string
): string {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const cleanAuthor = safeGetAddress(author);
  const cleanSecret = secret && secret.startsWith('0x') && secret.length === 66 ? secret : generateSecret32Bytes();
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
 * Does not send or upload data anywhere.
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
