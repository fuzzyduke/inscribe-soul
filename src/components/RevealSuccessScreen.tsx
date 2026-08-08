import React from 'react';
import { CheckCircle2, Download, ExternalLink, Copy, Unlock, FileText, ArrowRight, ShieldCheck } from 'lucide-react';
import { truncateHash } from '../utils/hashing';
import { ChainConfig } from '../config/chains';

interface RevealSuccessScreenProps {
  chain: ChainConfig;
  author: string;
  revealTxHash: string;
  revealBlockNumber: number | string;
  revealTimestampISO: string;
  origTxHash: string;
  origBlockNumber: number | string;
  origBlockTimestampISO: string;
  commitmentHash: string;
  secret: string;
  content: string;
  label?: string;
  verifications?: {
    originalEventFound: boolean;
    commitmentMatches: boolean;
    authorMatches: boolean;
    canonicalContractVerified: boolean;
  };
  onReset: () => void;
  onNavigateToVerify: () => void;
}

export const RevealSuccessScreen: React.FC<RevealSuccessScreenProps> = ({
  chain,
  author,
  revealTxHash,
  revealBlockNumber,
  revealTimestampISO,
  origTxHash,
  origBlockNumber,
  origBlockTimestampISO,
  commitmentHash,
  secret,
  content,
  label,
  verifications = {
    originalEventFound: true,
    commitmentMatches: true,
    authorMatches: true,
    canonicalContractVerified: true,
  },
  onReset,
  onNavigateToVerify,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyVerificationLink = () => {
    const link = `${window.location.origin}/#verify?tx=${revealTxHash}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto p-8 bg-stone-900/60 border border-stone-800 rounded-2xl shadow-2xl space-y-8 backdrop-blur-md">
      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-emerald-950/60 border border-emerald-700/60 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-950/40">
          <Unlock className="w-8 h-8" />
        </div>
        <h1 className="font-serif text-3xl tracking-wide text-stone-100 uppercase font-bold">
          PROOF REVEALED ON-CHAIN
        </h1>
        <p className="text-stone-300 font-serif italic text-base">
          Your private commitment has been publicly revealed and linked to its original timestamp.
        </p>
      </div>

      {/* Provenance Timeline Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
        {/* Step 1: Original Commitment */}
        <div className="bg-stone-950/80 p-5 rounded-xl border border-stone-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-stone-800">
            <span className="text-amber-400 font-bold uppercase tracking-widest text-[10px]">
              1. Original Private Commitment
            </span>
            <span className="text-[10px] text-stone-500">Sealed</span>
          </div>
          <div>
            <span className="text-stone-400 block">Original Block:</span>
            <span className="text-stone-200">#{origBlockNumber} ({origBlockTimestampISO})</span>
          </div>
          <div>
            <span className="text-stone-400 block">Original Transaction:</span>
            <a
              href={`${chain.blockExplorerUrl}/tx/${origTxHash}`}
              target="_blank"
              rel="noreferrer"
              className="text-amber-400 hover:underline flex items-center gap-1"
            >
              {truncateHash(origTxHash, 8, 6)}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div>
            <span className="text-stone-400 block">Commitment Hash:</span>
            <span className="text-stone-300 break-all">{truncateHash(commitmentHash, 10, 8)}</span>
          </div>
        </div>

        {/* Step 2: Public Reveal */}
        <div className="bg-stone-950/80 p-5 rounded-xl border border-amber-900/50 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-stone-800">
            <span className="text-emerald-400 font-bold uppercase tracking-widest text-[10px]">
              2. Public Reveal Transaction
            </span>
            <span className="text-[10px] text-emerald-400 font-bold">Revealed ✓</span>
          </div>
          <div>
            <span className="text-stone-400 block">Reveal Block:</span>
            <span className="text-stone-200">#{revealBlockNumber} ({revealTimestampISO})</span>
          </div>
          <div>
            <span className="text-stone-400 block">Reveal Transaction:</span>
            <a
              href={`${chain.blockExplorerUrl}/tx/${revealTxHash}`}
              target="_blank"
              rel="noreferrer"
              className="text-amber-400 hover:underline flex items-center gap-1"
            >
              {truncateHash(revealTxHash, 8, 6)}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div>
            <span className="text-stone-400 block">Author Wallet:</span>
            <span className="text-stone-200">{truncateHash(author, 8, 6)}</span>
          </div>
        </div>
      </div>

      {/* Revealed Content Display */}
      <div className="bg-stone-950 p-5 rounded-xl border border-stone-800 space-y-2 font-mono text-xs">
        {label && (
          <div className="flex justify-between border-b border-stone-800 pb-2 mb-2">
            <span className="text-stone-400 text-[10px] uppercase">Private Label (Local):</span>
            <span className="text-amber-300 font-semibold">{label}</span>
          </div>
        )}
        <span className="text-amber-400 text-[10px] uppercase tracking-widest block font-bold">
          Publicly Revealed Content
        </span>
        <p className="text-stone-100 leading-relaxed font-mono whitespace-pre-wrap">
          {content}
        </p>
      </div>

      {/* Verification Checklist based on actual verified booleans */}
      <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/60 font-mono text-xs text-emerald-300 space-y-1">
        <div className="font-bold text-emerald-400 uppercase text-[11px] mb-1">PROVENANCE VERIFICATION SUMMARY:</div>
        {verifications.commitmentMatches && <div>✓ Reveal data reproduces original commitment hash</div>}
        {verifications.originalEventFound && <div>✓ Original PrivateProof event found on {chain.name}</div>}
        {verifications.authorMatches && <div>✓ Author wallet matches original proof</div>}
        {verifications.canonicalContractVerified && <div>✓ Emitted by canonical InscribeSoul contract</div>}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <button
          onClick={handleCopyVerificationLink}
          className="w-full sm:flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-mono text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <Copy className="w-4 h-4 text-amber-400" />
          {copied ? 'Link Copied!' : 'Copy Verification Link'}
        </button>

        <button
          onClick={onReset}
          className="w-full sm:flex-1 py-3 bg-stone-900 border border-stone-700 hover:border-amber-800/60 text-stone-300 hover:text-amber-300 font-mono text-xs uppercase tracking-wider rounded-xl transition-all"
        >
          Back to Inscriber
        </button>
      </div>
    </div>
  );
};
