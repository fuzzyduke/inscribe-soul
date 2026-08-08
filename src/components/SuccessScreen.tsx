import React from 'react';
import { CheckCircle2, Download, ExternalLink, Copy, FileText, AlertTriangle, Clock, Layers } from 'lucide-react';
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
  const [copied, setCopied] = React.useState(false);

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
          <span className="text-stone-400">Block Height:</span>
          <span className="text-stone-200">#{blockNumber}</span>
        </div>

        <div className="flex justify-between items-start pt-3 border-t border-stone-800">
          <span className="text-stone-400">Proof Hash:</span>
          <div className="text-right">
            <span className="text-amber-400 font-mono text-[11px] block break-all">
              {commitmentHash}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-start pt-2">
          <span className="text-stone-400">Transaction:</span>
          <a
            href={`${chain.blockExplorerUrl}/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="text-stone-300 hover:text-amber-400 font-mono text-[11px] flex items-center gap-1 transition-colors"
          >
            {truncateHash(txHash, 10, 8)}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Warning Banner for Private Mode */}
      {mode === 'private' && (
        <div className="p-4 bg-amber-950/30 border border-amber-800/50 rounded-xl flex items-start gap-3 text-xs text-amber-200 font-sans">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-mono uppercase text-[11px] text-amber-300 mb-1">
              Critical Warning: Proof File & Secret
            </strong>
            If you lose this proof file or secret key, InscribeSoul cannot recover your private inscription.
          </div>
        </div>
      )}

      {/* Action Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
        {mode === 'private' && originalText && secret && (
          <button
            onClick={handleDownloadProof}
            className="py-3 px-4 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-700/60 text-amber-200 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md"
          >
            <Download className="w-4 h-4 text-amber-400" />
            Download Proof File (.json)
          </button>
        )}

        <button
          onClick={handleCopyHash}
          className="py-3 px-4 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <Copy className="w-4 h-4 text-stone-400" />
          {copied ? 'Copied Hash!' : 'Copy Proof Hash'}
        </button>

        <button
          onClick={onNavigateToProof}
          className="py-3 px-4 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <FileText className="w-4 h-4 text-stone-400" />
          View Inscription Page
        </button>

        <button
          onClick={onReset}
          className="py-3 px-4 bg-gradient-to-r from-stone-800 to-stone-900 hover:from-stone-700 hover:to-stone-800 border border-stone-700 text-amber-400 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          Inscribe Another Thought
        </button>
      </div>
    </div>
  );
};
