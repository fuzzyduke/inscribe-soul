import React from 'react';
import { ShieldCheck, Eye, AlertTriangle, Info, KeyRound, Save } from 'lucide-react';

interface PreservationModeSelectorProps {
  mode: 'private' | 'public';
  setMode: (mode: 'private' | 'public') => void;
  secret?: string;
}

export const PreservationModeSelector: React.FC<PreservationModeSelectorProps> = ({
  mode,
  setMode,
  secret,
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

      {/* DETAILED NOTICES BASED ON MODE */}
      {mode === 'private' ? (
        <div className="p-5 rounded-xl bg-amber-950/30 border border-amber-800/50 space-y-4 font-sans text-xs text-amber-200/90 shadow-md">
          <div className="flex items-center gap-2 pb-2 border-b border-amber-800/40 text-amber-300 font-mono text-xs uppercase tracking-wider font-bold">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            Private Proof Requirements (2-Step Safeguard)
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Step 1 */}
            <div className="bg-stone-950/70 p-4 rounded-lg border border-amber-900/40 space-y-2">
              <div className="flex items-center gap-2 text-stone-200 font-mono text-xs font-bold">
                <Save className="w-4 h-4 text-amber-400 shrink-0" />
                1. Save Your Original Text
              </div>
              <p className="text-stone-300 text-[11px] leading-relaxed">
                InscribeSoul never stores your original text on any server or database. Keep your exact original text saved somewhere safe.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-stone-950/70 p-4 rounded-lg border border-amber-900/40 space-y-2">
              <div className="flex items-center gap-2 text-stone-200 font-mono text-xs font-bold">
                <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
                2. Keep Your Secret Salt Key
              </div>
              <p className="text-stone-300 text-[11px] leading-relaxed">
                This 32-byte secret salt prevents dictionary guessing attacks. Save this key or download your <strong>Proof File (.json)</strong> after inscribing.
              </p>
              {secret && (
                <div className="pt-2 border-t border-stone-800 font-mono text-[10px] text-amber-300 break-all bg-stone-900 p-2 rounded">
                  {secret}
                </div>
              )}
            </div>
          </div>

          <div className="text-[11px] font-mono text-amber-400/90 pt-1">
            <strong>CRITICAL:</strong> Without BOTH your exact original text and this secret salt key, no one (including InscribeSoul) can verify your private proof in the future.
          </div>
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
