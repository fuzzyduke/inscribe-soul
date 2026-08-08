import React from 'react';
import { SUPPORTED_CHAINS, ChainConfig } from '../config/chains';
import { ShieldCheck, Lock } from 'lucide-react';

interface ChainSelectorProps {
  selectedChainId: string;
  setSelectedChainId: (id: string) => void;
}

export const ChainSelector: React.FC<ChainSelectorProps> = ({
  selectedChainId,
  setSelectedChainId,
}) => {
  const chains = Object.values(SUPPORTED_CHAINS);

  return (
    <div className="space-y-4">
      <label className="block text-xs font-mono uppercase tracking-widest text-stone-400">
        Select Blockchain Target
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {chains.map((chain) => {
          const isSelected = selectedChainId === chain.id;
          const isSelectable = chain.deploymentStatus === 'live' || chain.deploymentStatus === 'testnet';

          return (
            <div
              key={chain.id}
              onClick={() => {
                if (isSelectable) {
                  setSelectedChainId(chain.id);
                }
              }}
              className={`p-4 rounded-xl border transition-all ${
                !isSelectable
                  ? 'opacity-50 cursor-not-allowed bg-stone-950/40 border-stone-800/60'
                  : isSelected
                  ? 'bg-amber-950/20 border-amber-600/70 shadow-lg shadow-amber-950/20 cursor-pointer'
                  : 'bg-stone-900/40 border-stone-800 hover:border-stone-700 hover:bg-stone-900/70 cursor-pointer'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-serif text-base text-stone-100 font-medium">
                  {chain.name}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${
                    !isSelectable
                      ? 'bg-stone-900 border-stone-800 text-stone-400'
                      : chain.id.includes('base')
                      ? 'bg-blue-950/60 border-blue-800 text-blue-300'
                      : 'bg-purple-950/60 border-purple-800 text-purple-300'
                  }`}
                >
                  {chain.badge}
                </span>
              </div>

              <p className="text-xs text-stone-400 mb-3 font-sans leading-snug">
                {chain.badgeLabel}
              </p>

              <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px] font-mono text-stone-400">
                {isSelectable ? (
                  <>
                    <span>Est. Gas:</span>
                    <span className="text-stone-200 font-semibold">{chain.estimatedFeeUsd}</span>
                  </>
                ) : (
                  <span className="flex items-center gap-1 text-stone-400 text-[10px]">
                    <Lock className="w-3 h-3 text-stone-400" /> Not Deployed Yet
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
