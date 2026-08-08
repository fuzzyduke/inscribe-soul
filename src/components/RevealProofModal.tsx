import React, { useState } from 'react';
import { ethers } from 'ethers';
import { SUPPORTED_CHAINS, CONTRACT_ABI } from '../config/chains';
import { computePrivateCommitmentHash, truncateHash, validateAndChecksumAddress } from '../utils/hashing';
import { Unlock, FileUp, CheckCircle2, AlertTriangle, X, ShieldAlert, ArrowRight } from 'lucide-react';

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
  const [step, setStep] = useState<'upload' | 'verified' | 'preview'>('upload');
  const [parsedProof, setParsedProof] = useState<any | null>(null);
  const [verificationDetails, setVerificationDetails] = useState<any | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ackConfirmed, setAckConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonText = event.target?.result as string;
        const data = JSON.parse(jsonText);

        // Required JSON schema fields
        if (
          !data.content ||
          !data.secret ||
          !data.author ||
          !data.commitmentHash ||
          !data.transactionHash
        ) {
          throw new Error('Malformed Proof JSON: Required fields (content, secret, author, commitmentHash, transactionHash) are missing.');
        }

        setParsedProof(data);
        await validateProofOnChain(data);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to parse Private Proof JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const validateProofOnChain = async (data: any) => {
    setIsValidating(true);
    setErrorMsg(null);

    try {
      // 1. Author check: Connected wallet must match proof author
      if (!account) {
        throw new Error('Wallet Required: Please connect your EVM wallet first.');
      }
      const cleanAccount = validateAndChecksumAddress(account);
      const cleanAuthor = validateAndChecksumAddress(data.author);

      if (cleanAccount.toLowerCase() !== cleanAuthor.toLowerCase()) {
        throw new Error(`Wrong Wallet: This proof belongs to ${truncateHash(cleanAuthor, 6, 4)}. Connect the original author wallet to reveal it.`);
      }

      // 2. Local Commitment Recomputation
      const computedHash = computePrivateCommitmentHash(cleanAuthor, data.secret, data.content);
      if (computedHash.toLowerCase() !== data.commitmentHash.toLowerCase()) {
        throw new Error('Commitment Mismatch: Recomputed hash does not match commitment stored in proof JSON.');
      }

      // 3. Resolve target chain & canonical contract
      const targetChainKey = Object.keys(SUPPORTED_CHAINS).find(
        (key) => SUPPORTED_CHAINS[key].chainId === Number(data.chainId)
      ) || 'baseSepolia';
      const chain = SUPPORTED_CHAINS[targetChainKey];

      if (!chain || chain.deploymentStatus === 'coming_soon' || !chain.contractAddress) {
        throw new Error(`Chain Not Deployed: Proof targets chain ID ${data.chainId}, which has no canonical InscribeSoul deployment.`);
      }

      // 4. RPC Original Transaction Verification
      const provider = new ethers.JsonRpcProvider(chain.rpcUrl, undefined, { staticNetwork: true });
      const receipt = await provider.getTransactionReceipt(data.transactionHash);

      if (!receipt) {
        throw new Error(`Original Transaction Not Found: No transaction receipt exists on ${chain.name} for ${data.transactionHash}.`);
      }

      if (receipt.to?.toLowerCase() !== chain.contractAddress.toLowerCase()) {
        throw new Error(`Contract Address Mismatch: Original transaction targeted ${receipt.to}, not canonical contract ${chain.contractAddress}.`);
      }

      const iface = new ethers.Interface(CONTRACT_ABI);
      let matchedEvent = false;

      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (
            parsed &&
            parsed.name === 'PrivateProof' &&
            parsed.args.author.toLowerCase() === cleanAuthor.toLowerCase() &&
            parsed.args.commitmentHash.toLowerCase() === data.commitmentHash.toLowerCase()
          ) {
            matchedEvent = true;
            break;
          }
        } catch (e) {}
      }

      if (!matchedEvent) {
        throw new Error('Provenance Failure: Referenced original transaction did not contain a matching PrivateProof event log.');
      }

      // 5. Canonical Block Timestamp Retrieval
      const block = await provider.getBlock(receipt.blockNumber);
      const canonicalBlockTimestampISO = block
        ? new Date(block.timestamp * 1000).toISOString()
        : data.blockTimestampISO || 'Block timestamp verified';

      setVerificationDetails({
        chain,
        author: cleanAuthor,
        commitmentHash: data.commitmentHash,
        origTxHash: data.transactionHash,
        origBlockNumber: receipt.blockNumber,
        origBlockTimestampISO: canonicalBlockTimestampISO,
        content: data.content,
        secret: data.secret,
      });

      setStep('verified');
    } catch (err: any) {
      setErrorMsg(err.message || 'Validation failed.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmRevealTx = async () => {
    if (!verificationDetails || !account) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (!window.ethereum) {
        throw new Error('Wallet Required: No EVM wallet detected in browser.');
      }

      const chain = verificationDetails.chain;

      // 1. Switch wallet to target chain
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chain.hexChainId }],
        });
      } catch (switchErr: any) {
        throw new Error(`Unable to switch wallet to ${chain.name}. Please switch network manually and try again.`);
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Read protocol fee
      const contract = new ethers.Contract(chain.contractAddress, CONTRACT_ABI, signer);
      const requiredFee = await contract.protocolFee().catch(() => 0n);

      // Execute revealProof transaction
      const tx = await contract.revealProof(
        verificationDetails.commitmentHash,
        verificationDetails.origTxHash,
        verificationDetails.secret,
        verificationDetails.content,
        { value: requiredFee }
      );

      const receipt = await tx.wait(1);

      const revealBlock = await provider.getBlock(receipt.blockNumber);
      const revealTimestampISO = revealBlock
        ? new Date(revealBlock.timestamp * 1000).toISOString()
        : new Date().toISOString();

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
      });

      onClose();
    } catch (err: any) {
      console.error('Reveal Transaction Error:', err);
      setErrorMsg(err.reason || err.shortMessage || err.message || 'Reveal transaction rejected or failed.');
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
              Reveal Private Proof
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

        {/* Step 1: Upload Proof File */}
        {step === 'upload' && (
          <div className="space-y-6">
            <p className="text-xs text-stone-300 font-sans leading-relaxed">
              Select your downloaded <strong>Proof File (.json)</strong>. InscribeSoul will parse it locally in your browser and verify its on-chain provenance before prompting for signature.
            </p>

            <div className="border-2 border-dashed border-stone-700 hover:border-amber-600/70 rounded-2xl p-8 text-center space-y-4 bg-stone-950/60 transition-all cursor-pointer relative">
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <FileUp className="w-10 h-10 text-amber-400 mx-auto" />
              <div>
                <p className="font-serif text-stone-200 text-base">Upload Proof File (.json)</p>
                <p className="text-[11px] font-mono text-stone-500 mt-1">
                  inscribesoul-proof-XXXXXXXX.json
                </p>
              </div>
            </div>

            {isValidating && (
              <div className="p-3 bg-amber-950/40 border border-amber-800/50 rounded-xl font-mono text-xs text-amber-300 animate-pulse text-center">
                Validating Proof File & On-Chain Provenance...
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

            {/* Ready to Reveal Summary */}
            <div className="bg-stone-950/80 p-4 rounded-xl border border-stone-800 space-y-2 font-mono text-xs">
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

            {/* Plaintext Content Display */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono uppercase text-stone-400">Content to be Permanently Revealed:</label>
              <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 text-stone-200 font-mono text-xs max-h-36 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                {verificationDetails.content}
              </div>
            </div>

            {/* Irreversibility Warning */}
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

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setStep('upload')}
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

        {/* Error Alert Display */}
        {errorMsg && (
          <div className="p-4 bg-red-950/50 border border-red-800 rounded-xl text-red-200 font-mono text-xs flex items-start gap-2 leading-relaxed">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-red-300 uppercase tracking-wider mb-1">Validation Error</strong>
              {errorMsg}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
