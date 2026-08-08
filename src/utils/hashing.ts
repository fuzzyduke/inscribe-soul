import { ethers } from 'ethers';

export const PROTOCOL_VERSION = 'INSCRIBESOUL_V1_1';

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

/**
 * Single Canonical Private Proof Package Schema V1
 */
export interface PrivateProofPackage {
  format: 'INSCRIBESOUL_PROOF_PACKAGE_V1';
  protocol: 'INSCRIBESOUL_PRIVATE_V1';
  label?: string;
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

export const PORTABLE_PROOF_PREFIX = 'INSCRIBESOUL-PROOF-V1:';

/**
 * Encodes a PrivateProofPackage into a copyable text Portable Proof Blob
 * Format: INSCRIBESOUL-PROOF-V1:<base64url-encoded-utf8-json>
 */
export function encodePortableProofBlob(pkg: PrivateProofPackage): string {
  const jsonStr = JSON.stringify(pkg);
  const utf8Bytes = ethers.toUtf8Bytes(jsonStr);
  const base64 = ethers.encodeBase64(utf8Bytes);
  // Convert standard base64 to base64url (url-safe, copy-paste resilient)
  const base64Url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${PORTABLE_PROOF_PREFIX}${base64Url}`;
}

/**
 * Decodes a Portable Proof Blob string back into a PrivateProofPackage.
 * Throws explicit errors if format, prefix, base64, or JSON schema is invalid.
 */
export function decodePortableProofBlob(blobStr: string): PrivateProofPackage {
  if (!blobStr || typeof blobStr !== 'string') {
    throw new Error('Invalid Portable Proof: Input string is empty.');
  }
  const clean = blobStr.trim();
  if (!clean.startsWith(PORTABLE_PROOF_PREFIX)) {
    throw new Error(`Invalid Portable Proof prefix: Expected '${PORTABLE_PROOF_PREFIX}'`);
  }
  
  const base64Url = clean.slice(PORTABLE_PROOF_PREFIX.length);
  // Restore standard base64 from base64url
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }

  let jsonStr: string;
  try {
    const bytes = ethers.decodeBase64(base64);
    jsonStr = ethers.toUtf8String(bytes);
  } catch (err: any) {
    throw new Error('Invalid Portable Proof: Base64 decoding failed.');
  }

  let pkg: any;
  try {
    pkg = JSON.parse(jsonStr);
  } catch (err: any) {
    throw new Error('Invalid Portable Proof: JSON parsing failed.');
  }

  if (!pkg.content || !pkg.secret || !pkg.author || !pkg.commitmentHash) {
    throw new Error('Invalid Portable Proof Package: Missing required fields (content, secret, author, commitmentHash).');
  }

  return pkg as PrivateProofPackage;
}

/**
 * Export Proof file locally for Private Proof mode.
 */
export function exportProofJSON(proof: PrivateProofPackage) {
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
