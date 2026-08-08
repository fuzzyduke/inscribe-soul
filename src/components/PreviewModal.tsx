import React from 'react';
import { ChainConfig } from '../config/chains';
import { truncateHash } from '../utils/hashing';
import { ShieldCheck, Eye, AlertCircle, X, Check, AlertTriangle } from 'lucide-react';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  mode: 'private' | 'public';
  chain: ChainConfig;
  author: string;
  content: string;
  contentHash: string;
  protocolFeeEth: string;
  isLoading: boolean;
  errorMessage?: string | null;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  mode,
  chain,
  author,
  content,
  contentHash,
  protocolFeeEth,
  isLoading,
  errorMessage,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-4">
          <div className="flex items-center gap-2">
            {mode === 'private' ? (
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            ) : (
              <Eye className="w-5 h-5 text-stone-300" />
            )}
            <h2 className="font-serif text-xl tracking-wide text-stone-100 uppercase">
              Inscription Preview
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-stone-500 hover:text-stone-300 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Details Grid */}
        <div className="space-y-4 text-xs font-mono">
          <div className="bg-stone-950/60 p-4 rounded-xl border border-stone-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-stone-400">Preservation Mode:</span>
              <span className="font-bold text-amber-300 uppercase tracking-wider">
                {mode === 'private' ? 'Private Proof' : 'Permanent Public'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-stone-400">Target Blockchain:</span>
              <span className="text-stone-200">{chain.name}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-stone-400">Author Wallet:</span>
              <span className="text-stone-200">{truncateHash(author, 8, 6)}</span>
            </div>

            <div className="flex justify-between items-start pt-2 border-t border-stone-800/80">
              <span className="text-stone-400">Content Hash (V1):</span>
              <span className="text-amber-400 font-mono break-all text-[11px] text-right ml-4">
                {truncateHash(contentHash, 10, 8)}
              </span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-stone-800/80">
              <span className="text-stone-400">Est. Network Gas:</span>
              <span className="text-stone-200">{chain.estimatedFeeUsd}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-stone-400">InscribeSoul Fee (On-Chain):</span>
              <span className="text-emerald-400 font-semibold">{protocolFeeEth} ETH</span>
            </div>
          </div>

          {/* Mode Warning */}
          {mode === 'private' ? (
            <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-lg text-amber-300 text-[11px] leading-relaxed">
              <strong>PRIVACY CONFIRMED:</strong> Your original text will NOT be published or sent to the blockchain. Only the cryptographic commitment hash is submitted.
            </div>
          ) : (
            <div className="p-3 bg-red-950/30 border border-red-800/40 rounded-lg text-red-300 text-[11px] leading-relaxed">
              <strong>PUBLIC PERMANENCE NOTICE:</strong> This inscription and your raw text will be permanently recorded on {chain.name} and visible to all.
            </div>
          )}

          {/* Error Message Display inside Modal */}
          {errorMessage && (
            <div className="p-4 bg-red-950/50 border border-red-700 rounded-xl text-red-200 text-[11px] leading-relaxed space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-red-300 uppercase tracking-wider mb-1">Transaction Failed</strong>
                  {errorMessage}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-mono text-xs uppercase tracking-wider rounded-xl transition-all"
          >
            Back to Edit
          </button>

          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-serif font-bold text-sm tracking-wider uppercase rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="animate-pulse">Processing...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Confirm & Inscribe
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
