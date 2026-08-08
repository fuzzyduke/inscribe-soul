import React, { useState, useEffect } from 'react';
import { Feather, Shield, History, CheckCircle2, Wallet, ExternalLink, Rocket } from 'lucide-react';
import { truncateHash } from '../utils/hashing';

interface NavbarProps {
  account: string | null;
  connectWallet: () => void;
  disconnectWallet: () => void;
  activeTab: 'inscribe' | 'verify' | 'history';
  setActiveTab: (tab: 'inscribe' | 'verify' | 'history') => void;
  onOpenDeployModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  account,
  connectWallet,
  disconnectWallet,
  activeTab,
  setActiveTab,
  onOpenDeployModal,
}) => {
  return (
    <header className="border-b border-stone-800 bg-stone-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand */}
        <div 
          onClick={() => setActiveTab('inscribe')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full bg-stone-900 border border-amber-900/50 flex items-center justify-center text-amber-500 shadow-inner group-hover:border-amber-700/60 transition-all">
            <Feather className="w-5 h-5" />
          </div>
          <div>
            <span className="font-serif text-xl tracking-wider text-stone-100 group-hover:text-amber-400 transition-colors">
              InscribeSoul
            </span>
            <span className="block text-[10px] uppercase tracking-widest text-stone-500 font-mono">
              V1 Protocol
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-stone-900/60 p-1.5 rounded-full border border-stone-800">
          <button
            onClick={() => setActiveTab('inscribe')}
            className={`px-5 py-2 rounded-full text-xs font-mono uppercase tracking-wider transition-all ${
              activeTab === 'inscribe'
                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/50 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Inscribe
          </button>

          <button
            onClick={() => setActiveTab('verify')}
            className={`px-5 py-2 rounded-full text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'verify'
                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/50 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Verify Proof
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-5 py-2 rounded-full text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/50 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            My Inscriptions
          </button>
        </nav>

        {/* Wallet & Deploy Button */}
        <div className="flex items-center gap-3">
          {onOpenDeployModal && (
            <button
              onClick={onOpenDeployModal}
              className="hidden sm:flex px-3.5 py-2 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 rounded-lg text-xs font-mono text-amber-300 transition-all items-center gap-1.5 shadow-sm"
              title="Deploy contract to Base Sepolia using Rabby Wallet"
            >
              <Rocket className="w-3.5 h-3.5 text-amber-400" />
              Deploy Contract
            </button>
          )}

          {account ? (
            <div className="flex items-center gap-2">
              <button
                onClick={disconnectWallet}
                className="px-4 py-2 bg-stone-900 border border-stone-700 hover:border-amber-800/60 rounded-lg text-xs font-mono text-stone-300 hover:text-amber-300 transition-all flex items-center gap-2"
                title="Click to disconnect"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {truncateHash(account, 6, 4)}
              </button>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-900/40 via-amber-800/40 to-stone-900 hover:from-amber-800/60 hover:to-stone-800 border border-amber-700/50 rounded-lg text-xs font-mono text-amber-200 hover:text-amber-100 transition-all flex items-center gap-2 shadow-lg"
            >
              <Wallet className="w-4 h-4 text-amber-400" />
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
