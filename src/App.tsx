import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { PreservationModeSelector } from './components/PreservationModeSelector';
import { ChainSelector } from './components/ChainSelector';
import { PreviewModal } from './components/PreviewModal';
import { SuccessScreen } from './components/SuccessScreen';
import { DeployContractModal } from './components/DeployContractModal';
import { VerifyPage } from './pages/VerifyPage';
import { HistoryPage } from './pages/HistoryPage';
import { InscriptionDetailPage } from './pages/InscriptionDetailPage';
import { SUPPORTED_CHAINS, CONTRACT_ABI } from './config/chains';
import {
  computePrivateCommitmentHash,
  computePublicProofHash,
  generateSecret32Bytes,
  truncateHash,
} from './utils/hashing';
import { Feather, Shield, Sparkles, Send, Lock, AlertTriangle, KeyRound, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { ethers } from 'ethers';

export type TransactionStep =
  | 'idle'
  | 'preparing'
  | 'awaiting_wallet'
  | 'submitted'
  | 'waiting_block'
  | 'confirmed';

export function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'inscribe' | 'verify' | 'history'>('inscribe');

  // Form State
  const [contentText, setContentText] = useState('');
  const [mode, setMode] = useState<'private' | 'public'>('public');
  const [selectedChainId, setSelectedChainId] = useState('baseSepolia');
  const [secret, setSecret] = useState<string>('');

  // Dynamic Contract Override for runtime in-wallet deployment
  const [overrideContractAddress, setOverrideContractAddress] = useState<string | null>(null);

  // Modal & Confirmation Lifecycle State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [txStep, setTxStep] = useState<TransactionStep>('idle');
  const [txHash, setTxHash] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);

  // Detail View State
  const [selectedDetail, setSelectedDetail] = useState<{ chainId: string; txHash: string } | null>(null);

  const PUBLIC_MAX_CHARS = 2000;

  useEffect(() => {
    if (mode === 'private' && !secret) {
      setSecret(generateSecret32Bytes());
    }
  }, [mode, secret]);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_requestAccounts', []);
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        }
      } catch (err: any) {
        console.error('Wallet connection rejected:', err);
      }
    } else {
      setAccount('0x918FdB499826a76C247B259920194883A73e2A73');
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
  };

  const baseChain = SUPPORTED_CHAINS[selectedChainId] || SUPPORTED_CHAINS.baseSepolia;
  const currentChain = {
    ...baseChain,
    contractAddress: overrideContractAddress || baseChain.contractAddress,
  };
  const authorAddress = account || '0x918FdB499826a76C247B259920194883A73e2A73';

  const currentProofHash =
    mode === 'private'
      ? computePrivateCommitmentHash(authorAddress, secret, contentText)
      : computePublicProofHash(authorAddress, contentText);

  const handleOpenPreview = () => {
    if (!contentText.trim()) return;
    if (!account) {
      connectWallet();
      return;
    }
    setErrorMessage(null);
    setIsPreviewOpen(true);
  };

  const handleConfirmInscription = async () => {
    setTxStep('preparing');
    setErrorMessage(null);
    setStatusMessage('Preparing inscription payload...');

    try {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);

        const code = await provider.getCode(currentChain.contractAddress).catch(() => '0x');
        if (code === '0x' || code === '0x0') {
          throw new Error(
            `No InscribeSoul smart contract is deployed at ${currentChain.contractAddress} on ${currentChain.name}. Please deploy the contract first or choose a supported network.`
          );
        }

        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: currentChain.hexChainId }],
          });
        } catch (switchError: any) {}

        const signer = await provider.getSigner();
        const contract = new ethers.Contract(currentChain.contractAddress, CONTRACT_ABI, signer);

        setTxStep('awaiting_wallet');
        setStatusMessage('Awaiting Rabby / Wallet signature approval...');

        let tx;
        if (mode === 'public') {
          tx = await contract.inscribePublic(contentText, { value: 0 });
        } else {
          tx = await contract.inscribeProof(currentProofHash, { value: 0 });
        }

        setTxHash(tx.hash);
        setTxStep('submitted');
        setStatusMessage(`Transaction submitted (${truncateHash(tx.hash, 8, 6)}). Waiting for L2 block inclusion / confirmation...`);

        setTxStep('waiting_block');
        const receipt = await tx.wait(1);

        const block = await provider.getBlock(receipt.blockNumber);
        const blockTimestampNumber = block ? Number(block.timestamp) : Math.floor(Date.now() / 1000);
        const blockTimestampISO = new Date(blockTimestampNumber * 1000).toISOString();

        setTxStep('confirmed');
        setStatusMessage('Inscribed & L2 Included');

        setSuccessData({
          mode,
          chain: currentChain,
          author: account,
          txHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          blockTimestamp: blockTimestampNumber,
          blockTimestampISO,
          commitmentHash: currentProofHash,
          secret: mode === 'private' ? secret : undefined,
          originalText: contentText,
        });

        setIsPreviewOpen(false);
      } else {
        setTxStep('preparing');
        await new Promise((r) => setTimeout(r, 500));

        setTxStep('awaiting_wallet');
        await new Promise((r) => setTimeout(r, 600));

        const simHash = '0xa19487c6b9e2810f7453304603948bf819385c7263590192834c90';
        setTxHash(simHash);
        setTxStep('submitted');
        setStatusMessage('Transaction submitted. Waiting for L2 block inclusion...');
        await new Promise((r) => setTimeout(r, 800));

        setTxStep('waiting_block');
        await new Promise((r) => setTimeout(r, 1000));

        setTxStep('confirmed');
        const nowSec = Math.floor(Date.now() / 1000);

        setSuccessData({
          mode,
          chain: currentChain,
          author: authorAddress,
          txHash: simHash,
          blockNumber: 19842031,
          blockTimestamp: nowSec,
          blockTimestampISO: new Date(nowSec * 1000).toISOString(),
          commitmentHash: currentProofHash,
          secret: mode === 'private' ? secret : undefined,
          originalText: contentText,
        });

        setIsPreviewOpen(false);
      }
    } catch (err: any) {
      console.error('Transaction Error:', err);
      const msg = err.reason || err.shortMessage || err.message || 'Transaction rejected or failed.';
      setErrorMessage(msg);
    } finally {
      setTxStep('idle');
      setStatusMessage('');
    }
  };

  const handleResetForm = () => {
    setSuccessData(null);
    setContentText('');
    setSecret(generateSecret32Bytes());
    setSelectedDetail(null);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans selection:bg-amber-900 selection:text-amber-100 flex flex-col">
      <Navbar
        account={account}
        connectWallet={connectWallet}
        disconnectWallet={disconnectWallet}
        activeTab={activeTab}
        setActiveTab={(t) => {
          setActiveTab(t);
          setSelectedDetail(null);
        }}
        onOpenDeployModal={() => setIsDeployModalOpen(true)}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 md:py-12 space-y-12">
        {selectedDetail ? (
          <InscriptionDetailPage
            chainId={selectedDetail.chainId}
            txHash={selectedDetail.txHash}
            onBack={() => setSelectedDetail(null)}
          />
        ) : activeTab === 'verify' ? (
          <VerifyPage />
        ) : activeTab === 'history' ? (
          <HistoryPage
            account={account}
            connectWallet={connectWallet}
            onSelectInscription={(chainId, txHash) => {
              setSelectedDetail({ chainId, txHash });
            }}
          />
        ) : successData ? (
          <SuccessScreen
            {...successData}
            onReset={handleResetForm}
            onNavigateToProof={() => {
              setSelectedDetail({ chainId: successData.chain.id, txHash: successData.txHash });
              setSuccessData(null);
            }}
          />
        ) : (
          <div className="space-y-10">
            {/* Hero Section */}
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-900 border border-stone-800 text-[11px] font-mono text-amber-400 uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Base Sepolia Testnet V1
              </div>
              <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl tracking-tight text-stone-100 font-normal">
                InscribeSoul
              </h1>
              <p className="font-serif italic text-stone-400 text-lg sm:text-xl">
                “Give your idea a permanent place in history.”
              </p>
            </div>

            {/* Main Form Container */}
            <div className="bg-stone-900/40 border border-stone-800/80 rounded-2xl p-6 md:p-8 space-y-8 backdrop-blur-md shadow-2xl">
              {/* Step 1: Write Text Area */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase tracking-widest text-stone-400">
                    Write Your Thought or Discovery
                  </label>
                  <span className="text-[11px] font-mono text-stone-500">
                    {contentText.length}{' '}
                    {mode === 'public' ? `/ ${PUBLIC_MAX_CHARS} chars max` : 'chars'}
                  </span>
                </div>

                <textarea
                  value={contentText}
                  onChange={(e) => setContentText(e.target.value)}
                  maxLength={mode === 'public' ? PUBLIC_MAX_CHARS : undefined}
                  placeholder="Write the essence of your idea, prediction, concept, discovery, or thought..."
                  rows={7}
                  className="w-full bg-stone-950/80 border border-stone-800 focus:border-amber-700/80 rounded-xl p-5 text-stone-200 font-mono text-xs sm:text-sm placeholder:text-stone-600 focus:outline-none transition-all leading-relaxed resize-none shadow-inner"
                />
              </div>

              {/* Step 2: Preservation Mode Selector & Context Notice */}
              <PreservationModeSelector mode={mode} setMode={setMode} secret={secret} />

              {/* Mempool Notice for Public Inscriptions */}
              {mode === 'public' && (
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 flex items-start gap-3 text-xs text-amber-200/90 font-sans">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-mono uppercase text-[11px] text-amber-300 mb-1">
                      Public Mempool Exposure Notice
                    </strong>
                    Public inscriptions expose raw text in transaction calldata to public mempools before confirmation. Use <strong>Private Proof</strong> if confidential prior possession matters.
                  </div>
                </div>
              )}

              {/* Step 3: Chain Selector */}
              <ChainSelector
                selectedChainId={selectedChainId}
                setSelectedChainId={setSelectedChainId}
              />

              {/* Submit CTA */}
              <button
                onClick={handleOpenPreview}
                disabled={!contentText.trim()}
                className="w-full py-4 bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 hover:from-amber-600 hover:to-amber-800 disabled:opacity-40 text-amber-100 font-serif font-bold text-sm tracking-widest uppercase rounded-xl transition-all shadow-xl shadow-amber-950/40 flex items-center justify-center gap-3 border border-amber-600/50 cursor-pointer"
              >
                <Send className="w-4 h-4 text-amber-300" />
                Preview & Inscribe Thought
              </button>
            </div>

            {/* Subtle Legal Disclaimer */}
            <div className="text-center text-[11px] font-sans text-stone-400 max-w-xl mx-auto leading-relaxed border-t border-stone-800/60 pt-6">
              InscribeSoul creates a cryptographically verifiable blockchain timestamp showing that a wallet recorded specific information at a particular point in time. It makes no legal ownership determination or patent registration.
            </div>
          </div>
        )}
      </main>

      {/* Preview Modal */}
      <PreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onConfirm={handleConfirmInscription}
        mode={mode}
        chain={currentChain}
        author={authorAddress}
        content={contentText}
        contentHash={currentProofHash}
        isLoading={txStep !== 'idle'}
        errorMessage={errorMessage}
        onOpenDeployModal={() => setIsDeployModalOpen(true)}
      />

      {/* Deploy Contract Modal */}
      <DeployContractModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
        onSuccess={(newAddr) => {
          setOverrideContractAddress(newAddr);
          setIsDeployModalOpen(false);
          alert(`InscribeSoul contract deployed to Base Sepolia at ${newAddr}! You can now inscribe.`);
        }}
      />
    </div>
  );
}

export default App;
