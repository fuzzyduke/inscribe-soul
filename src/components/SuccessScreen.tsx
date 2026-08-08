import React, { useState } from 'react';
import { CheckCircle2, Download, ExternalLink, Copy, FileText, AlertTriangle, Clock, Layers, Check } from 'lucide-react';
import { truncateHash, exportProofJSON } from '../utils/hashing';
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
  onReset,
  onNavigateToProof,
}) => {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleCopyHash = () => {
    navigator.clipboard.writeText(commitmentHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadProof = () => {
    if (!originalText || !secret) return;
    exportProofJSON({
      protocol: 'INSCRIBESOUL_PRIVATE_V1',
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
    });
    setDownloaded(true);
  };

  return (
    <div className="max-w-2xl mx-auto p-8 bg-stone-900/60 border border-stone-800 rounded-2xl shadow-2xl space-y-8 backdrop-blur-md">
      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-emerald-950/60 border border-emerald-700/60 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-950/40">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="font-serif text-3xl tracking-wide text-stone-100 uppercase">
          INSCRIBED & CONFIRMED
        </h1>
        <p className="text-stone-300 font-serif italic text-base">
          Your thought now has a permanent, confirmed blockchain timestamp.
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

        <div className="pt-3 border-t border-stone-800 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-stone-400">Content Proof Hash (V1):</span>
            <button
              onClick={handleCopyHash}
              className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[11px]"
            >
              <Copy className="w-3 h-3" />
              {copied ? 'Copied!' : 'Copy Hash'}
            </button>
          </div>
          <p className="text-stone-300 text-[11px] break-all bg-stone-900 p-2.5 rounded border border-stone-800">
            {commitmentHash}
          </p>
        </div>
      </div>

      {/* Private Proof Download Prompt & Warning */}
      {mode === 'private' ? (
        <div className="p-5 rounded-xl bg-amber-950/30 border border-amber-800/50 space-y-4 text-xs font-sans text-amber-200/90 shadow-md">
          <div className="space-y-1">
            <strong className="block font-mono uppercase text-amber-300 text-[11px] tracking-wider font-bold">
              Private Proof Retention Notice
            </strong>
            <p className="text-stone-300 text-xs leading-relaxed">
              The blockchain stores <strong>only your cryptographic commitment hash</strong>. Your proof file contains the secret key required to reveal and verify your original content. InscribeSoul cannot recover it for you.
            </p>
          </div>

          <div className="flex items-center gap-4 pt-1">
            <button
              onClick={handleDownloadProof}
              className={`flex-1 py-3 px-4 font-mono text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 font-bold shadow-lg ${
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
                  Download Proof File (.json)
                </>
              )}
            </button>
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
