import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { SUPPORTED_CHAINS, CONTRACT_ABI } from '../config/chains';
import {
  computePrivateCommitmentHash,
  truncateHash,
  validateAndChecksumAddress,
  decodePortableProofBlob,
  PrivateProofPackage,
} from '../utils/hashing';
import { Unlock, FileUp, CheckCircle2, AlertTriangle, X, ShieldAlert, ArrowRight, Clipboard, KeyRound, Search, FileText } from 'lucide-react';

interface RevealProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: string | null;
  initialProofItem?: any;
  onSuccess: (revealData: any) => void;
}

export const RevealProofModal: React.FC<RevealProofModalProps> = ({
  isOpen,
  onClose,
  account,
  initialProofItem,
  onSuccess,
}) => {
  const [tab, setTab] = useState<'auto' | 'manual'>('auto');
  const [autoSubTab, setAutoSubTab] = useState<'upload' | 'blob'>('upload');
  
  // State for Auto (JSON or Blob)
  const [blobInput, setBlobInput] = useState('');

  // State for Manual Recovery
  const [manualText, setManualText] = useState('');
  const [manualSecret, setManualSecret] = useState('');
  const [manualChainId, setManualChainId] = useState('baseSepolia');

  // Verification & Execution State
  const [step, setStep] = useState<'input' | 'verified'>('input');
  const [verificationDetails, setVerificationDetails] = useState<any | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ackConfirmed, setAckConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setErrorMsg(null);
      setAckConfirmed(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonText = event.target?.result as string;
        const data = JSON.parse(jsonText);

        if (!data.content || !data.secret || !data.author || !data.commitmentHash) {
          throw new Error('Malformed Proof JSON: Required fields (content, secret, author, commitmentHash) are missing.');
        }

        await validateProofPackage(data);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to parse Private Proof JSON file.');
      }
    };
    reader.readAsText(file);
  };

  // Portable Proof Blob Handler
  const handleProcessBlob = async () => {
    if (!blobInput.trim()) {
      setErrorMsg('Please paste a valid Portable Proof Blob (INSCRIBESOUL-PROOF-V1:...)');
      return;
    }
    setErrorMsg(null);
    try {
      const pkg = decodePortableProofBlob(blobInput.trim());
      await validateProofPackage(pkg);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid Portable Proof Blob.');
    }
  };

  // Manual Recovery Handler (Preserves Exact UTF-8 Content without trim())
  const handleManualRecovery = async () => {
    if (manualText.length === 0) {
      setErrorMsg('Original Text is required for manual recovery.');
      return;
    }
    if (!manualSecret.trim() || !manualSecret.trim().startsWith('0x') || manualSecret.trim().length !== 66) {
      setErrorMsg('Secret Salt Key is required (32-byte hex starting with 0x).');
      return;
    }
    if (!account) {
      setErrorMsg('Wallet Required: Connect your EVM wallet first.');
      return;
    }

    setIsValidating(true);
    setErrorMsg(null);

    try {
      const cleanAuthor = validateAndChecksumAddress(account);
      // Item 1 Fix: Pass exact manualText without trim() to preserve exact UTF-8 semantics
      const computedHash = computePrivateCommitmentHash(cleanAuthor, manualSecret.trim(), manualText);

      // If opened from a specific My Inscriptions entry
      if (initialProofItem && initialProofItem.contentHash) {
        if (computedHash.toLowerCase() !== initialProofItem.contentHash.toLowerCase()) {
          throw new Error('These recovery details do not match this Private Proof entry.');
        }
      }

      // Auto-discover transaction via blockchain event log queries
      const targetChainKey = manualChainId || 'baseSepolia';
      const chain = SUPPORTED_CHAINS[targetChainKey];
      if (!chain || !chain.contractAddress) {
        throw new Error(`Chain ${targetChainKey} has no canonical deployment.`);
      }

      const provider = new ethers.JsonRpcProvider(chain.rpcUrl, undefined, { staticNetwork: true });
      const currentBlock = await provider.getBlockNumber().catch(() => 0);
      if (!currentBlock) {
        throw new Error(`RPC node failed to respond on ${chain.name}.`);
      }

      const iface = new ethers.Interface(CONTRACT_ABI);
      const filter = {
        address: chain.contractAddress,
        topics: [
          iface.getEvent("PrivateProof")?.topicHash,
          ethers.zeroPadValue(cleanAuthor, 32),
          computedHash,
        ],
        fromBlock: 0,
        toBlock: 'latest',
      };

      let logs = await provider.getLogs(filter).catch(async () => {
        const fallbackFromBlock = Math.max(0, currentBlock - 1999);
        return await provider.getLogs({ ...filter, fromBlock: fallbackFromBlock }).catch(() => []);
      });

      if (logs.length === 0) {
        throw new Error('No matching Private Proof was found on-chain for these recovery details and connected wallet.');
      }

      const matchedLog = logs[0];
      const block = await provider.getBlock(matchedLog.blockNumber);
      
      // Item 4 & 5 Fix: Strict RPC Block Timestamp without local time fallback
      if (!block || !block.timestamp) {
        throw new Error(`Blockchain Header Error: Canonical block timestamp for block #${matchedLog.blockNumber} is temporarily unavailable.`);
      }
      const canonicalBlockTimestampISO = new Date(block.timestamp * 1000).toISOString();

      setVerificationDetails({
        chain,
        author: cleanAuthor,
        commitmentHash: computedHash,
        origTxHash: matchedLog.transactionHash,
        origBlockNumber: matchedLog.blockNumber,
        origBlockTimestampISO: canonicalBlockTimestampISO,
        content: manualText,
        secret: manualSecret.trim(),
        label: initialProofItem?.label,
        verifications: {
          originalEventFound: true,
          commitmentMatches: true,
          authorMatches: true,
          canonicalContractVerified: true,
        },
      });

      setStep('verified');
    } catch (err: any) {
      setErrorMsg(err.message || 'Manual recovery failed.');
    } finally {
      setIsValidating(false);
    }
  };

  // Strict Proof Package Validation (Items 2, 3, 5, 12, 13)
  const validateProofPackage = async (data: Partial<PrivateProofPackage> & Record<string, any>) => {
    setIsValidating(true);
    setErrorMsg(null);

    try {
      if (!account) {
        throw new Error('Wallet Required: Please connect your EVM wallet first.');
      }
      const cleanAccount = validateAndChecksumAddress(account);
      const cleanAuthor = validateAndChecksumAddress(data.author!);

      if (cleanAccount.toLowerCase() !== cleanAuthor.toLowerCase()) {
        throw new Error(`Wrong Wallet: This proof belongs to ${truncateHash(cleanAuthor, 6, 4)}. Connect the original author wallet to reveal it.`);
      }

      // Exact content without trim()
      const computedHash = computePrivateCommitmentHash(cleanAuthor, data.secret!, data.content!);
      if (computedHash.toLowerCase() !== data.commitmentHash!.toLowerCase()) {
        throw new Error('Commitment Mismatch: Recomputed hash does not match commitment stored in proof package.');
      }

      const targetChainKey = Object.keys(SUPPORTED_CHAINS).find(
        (key) => SUPPORTED_CHAINS[key].chainId === Number(data.chainId)
      ) || 'baseSepolia';
      const chain = SUPPORTED_CHAINS[targetChainKey];

      if (!chain || chain.deploymentStatus === 'coming_soon' || !chain.contractAddress) {
        throw new Error(`Chain Not Deployed: Proof targets chain ID ${data.chainId}, which has no canonical deployment.`);
      }

      const provider = new ethers.JsonRpcProvider(chain.rpcUrl, undefined, { staticNetwork: true });

      // Item 13: Contract Preflight Verification before transaction lookup
      const code = await provider.getCode(chain.contractAddress).catch(() => '0x');
      if (code === '0x' || code === '0x0') {
        throw new Error(`Contract Bytecode Mismatch: No contract bytecode exists at ${chain.contractAddress} on ${chain.name}.`);
      }

      const contractView = new ethers.Contract(chain.contractAddress, CONTRACT_ABI, provider);
      const protocolVersion = await contractView.PROTOCOL_VERSION().catch(() => '');
      if (protocolVersion !== 'INSCRIBESOUL_V1_1' && protocolVersion !== 'INSCRIBESOUL_V1') {
        throw new Error(`Contract Version Mismatch: Expected INSCRIBESOUL_V1_1 or INSCRIBESOUL_V1, received '${protocolVersion}'.`);
      }

      let origTxHash = data.transactionHash;
      let origBlockNumber: any = data.blockNumber;

      // Auto-discover tx if txHash missing in package
      if (!origTxHash) {
        const iface = new ethers.Interface(CONTRACT_ABI);
        const filter = {
          address: chain.contractAddress,
          topics: [
            iface.getEvent("PrivateProof")?.topicHash,
            ethers.zeroPadValue(cleanAuthor, 32),
            computedHash,
          ],
          fromBlock: 0,
          toBlock: 'latest',
        };

        const logs = await provider.getLogs(filter).catch(() => []);
        if (logs.length === 0) {
          throw new Error('PROVENANCE FAILURE: No matching PrivateProof log found on-chain for this commitment.');
        }
        origTxHash = logs[0].transactionHash;
        origBlockNumber = logs[0].blockNumber;
      }

      // Item 2 Fix: Strictly verify original transaction targeted canonical contract & emitted PrivateProof event
      const receipt = await provider.getTransactionReceipt(origTxHash);
      if (!receipt) {
        throw new Error(`Original Transaction Not Found: No receipt exists on ${chain.name} for ${origTxHash}.`);
      }

      if (receipt.to?.toLowerCase() !== chain.contractAddress.toLowerCase()) {
        throw new Error(`PROVENANCE FAILURE: Original transaction was sent to ${receipt.to}, not canonical contract ${chain.contractAddress}.`);
      }

      const iface = new ethers.Interface(CONTRACT_ABI);
      let matchedPrivateProofEvent = false;

      for (const log of receipt.logs) {
        try {
          if (log.address.toLowerCase() === chain.contractAddress.toLowerCase()) {
            const parsed = iface.parseLog(log);
            if (
              parsed &&
              parsed.name === 'PrivateProof' &&
              parsed.args.author.toLowerCase() === cleanAuthor.toLowerCase() &&
              parsed.args.commitmentHash.toLowerCase() === data.commitmentHash!.toLowerCase()
            ) {
              matchedPrivateProofEvent = true;
              break;
            }
          }
        } catch (e) {}
      }

      if (!matchedPrivateProofEvent) {
        throw new Error('PROVENANCE FAILURE: The referenced transaction does not contain the expected PrivateProof event for this author and commitment.');
      }

      // Item 3 & 4 Fix: Strictly re-fetch canonical block header from RPC without package metadata or local clock fallback
      const block = await provider.getBlock(receipt.blockNumber);
      if (!block || !block.timestamp) {
        throw new Error(`Blockchain Header Error: Canonical block header for block #${receipt.blockNumber} is temporarily unavailable.`);
      }

      const canonicalBlockTimestampISO = new Date(block.timestamp * 1000).toISOString();

      setVerificationDetails({
        chain,
        author: cleanAuthor,
        commitmentHash: data.commitmentHash,
        origTxHash,
        origBlockNumber: receipt.blockNumber,
        origBlockTimestampISO: canonicalBlockTimestampISO,
        content: data.content,
        secret: data.secret,
        label: data.label,
        verifications: {
          originalEventFound: true,
          commitmentMatches: true,
          authorMatches: true,
          canonicalContractVerified: true,
        },
      });

      setStep('verified');
    } catch (err: any) {
      setErrorMsg(err.message || 'Validation failed.');
    } finally {
      setIsValidating(false);
    }
  };

  // Item 13 & 14 Fix: Preflight checks before submitting revealProof
  const handleConfirmRevealTx = async () => {
    if (!verificationDetails || !account) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (!window.ethereum) {
        throw new Error('Wallet Required: No EVM wallet detected in browser.');
      }

      const chain = verificationDetails.chain;

      // 1. Preflight Chain Switch
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chain.hexChainId }],
        });
      } catch (switchErr: any) {
        throw new Error(`Unable to switch wallet to ${chain.name}. Please switch network manually and try again.`);
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // 2. Preflight Contract Bytecode & Protocol Version Check
      const code = await provider.getCode(chain.contractAddress);
      if (code === '0x' || code === '0x0') {
        throw new Error(`Contract Execution Error: No bytecode exists at ${chain.contractAddress} on ${chain.name}.`);
      }

      const contractView = new ethers.Contract(chain.contractAddress, CONTRACT_ABI, provider);
      const protocolVersion = await contractView.PROTOCOL_VERSION().catch(() => '');
      if (protocolVersion !== 'INSCRIBESOUL_V1_1') {
        throw new Error(`Contract Version Mismatch: Contract at ${chain.contractAddress} is running version '${protocolVersion}'. Version INSCRIBESOUL_V1_1 is required for on-chain reveals.`);
      }

      const signer = await provider.getSigner();
      const contract = new ethers.Contract(chain.contractAddress, CONTRACT_ABI, signer);
      const requiredFee = await contract.protocolFee().catch(() => 0n);

      const tx = await contract.revealProof(
        verificationDetails.commitmentHash,
        verificationDetails.origTxHash,
        verificationDetails.secret,
        verificationDetails.content,
        { value: requiredFee }
      );

      const receipt = await tx.wait(1);

      // Item 4 & 5 Fix: Re-fetch canonical block header strictly from RPC
      const revealBlock = await provider.getBlock(receipt.blockNumber);
      if (!revealBlock || !revealBlock.timestamp) {
        throw new Error(`Reveal Transaction Confirmed, but canonical block header for #${receipt.blockNumber} is temporarily unavailable from RPC.`);
      }

      const revealTimestampISO = new Date(revealBlock.timestamp * 1000).toISOString();

      onSuccess({
        mode: 'reveal',
        chain,
        author: account,
        revealTxHash: receipt.hash,
        revealBlockNumber: receipt.blockNumber,
        revealTimestampISO,
        origTxHash: verificationDetails.origTxHash,
        origBlockNumber: verificationDetails.origBlockNumber,
        origBlockTimestampISO: verificationDetails.origBlockTimestampISO,
        commitmentHash: verificationDetails.commitmentHash,
        secret: verificationDetails.secret,
        content: verificationDetails.content,
        label: verificationDetails.label,
        verifications: verificationDetails.verifications,
      });

      onClose();
    } catch (err: any) {
      console.error('Reveal Transaction Error:', err);
      let msg = err.reason || err.shortMessage || err.message || 'Reveal transaction rejected or failed.';
      
      if (msg.includes('missing revert data') || msg.includes('CALL_EXCEPTION') || err.code === 'CALL_EXCEPTION') {
        msg = `Contract Execution Reverted: The transaction failed on contract ${verificationDetails.chain.contractAddress} on ${verificationDetails.chain.name}. Verify that your connected wallet is the original author of this Private Proof.`;
      }

      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-4">
          <div className="flex items-center gap-2">
            <Unlock className="w-5 h-5 text-amber-400" />
            <h2 className="font-serif text-xl tracking-wide text-stone-100 uppercase font-bold">
              {initialProofItem ? 'Reveal Private Proof Entry' : 'Reveal Proof'}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-stone-500 hover:text-stone-300 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected History Entry Badge */}
        {initialProofItem && (
          <div className="bg-stone-950 p-3 rounded-xl border border-amber-900/40 font-mono text-xs flex justify-between items-center">
            <span className="text-stone-400">Selected Proof Commitment:</span>
            <span className="text-amber-400 font-bold">{truncateHash(initialProofItem.contentHash, 8, 6)}</span>
          </div>
        )}

        {step === 'input' && (
          <div className="space-y-6">
            {/* Primary Input Method Tabs */}
            <div className="flex bg-stone-950 p-1 rounded-xl border border-stone-800 font-mono text-xs">
              <button
                onClick={() => {
                  setTab('auto');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2.5 rounded-lg uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  tab === 'auto'
                    ? 'bg-amber-950/60 text-amber-300 border border-amber-800/50 shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <FileUp className="w-3.5 h-3.5" />
                Automatic Recovery
              </button>
              <button
                onClick={() => {
                  setTab('manual');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2.5 rounded-lg uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  tab === 'manual'
                    ? 'bg-amber-950/60 text-amber-300 border border-amber-800/50 shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                Manual Recovery
              </button>
            </div>

            {/* AUTOMATIC RECOVERY (Upload JSON or Paste Blob) */}
            {tab === 'auto' && (
              <div className="space-y-4 font-mono text-xs">
                <div className="flex border-b border-stone-800 gap-4 text-xs">
                  <button
                    onClick={() => setAutoSubTab('upload')}
                    className={`pb-2 transition-colors ${
                      autoSubTab === 'upload' ? 'text-amber-400 border-b-2 border-amber-500 font-bold' : 'text-stone-400'
                    }`}
                  >
                    Upload Proof File (.json)
                  </button>
                  <button
                    onClick={() => setAutoSubTab('blob')}
                    className={`pb-2 transition-colors ${
                      autoSubTab === 'blob' ? 'text-amber-400 border-b-2 border-amber-500 font-bold' : 'text-stone-400'
                    }`}
                  >
                    Paste Portable Proof Blob
                  </button>
                </div>

                {autoSubTab === 'upload' ? (
                  <div className="border-2 border-dashed border-stone-700 hover:border-amber-600/70 rounded-2xl p-8 text-center space-y-4 bg-stone-950/60 transition-all cursor-pointer relative">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <FileUp className="w-10 h-10 text-amber-400 mx-auto" />
                    <div>
                      <p className="font-serif text-stone-200 text-base">Select Proof File (.json)</p>
                      <p className="text-[11px] font-mono text-stone-500 mt-1">
                        inscribesoul-proof-XXXXXXXX.json
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="text-stone-400 block text-[11px] uppercase tracking-wider">
                      Paste Portable Proof Blob (INSCRIBESOUL-PROOF-V1:...)
                    </label>
                    <textarea
                      value={blobInput}
                      onChange={(e) => setBlobInput(e.target.value)}
                      placeholder="INSCRIBESOUL-PROOF-V1:eyJwcm90b2NvbCI..."
                      rows={4}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-stone-200 text-xs font-mono focus:border-amber-700 focus:outline-none resize-none"
                    />
                    <button
                      onClick={handleProcessBlob}
                      disabled={isValidating}
                      className="w-full py-3 bg-amber-900/60 hover:bg-amber-800 border border-amber-700 text-amber-200 uppercase tracking-wider rounded-xl transition-all font-bold flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Search className="w-4 h-4 text-amber-400" />
                      Verify & Decode Blob
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* MANUAL RECOVERY (Exact Text + Secret Salt) */}
            {tab === 'manual' && (
              <div className="space-y-4 font-mono text-xs">
                <p className="text-stone-400 font-sans text-xs leading-relaxed">
                  Enter your exact original text (every space, line break, and character must match) and 32-byte secret salt key.
                </p>

                <div className="space-y-2">
                  <label className="text-stone-400 uppercase text-[11px] tracking-wider block">
                    1. Exact Original Text (Preserves UTF-8 semantics)
                  </label>
                  <textarea
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="Paste exact original text..."
                    rows={4}
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-700 rounded-xl p-3 text-stone-200 text-xs font-mono focus:outline-none resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-amber-400 uppercase text-[11px] tracking-wider block">
                    2. Secret Salt Key
                  </label>
                  <input
                    type="text"
                    value={manualSecret}
                    onChange={(e) => setManualSecret(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-stone-950 border border-amber-900/60 focus:border-amber-600 rounded-xl px-3 py-2.5 text-amber-200 text-xs font-mono focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-stone-400 uppercase text-[11px] tracking-wider block">
                    Target Network
                  </label>
                  <select
                    value={manualChainId}
                    onChange={(e) => setManualChainId(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 text-stone-200 rounded-xl px-3 py-2.5 text-xs font-mono focus:outline-none"
                  >
                    {Object.keys(SUPPORTED_CHAINS).map((id) => (
                      <option key={id} value={id}>
                        {SUPPORTED_CHAINS[id].name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleManualRecovery}
                  disabled={isValidating}
                  className="w-full py-3.5 bg-amber-900/60 hover:bg-amber-800 border border-amber-700 text-amber-200 uppercase tracking-wider rounded-xl transition-all font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Search className="w-4 h-4 text-amber-400" />
                  Auto-Discover Private Proof On-Chain
                </button>
              </div>
            )}

            {isValidating && (
              <div className="p-3 bg-amber-950/40 border border-amber-800/50 rounded-xl font-mono text-xs text-amber-300 animate-pulse text-center">
                Validating Proof & Discovering On-Chain Provenance...
              </div>
            )}
          </div>
        )}

        {/* Step 2: Verified Summary & Irreversibility Warning */}
        {step === 'verified' && verificationDetails && (
          <div className="space-y-6">
            <div className="p-3 bg-emerald-950/40 border border-emerald-700/60 rounded-xl text-emerald-300 font-mono text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>ORIGINAL PRIVATE PROOF VERIFIED ON-CHAIN ✓</span>
            </div>

            <div className="bg-stone-950/80 p-4 rounded-xl border border-stone-800 space-y-2 font-mono text-xs">
              {verificationDetails.label && (
                <div className="flex justify-between border-b border-stone-800 pb-2 mb-2">
                  <span className="text-stone-400">Private Label (Local):</span>
                  <span className="text-amber-300 font-semibold">{verificationDetails.label}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-stone-400">Author Wallet:</span>
                <span className="text-stone-200">{truncateHash(verificationDetails.author, 8, 6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Original Network:</span>
                <span className="text-stone-200">{verificationDetails.chain.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Originally Committed:</span>
                <span className="text-amber-300">{verificationDetails.origBlockTimestampISO}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Original Tx:</span>
                <span className="text-stone-300">{truncateHash(verificationDetails.origTxHash, 8, 6)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-mono uppercase text-stone-400">Content to be Permanently Revealed:</label>
              <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 text-stone-200 font-mono text-xs max-h-36 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                {verificationDetails.content}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 space-y-3 font-sans text-xs text-red-200">
              <div className="flex items-center gap-2 text-red-400 font-mono font-bold uppercase">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Permanent Public Reveal Notice
              </div>
              <p className="text-[11px] leading-relaxed text-stone-300">
                This action cannot be undone. Revealing publishes your original text, secret salt, and earlier commitment reference permanently on the blockchain.
              </p>
              <label className="flex items-start gap-2 pt-2 cursor-pointer border-t border-red-900/50">
                <input
                  type="checkbox"
                  checked={ackConfirmed}
                  onChange={(e) => setAckConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-red-800 bg-stone-950 text-amber-600 focus:ring-amber-600"
                />
                <span className="text-[11px] font-mono text-stone-200">
                  I understand this will permanently reveal my private content and secret salt on {verificationDetails.chain.name}.
                </span>
              </label>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setStep('input')}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-mono text-xs uppercase tracking-wider rounded-xl transition-all"
              >
                Back
              </button>

              <button
                onClick={handleConfirmRevealTx}
                disabled={!ackConfirmed || isSubmitting}
                className="flex-1 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-40 text-stone-950 font-serif font-bold text-sm tracking-wider uppercase rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? 'Signing Transaction...' : 'Confirm & Reveal Proof'}
              </button>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-red-950/50 border border-red-800 rounded-xl text-red-200 font-mono text-xs flex items-start gap-2 leading-relaxed">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-red-300 uppercase tracking-wider mb-1">Recovery / Validation Error</strong>
              {errorMsg}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
