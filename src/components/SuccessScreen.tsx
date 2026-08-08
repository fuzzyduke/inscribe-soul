import React, { useState } from 'react';
import { CheckCircle2, Download, ExternalLink, Copy, Check, ShieldCheck, KeyRound, Save, AlertTriangle } from 'lucide-react';
import { truncateHash, exportProofJSON, encodePortableProofBlob, PrivateProofPackage } from '../utils/hashing';
import { ChainConfig } from '../config/chains';

interface SuccessScreenProps {
  mode: 'private' | 'public';
  chain: ChainConfig;
  author: string;
  txHash: string;
  blockNumber: number | string;
  blockTimestamp: number;
  blockTimestampISO: string;
  commitmentHash: string;
  secret?: string;
  originalText?: string;
  label?: string;
  onReset: () => void;
  onNavigateToProof: () => void;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({
  mode,
  chain,
  author,
  txHash,
  blockNumber,
  blockTimestamp,
  blockTimestampISO,
  commitmentHash,
  secret,
  originalText,
  label,
  onReset,
  onNavigateToProof,
}) => {
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBlob, setCopiedBlob] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const proofPkg: PrivateProofPackage | null = originalText && secret ? {
    format: 'INSCRIBESOUL_PROOF_PACKAGE_V1',
    protocol: 'INSCRIBESOUL_PRIVATE_V1',
    label,
    content: originalText,
    secret,
    author,
    commitmentHash,
    chainId: chain.chainId,
    transactionHash: txHash,
    blockNumber,
    blockTimestamp,
    blockTimestampISO,
    contractAddress: chain.contractAddress,
    clientCreationTimeISO: new Date().toISOString(),
  } : null;

  const handleDownloadProof = () => {
    if (!proofPkg) return;
    exportProofJSON(proofPkg);
    setDownloaded(true);
  };

  const handleCopyBlob = () => {
    if (!proofPkg) return;
    const blobStr = encodePortableProofBlob(proofPkg);
    navigator.clipboard.writeText(blobStr);
    setCopiedBlob(true);
    setTimeout(() => setCopiedBlob(false), 2500);
  };

  const handleCopySecret = () => {
    if (!secret) return;
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto p-8 bg-stone-900/60 border border-stone-800 rounded-2xl shadow-2xl space-y-8 backdrop-blur-md">
      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-emerald-950/60 border border-emerald-700/60 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-950/40">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="font-serif text-3xl tracking-wide text-stone-100 uppercase font-bold">
          {mode === 'private' ? 'PRIVATE PROOF CREATED' : 'INSCRIBED & CONFIRMED'}
        </h1>
        <p className="text-stone-300 font-serif italic text-base">
          {mode === 'private'
            ? 'Your content itself is not on-chain. Only its cryptographic commitment was inscribed.'
            : 'Your thought now has a permanent, confirmed blockchain timestamp.'}
        </p>
      </div>

      {/* Proof Card Metadata */}
      <div className="bg-stone-950/80 p-6 rounded-xl border border-amber-900/40 space-y-4 font-mono text-xs shadow-inner">
        <div className="flex justify-between items-center pb-3 border-b border-stone-800">
          <span className="text-stone-400 uppercase tracking-widest text-[10px]">Preservation Mode</span>
          <span className="px-2.5 py-1 rounded bg-amber-950/60 border border-amber-800 text-amber-300 font-bold">
            {mode === 'private' ? 'Private Proof' : 'Public Inscription'}
          </span>
        </div>

        {label && (
          <div className="flex justify-between items-center">
            <span className="text-stone-400">Private Label (Local):</span>
            <span className="text-amber-300 font-semibold">{label}</span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-stone-400">Target Network:</span>
          <span className="text-stone-200 font-semibold">{chain.name}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-stone-400">Author Wallet:</span>
          <span className="text-stone-200">{truncateHash(author, 8, 6)}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-stone-400">Canonical Block Timestamp:</span>
          <span className="text-amber-300 font-semibold">{blockTimestampISO}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-stone-400">L2 Block Height:</span>
          <span className="text-stone-200">#{blockNumber}</span>
        </div>
      </div>

      {/* Redesigned Private Proof Safeguard Section */}
      {mode === 'private' && proofPkg ? (
        <div className="space-y-6">
          {/* Primary Recommendation: Save Your Proof */}
          <div className="p-6 rounded-2xl bg-amber-950/30 border border-amber-800/60 space-y-5 text-xs font-sans text-amber-200/90 shadow-xl">
            <div className="space-y-1">
              <h3 className="font-serif text-xl text-amber-300 font-bold uppercase tracking-wide">
                RECOMMENDED — SAVE YOUR PRIVATE PROOF
              </h3>
              <p className="text-stone-300 text-xs leading-relaxed">
                Your Private Proof contains everything required to verify or reveal this inscription later. Save either format below:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 font-mono">
              {/* Option A: Download JSON */}
              <button
                onClick={handleDownloadProof}
                className={`py-3.5 px-4 text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 font-bold shadow-lg cursor-pointer ${
                  downloaded
                    ? 'bg-emerald-950/80 border border-emerald-700 text-emerald-300'
                    : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950'
                }`}
              >
                {downloaded ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    Proof File Downloaded ✓
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-stone-950" />
                    Download .JSON Proof
                  </>
                )}
              </button>

              {/* Option B: Copy Portable Proof Blob */}
              <button
                onClick={handleCopyBlob}
                className={`py-3.5 px-4 text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 font-bold shadow-lg cursor-pointer ${
                  copiedBlob
                    ? 'bg-emerald-950/80 border border-emerald-700 text-emerald-300'
                    : 'bg-stone-800 hover:bg-stone-700 border border-stone-600 text-amber-200'
                }`}
              >
                {copiedBlob ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    Portable Proof Copied ✓
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-amber-400" />
                    Copy Portable Proof
                  </>
                )}
              </button>
            </div>

            {/* Blob Sensitivity Security Warning */}
            <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-800/80 text-[11px] font-mono leading-relaxed text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>SECURITY NOTICE:</strong> Treat the Portable Proof Blob like the JSON proof file. Anyone who obtains it can read your original private content and secret salt. Store it securely in an encrypted note or password manager.
              </span>
            </div>
          </div>

          {/* Manual Recovery Information Fallback */}
          <div className="p-6 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-4 font-mono text-xs">
            <h4 className="font-serif text-sm text-stone-200 font-bold uppercase tracking-wider border-b border-stone-800 pb-2">
              Manual Recovery Backup
            </h4>
            <p className="text-stone-400 font-sans text-xs leading-relaxed">
              If you lose both the JSON file and portable proof blob, you can still recover your proof if you retain BOTH:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="bg-stone-900 p-3.5 rounded-xl border border-stone-800 space-y-1">
                <span className="text-[10px] text-stone-400 uppercase tracking-widest block font-bold">1. Exact Original Text</span>
                <p className="text-stone-200 text-[11px] truncate">{originalText}</p>
              </div>

              <div className="bg-stone-900 p-3.5 rounded-xl border border-stone-800 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">2. Secret Salt Key</span>
                  <button
                    onClick={handleCopySecret}
                    className="text-amber-400 hover:text-amber-300 text-[10px] flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedSecret ? 'Copied!' : 'Copy Secret'}
                  </button>
                </div>
                <p className="text-amber-300 text-[11px] truncate break-all">{secret}</p>
              </div>
            </div>

            <p className="text-[11px] font-sans text-stone-400 italic">
              Note: You do not need to save technical blockchain hashes separately. InscribeSoul can auto-locate your on-chain transaction once you provide your original text and secret.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 text-xs text-stone-400 font-sans leading-relaxed">
          <strong>Public Provenance Recorded:</strong> Your inscription and text are now permanently recorded in transaction logs on {chain.name}.
        </div>
      )}

      {/* Bottom Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <a
          href={`${chain.blockExplorerUrl}/tx/${txHash}`}
          target="_blank"
          rel="noreferrer"
          className="w-full sm:flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-mono text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 text-center"
        >
          <ExternalLink className="w-4 h-4 text-stone-400" />
          View on BaseScan
        </a>

        <button
          onClick={onReset}
          className="w-full sm:flex-1 py-3 bg-stone-900 border border-stone-700 hover:border-amber-800/60 text-stone-300 hover:text-amber-300 font-mono text-xs uppercase tracking-wider rounded-xl transition-all"
        >
          Inscribe Another Thought
        </button>
      </div>
    </div>
  );
};
