import React from 'react';
import { ShieldCheck, Eye, AlertTriangle, KeyRound, Save, Tag } from 'lucide-react';

interface PreservationModeSelectorProps {
  mode: 'private' | 'public';
  setMode: (mode: 'private' | 'public') => void;
  secret?: string;
  label?: string;
  setLabel?: (label: string) => void;
}

export const PreservationModeSelector: React.FC<PreservationModeSelectorProps> = ({
  mode,
  setMode,
  secret,
  label = '',
  setLabel,
}) => {
  return (
    <div className="space-y-4">
      <label className="block text-xs font-mono uppercase tracking-widest text-stone-400">
        Choose Preservation Mode
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PUBLIC INSCRIPTION (FIRST) */}
        <div
          onClick={() => setMode('public')}
          className={`relative p-5 rounded-xl border cursor-pointer transition-all ${
            mode === 'public'
              ? 'bg-amber-950/20 border-amber-600/70 shadow-lg shadow-amber-950/30'
              : 'bg-stone-900/40 border-stone-800 hover:border-stone-700 hover:bg-stone-900/70'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-300">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg text-stone-100 font-medium">Permanent Public Inscription</h3>
                <p className="text-xs font-mono text-amber-400/90 font-semibold">Recommended for public provenance</p>
              </div>
            </div>
            {mode === 'public' && (
              <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
            )}
          </div>

          <p className="mt-4 text-xs text-stone-300 leading-relaxed font-sans">
            Your text and its cryptographic fingerprint are permanently recorded and visible to everyone.
          </p>

          <div className="mt-4 pt-3 border-t border-stone-800/80 flex items-center justify-between text-[11px] text-stone-400 font-mono">
            <span>Good for: Public ideas, predictions, statements, manifestos</span>
          </div>
        </div>

        {/* PRIVATE PROOF (SECOND) */}
        <div
          onClick={() => setMode('private')}
          className={`relative p-5 rounded-xl border cursor-pointer transition-all ${
            mode === 'private'
              ? 'bg-amber-950/20 border-amber-600/70 shadow-lg shadow-amber-950/30'
              : 'bg-stone-900/40 border-stone-800 hover:border-stone-700 hover:bg-stone-900/70'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-900/30 border border-amber-700/50 flex items-center justify-center text-amber-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg text-stone-100 font-medium">Private Proof</h3>
                <p className="text-xs font-mono text-stone-400">For confidential ideas</p>
              </div>
            </div>
            {mode === 'private' && (
              <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
            )}
          </div>

          <p className="mt-4 text-xs text-stone-300 leading-relaxed font-sans">
            Only a cryptographic fingerprint is recorded. Your idea stays secret until you choose to reveal it.
          </p>

          <div className="mt-4 pt-3 border-t border-stone-800/80 flex items-center justify-between text-[11px] text-stone-400 font-mono">
            <span>Good for: Startup ideas, inventions, research, strategies</span>
          </div>
        </div>
      </div>

      {/* OPTIONAL PRIVATE LABEL INPUT */}
      {mode === 'private' && setLabel && (
        <div className="p-4 bg-stone-900/60 border border-stone-800 rounded-xl space-y-2 font-mono text-xs">
          <label className="text-stone-300 font-bold uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-amber-400" />
              Private Label (Optional)
            </span>
            <span className="text-[10px] text-stone-500 font-sans font-normal">Stays local — never inscribed on-chain</span>
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Concentrated Liquidity Lending Idea"
            className="w-full bg-stone-950 border border-stone-800 focus:border-amber-700/80 rounded-lg px-3 py-2 text-stone-200 placeholder:text-stone-600 focus:outline-none"
          />
        </div>
      )}

      {/* DETAILED NOTICES BASED ON MODE */}
      {mode === 'private' ? (
        <div className="p-5 rounded-xl bg-amber-950/30 border border-amber-800/50 space-y-4 font-sans text-xs text-amber-200/90 shadow-md">
          <div className="flex items-center gap-2 pb-2 border-b border-amber-800/40 text-amber-300 font-mono text-xs uppercase tracking-wider font-bold">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            Private Proof Safeguard Overview
          </div>

          <p className="text-stone-300 text-[11px] leading-relaxed font-sans">
            Your content itself is not on-chain. Only its cryptographic commitment hash is inscribed. Save your <strong>Proof File (.json)</strong> or copy your <strong>Portable Proof Blob</strong> after inscribing.
          </p>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/40 flex items-start gap-3 text-xs text-red-200/90 font-sans">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-mono uppercase text-[11px] tracking-wider text-red-300 mb-1">
              Permanent Notice
            </strong>
            This inscription will be permanently public on the blockchain and cannot be deleted or modified.
          </div>
        </div>
      )}
    </div>
  );
};
