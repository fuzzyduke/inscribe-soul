import React, { useState } from 'react';
import {
  computePrivateCommitmentHash,
  computePublicProofHash,
  truncateHash,
} from '../utils/hashing';
import { SUPPORTED_CHAINS, CONTRACT_ABI, getApprovedContractsForChain, getLogsChunked } from '../config/chains';
import { CheckCircle2, XCircle, Search, ShieldAlert, KeyRound, AlertTriangle, WifiOff, FileCheck, Eye, ExternalLink } from 'lucide-react';
import { ethers } from 'ethers';

export const VerifyPage: React.FC = () => {
  const [mode, setMode] = useState<'private' | 'public' | 'reveal'>('private');
  const [inputText, setInputText] = useState('');
  const [secretInput, setSecretInput] = useState('');
  const [authorInput, setAuthorInput] = useState('');
  const [selectedChainId, setSelectedChainId] = useState('baseSepolia');
  const [txHashInput, setTxHashInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<{
    status: 'idle' | 'success' | 'notFound' | 'rpcError' | 'invalidContract' | 'error';
    computedHash?: string;
    matchedTx?: any;
    revealProvenance?: any;
    errorMessage?: string;
  }>({ status: 'idle' });

  const handleVerify = async () => {
    if (mode !== 'reveal' && !inputText.trim()) {
      setResult({
        status: 'error',
        errorMessage: 'Original content text is required for verification.',
      });
      return;
    }

    if (mode === 'private') {
      if (!authorInput.trim() || !ethers.isAddress(authorInput.trim())) {
        setResult({
          status: 'error',
          errorMessage: 'A valid author EVM wallet address is required for verification.',
        });
        return;
      }
      if (!secretInput.trim()) {
        setResult({
          status: 'error',
          errorMessage: 'The 32-byte secret key (e.g. 0x...) from your proof file is required for Private Proof verification.',
        });
        return;
      }
      if (!secretInput.trim().startsWith('0x') || secretInput.trim().length !== 66) {
        setResult({
          status: 'error',
          errorMessage: 'Invalid secret key format. Secret salt must be a valid 32-byte hex string (66 characters starting with 0x).',
        });
        return;
      }
    }

    setIsVerifying(true);
    setResult({ status: 'idle' });

    try {
      const chain = SUPPORTED_CHAINS[selectedChainId];
      if (!chain || chain.deploymentStatus === 'coming_soon' || !chain.contractAddress) {
        setResult({
          status: 'error',
          errorMessage: `Chain Not Supported: InscribeSoul is not deployed on ${chain?.name || selectedChainId}.`,
        });
        setIsVerifying(false);
        return;
      }

      const provider = new ethers.JsonRpcProvider(chain.rpcUrl, undefined, { staticNetwork: true });
      const iface = new ethers.Interface(CONTRACT_ABI);

      if (mode === 'reveal') {
        if (!txHashInput.trim()) {
          setResult({
            status: 'error',
            errorMessage: 'Reveal Transaction Hash is required for Reveal Proof verification.',
          });
          setIsVerifying(false);
          return;
        }

        let receipt;
        try {
          receipt = await provider.getTransactionReceipt(txHashInput.trim());
        } catch (rpcErr: any) {
          setResult({
            status: 'rpcError',
            errorMessage: `Unable to verify: Blockchain RPC query failed (${rpcErr.message || 'Network error'}).`,
          });
          setIsVerifying(false);
          return;
        }

        if (!receipt) {
          setResult({
            status: 'notFound',
            errorMessage: `Transaction Not Found: No transaction receipt exists on ${chain.name} for hash ${txHashInput.trim()}.`,
          });
          setIsVerifying(false);
          return;
        }

        let revealLog: any = null;
        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed && parsed.name === 'ProofRevealed') {
              revealLog = {
                parsed,
                blockNumber: receipt.blockNumber,
                transactionHash: receipt.hash,
              };
              break;
            }
          } catch (e) {}
        }

        if (!revealLog) {
          setResult({
            status: 'notFound',
            errorMessage: 'Proof Does Not Match: Transaction exists, but does not contain a valid ProofRevealed event log.',
          });
          setIsVerifying(false);
          return;
        }

        const revealArgs = revealLog.parsed.args;
        const revealAuthor = revealArgs.author;
        const origCommitment = revealArgs.originalCommitmentHash;
        const origTxHash = revealArgs.originalTransactionHash;
        const secret = revealArgs.secret;
        const content = revealArgs.content;

        // 1. Recompute commitment locally
        const computedCommitment = computePrivateCommitmentHash(revealAuthor, secret, content);
        const isCommitmentValid = computedCommitment.toLowerCase() === origCommitment.toLowerCase();

        // 2. Query original transaction RPC receipt for historical provenance
        let origTxFound = false;
        let origLogMatched = false;
        let origBlockNumber: any = 'Unknown';
        let origTimestampISO = 'Unknown';

        try {
          const origReceipt = await provider.getTransactionReceipt(origTxHash);
          if (origReceipt) {
            origTxFound = true;
            origBlockNumber = origReceipt.blockNumber;
            const origBlock = await provider.getBlock(origReceipt.blockNumber);
            if (origBlock) {
              origTimestampISO = new Date(origBlock.timestamp * 1000).toISOString();
            }

            for (const log of origReceipt.logs) {
              try {
                const parsed = iface.parseLog(log);
                if (
                  parsed &&
                  parsed.name === 'PrivateProof' &&
                  parsed.args.author.toLowerCase() === revealAuthor.toLowerCase() &&
                  parsed.args.commitmentHash.toLowerCase() === origCommitment.toLowerCase()
                ) {
                  origLogMatched = true;
                  break;
                }
              } catch (e) {}
            }
          }
        } catch (e) {}

        const revealBlock = await provider.getBlock(receipt.blockNumber);
        const revealTimestampISO = revealBlock
          ? new Date(revealBlock.timestamp * 1000).toISOString()
          : 'Block timestamp verified';

        setResult({
          status: isCommitmentValid && origLogMatched ? 'success' : 'notFound',
          computedHash: computedCommitment,
          revealProvenance: {
            revealAuthor,
            content,
            secret,
            origCommitment,
            origTxHash,
            origBlockNumber,
            origTimestampISO,
            revealTxHash: receipt.hash,
            revealBlockNumber: receipt.blockNumber,
            revealTimestampISO,
            isCommitmentValid,
            origTxFound,
            origLogMatched,
            chainName: chain.name,
          },
          errorMessage:
            !isCommitmentValid
              ? 'Cryptographic Failure: Recomputed commitment hash does not match original commitment.'
              : !origLogMatched
              ? 'Provenance Failure: Referenced original transaction did not contain a matching PrivateProof event.'
              : undefined,
        });
        setIsVerifying(false);
        return;
      }

      // Standard Public or Private Proof Verification (Item 1: Preserves exact UTF-8 semantics)
      const cleanAuthor = ethers.getAddress(authorInput.trim());
      const computedHash =
        mode === 'private'
          ? computePrivateCommitmentHash(cleanAuthor, secretInput.trim(), inputText)
          : computePublicProofHash(cleanAuthor, inputText);

      if (txHashInput.trim()) {
        let receipt;
        try {
          receipt = await provider.getTransactionReceipt(txHashInput.trim());
        } catch (rpcErr: any) {
          setResult({
            status: 'rpcError',
            errorMessage: `Unable to verify: Blockchain RPC query failed (${rpcErr.message || 'Network error'}).`,
          });
          setIsVerifying(false);
          return;
        }

        if (!receipt) {
          setResult({
            status: 'notFound',
            computedHash,
            errorMessage: `Transaction Not Found: No transaction receipt exists on ${chain.name} for hash ${txHashInput.trim()}.`,
          });
          setIsVerifying(false);
          return;
        }

        let matchedLog: any = null;
        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed) {
              const eventHash = parsed.args.proofHash || parsed.args.commitmentHash;
              if (
                parsed.args.author.toLowerCase() === cleanAuthor.toLowerCase() &&
                eventHash.toLowerCase() === computedHash.toLowerCase()
              ) {
                matchedLog = {
                  parsed,
                  blockNumber: receipt.blockNumber,
                  transactionHash: receipt.hash,
                };
                break;
              }
            }
          } catch (e) {}
        }

        if (matchedLog) {
          const block = await provider.getBlock(matchedLog.blockNumber);
          const blockTimestampISO = block
            ? new Date(block.timestamp * 1000).toISOString()
            : 'Block timestamp verified';

          setResult({
            status: 'success',
            computedHash,
            matchedTx: {
              author: matchedLog.parsed.args.author,
              chainName: chain.name,
              blockNumber: matchedLog.blockNumber,
              txHash: matchedLog.transactionHash,
              timestampISO: blockTimestampISO,
            },
          });
        } else {
          setResult({
            status: 'notFound',
            computedHash,
            errorMessage: 'Proof Does Not Match: Transaction exists, but recorded proof hash does NOT match this author, secret, and content on-chain.',
          });
        }
      } else {
        const targetTopic = mode === 'private' 
          ? iface.getEvent("PrivateProof")?.topicHash 
          : iface.getEvent("PublicInscription")?.topicHash;

        const approvedHistoricalContracts = getApprovedContractsForChain(chain.chainId);

        let logs: any[] = [];
        try {
          for (const histContract of approvedHistoricalContracts) {
            const histLogs = await getLogsChunked({
              provider,
              address: histContract.address,
              topics: [
                targetTopic,
                ethers.zeroPadValue(cleanAuthor, 32),
                computedHash,
              ],
              fromBlock: histContract.deploymentBlock,
              toBlock: 'latest',
            });
            if (histLogs.length > 0) {
              logs.push(...histLogs);
            }
          }
        } catch (rpcErr: any) {
          setResult({
            status: 'rpcError',
            errorMessage: `Unable to verify: Blockchain RPC query failed (${rpcErr.message || 'Network error'}).`,
          });
          setIsVerifying(false);
          return;
        }

        if (logs.length > 0) {
          const matchedLog = logs[0];
          const block = await provider.getBlock(matchedLog.blockNumber);
          const blockTimestampISO = block
            ? new Date(block.timestamp * 1000).toISOString()
            : 'Block timestamp verified';

          setResult({
            status: 'success',
            computedHash,
            matchedTx: {
              author: cleanAuthor,
              chainName: chain.name,
              blockNumber: matchedLog.blockNumber,
              txHash: matchedLog.transactionHash,
              timestampISO: blockTimestampISO,
            },
          });
        } else {
          setResult({
            status: 'notFound',
            computedHash,
            errorMessage: `Proof Does Not Match: No matching ${mode === 'private' ? 'Private Proof' : 'Public Inscription'} event found on ${chain.name} for this exact content, author, and secret salt.`,
          });
        }
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      setResult({
        status: 'rpcError',
        errorMessage: `Unable to verify: Blockchain RPC query failed (${err.message || 'RPC node failed to respond'}).`,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8 px-4">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="font-serif text-3xl md:text-4xl tracking-wider text-stone-100 uppercase">
          Verify Proof
        </h1>
        <p className="text-stone-400 font-serif italic text-base max-w-xl mx-auto">
          Recompute and query blockchain event logs to verify that an exact thought existed on or before a recorded block timestamp.
        </p>
      </div>

      {/* Main Form Container */}
      <div className="bg-stone-900/40 border border-stone-800/80 rounded-2xl p-6 md:p-8 space-y-6 backdrop-blur-md shadow-2xl">
        {/* Mode Selector Tabs */}
        <div className="flex bg-stone-950 p-1 rounded-xl border border-stone-800 font-mono text-xs">
          <button
            onClick={() => {
              setMode('private');
              setResult({ status: 'idle' });
            }}
            className={`flex-1 py-2.5 rounded-lg uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              mode === 'private'
                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/50 shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Verify Private Proof
          </button>
          <button
            onClick={() => {
              setMode('public');
              setResult({ status: 'idle' });
            }}
            className={`flex-1 py-2.5 rounded-lg uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              mode === 'public'
                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/50 shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            Verify Public Inscription
          </button>
          <button
            onClick={() => {
              setMode('reveal');
              setResult({ status: 'idle' });
            }}
            className={`flex-1 py-2.5 rounded-lg uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              mode === 'reveal'
                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/50 shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Verify Reveal Proof
          </button>
        </div>

        {mode === 'reveal' ? (
          <div className="space-y-4 font-mono text-xs">
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-widest text-amber-400">
                Reveal Transaction Hash
              </label>
              <input
                type="text"
                value={txHashInput}
                onChange={(e) => setTxHashInput(e.target.value)}
                placeholder="0x..."
                className="w-full bg-stone-950/80 border border-amber-900/60 focus:border-amber-600 rounded-xl px-4 py-3 text-amber-200 font-mono text-xs placeholder:text-stone-600 focus:outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-widest text-stone-400">
                Target Chain
              </label>
              <select
                value={selectedChainId}
                onChange={(e) => setSelectedChainId(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 text-stone-200 rounded-xl px-4 py-3 text-xs font-mono focus:outline-none"
              >
                {Object.keys(SUPPORTED_CHAINS).map((id) => (
                  <option key={id} value={id}>
                    {SUPPORTED_CHAINS[id].name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <>
            {/* 1. Original Plaintext Content */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-widest text-stone-400 flex items-center justify-between">
                <span>1. Original Plaintext Content</span>
                <span className="text-[10px] text-stone-500 font-sans">Must match exact UTF-8 characters</span>
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste exact original text..."
                rows={5}
                className="w-full bg-stone-950/80 border border-stone-800 focus:border-amber-700/80 rounded-xl p-4 text-stone-200 font-mono text-xs placeholder:text-stone-600 focus:outline-none transition-all leading-relaxed resize-none shadow-inner"
              />
            </div>

            {/* 2 & 3. Author Address & Secret Key */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-widest text-stone-400">
                  2. Author Wallet Address
                </label>
                <input
                  type="text"
                  value={authorInput}
                  onChange={(e) => setAuthorInput(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-stone-950/80 border border-stone-800 focus:border-amber-700/80 rounded-xl px-4 py-3 text-stone-200 font-mono text-xs placeholder:text-stone-600 focus:outline-none transition-all"
                />
              </div>

              {mode === 'private' ? (
                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" />
                    3. Secret Key (32-Byte Salt)
                  </label>
                  <input
                    type="text"
                    value={secretInput}
                    onChange={(e) => setSecretInput(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-stone-950/80 border border-amber-900/60 focus:border-amber-600 rounded-xl px-4 py-3 text-amber-200 font-mono text-xs placeholder:text-stone-600 focus:outline-none transition-all"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-widest text-stone-400">
                    Target Chain
                  </label>
                  <select
                    value={selectedChainId}
                    onChange={(e) => setSelectedChainId(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 text-stone-200 rounded-xl px-4 py-3 text-xs font-mono focus:outline-none"
                  >
                    {Object.keys(SUPPORTED_CHAINS).map((id) => (
                      <option key={id} value={id}>
                        {SUPPORTED_CHAINS[id].name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Chain & Transaction Hash (Optional) */}
            {mode === 'private' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-widest text-stone-400">
                    Target Chain
                  </label>
                  <select
                    value={selectedChainId}
                    onChange={(e) => setSelectedChainId(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 text-stone-200 rounded-xl px-4 py-3 text-xs font-mono focus:outline-none"
                  >
                    {Object.keys(SUPPORTED_CHAINS).map((id) => (
                      <option key={id} value={id}>
                        {SUPPORTED_CHAINS[id].name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-widest text-stone-400">
                    Transaction Hash (Optional)
                  </label>
                  <input
                    type="text"
                    value={txHashInput}
                    onChange={(e) => setTxHashInput(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-stone-950/80 border border-stone-800 focus:border-amber-700/80 rounded-xl px-4 py-3 text-stone-200 font-mono text-xs placeholder:text-stone-600 focus:outline-none transition-all"
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Submit CTA */}
        <button
          onClick={handleVerify}
          disabled={isVerifying}
          className="w-full py-4 bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 hover:from-amber-600 hover:to-amber-800 disabled:opacity-40 text-amber-100 font-serif font-bold text-sm tracking-widest uppercase rounded-xl transition-all shadow-xl shadow-amber-950/40 flex items-center justify-center gap-2 cursor-pointer border border-amber-600/50"
        >
          <Search className="w-4 h-4 text-amber-300" />
          {isVerifying ? 'Querying Blockchain Event Logs...' : 'Verify Cryptographic Match'}
        </button>
      </div>

      {/* Result Displays */}
      {result.status === 'success' && mode === 'reveal' && result.revealProvenance && (
        <div className="p-6 bg-emerald-950/20 border border-emerald-800/60 rounded-2xl space-y-6 font-mono text-xs text-emerald-200 shadow-xl">
          <div className="flex items-center gap-3 border-b border-emerald-800/50 pb-4">
            <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
            <div>
              <h3 className="font-serif text-2xl text-emerald-400 uppercase tracking-wider font-bold">
                REVEAL PROOF VERIFIED ON-CHAIN
              </h3>
              <p className="text-[11px] text-stone-300 font-sans mt-0.5">
                Revealed content and secret salt reproduce original commitment hash recorded on {result.revealProvenance.chainName}.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-stone-950/90 rounded-xl border border-stone-800 space-y-2">
              <span className="text-[10px] text-amber-400 uppercase tracking-widest font-bold block">
                Revealed Content
              </span>
              <p className="text-stone-100 text-sm leading-relaxed font-mono whitespace-pre-wrap">
                {result.revealProvenance.content}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-stone-950/80 p-4 rounded-xl border border-stone-800 space-y-2 text-[11px]">
                <span className="text-amber-400 font-bold uppercase block pb-1 border-b border-stone-800">
                  1. Original Private Commitment
                </span>
                <div>
                  <span className="text-stone-400 block">Original Tx:</span>
                  <a
                    href={`https://sepolia.basescan.org/tx/${result.revealProvenance.origTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:underline flex items-center gap-1"
                  >
                    {truncateHash(result.revealProvenance.origTxHash, 8, 6)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div>
                  <span className="text-stone-400 block">Original Block:</span>
                  <span className="text-stone-200">#{result.revealProvenance.origBlockNumber} ({result.revealProvenance.origTimestampISO})</span>
                </div>
                <div>
                  <span className="text-stone-400 block">Commitment Hash:</span>
                  <span className="text-stone-300 break-all">{truncateHash(result.revealProvenance.origCommitment, 10, 8)}</span>
                </div>
              </div>

              <div className="bg-stone-950/80 p-4 rounded-xl border border-stone-800 space-y-2 text-[11px]">
                <span className="text-amber-400 font-bold uppercase block pb-1 border-b border-stone-800">
                  2. Public Reveal Transaction
                </span>
                <div>
                  <span className="text-stone-400 block">Reveal Tx:</span>
                  <a
                    href={`https://sepolia.basescan.org/tx/${result.revealProvenance.revealTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:underline flex items-center gap-1"
                  >
                    {truncateHash(result.revealProvenance.revealTxHash, 8, 6)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div>
                  <span className="text-stone-400 block">Reveal Block:</span>
                  <span className="text-stone-200">#{result.revealProvenance.revealBlockNumber} ({result.revealProvenance.revealTimestampISO})</span>
                </div>
                <div>
                  <span className="text-stone-400 block">Author Wallet:</span>
                  <span className="text-stone-200">{truncateHash(result.revealProvenance.revealAuthor, 8, 6)}</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-950/40 border border-emerald-700/60 rounded-xl text-[11px] space-y-1 text-emerald-300 font-sans">
              <div className="font-mono text-emerald-400 font-bold uppercase">PROVENANCE VERIFICATION CHECKLIST:</div>
              <div>✓ Reveal data reproduces original commitment hash</div>
              <div>✓ Original PrivateProof event found in block #{result.revealProvenance.origBlockNumber}</div>
              <div>✓ Author wallet ({truncateHash(result.revealProvenance.revealAuthor, 6, 4)}) matches original proof</div>
              <div>✓ Original commitment ({result.revealProvenance.origTimestampISO}) predates reveal</div>
            </div>
          </div>
        </div>
      )}

      {result.status === 'success' && mode !== 'reveal' && (
        <div className="p-6 bg-emerald-950/20 border border-emerald-800/60 rounded-2xl space-y-4 font-mono text-xs text-emerald-200 shadow-xl">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <h3 className="font-serif text-2xl text-emerald-400 uppercase tracking-wider font-bold">
                VERIFIED ON-CHAIN
              </h3>
              <p className="text-[11px] text-stone-300 font-sans mt-0.5">
                Exact content, author, and secret salt matched a recorded block event on {result.matchedTx?.chainName}.
              </p>
            </div>
          </div>

          <div className="bg-stone-950/80 p-4 rounded-xl border border-stone-800 space-y-2 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="text-stone-400">Recomputed Proof Hash:</span>
              <span className="text-emerald-400 font-bold break-all ml-2">{result.computedHash}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-400">Author Wallet:</span>
              <span className="text-stone-200">{result.matchedTx?.author}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-400">Block Height:</span>
              <span className="text-stone-200">#{result.matchedTx?.blockNumber}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-400">Blockchain Timestamp:</span>
              <span className="text-stone-200">{result.matchedTx?.timestampISO}</span>
            </div>
            {result.matchedTx?.txHash && (
              <div className="flex justify-between items-center pt-2 border-t border-stone-800">
                <span className="text-stone-400">Transaction Hash:</span>
                <a
                  href={`https://sepolia.basescan.org/tx/${result.matchedTx.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 hover:underline"
                >
                  {result.matchedTx.txHash.slice(0, 16)}...
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {result.status === 'notFound' && (
        <div className="p-6 bg-red-950/20 border border-red-800/60 rounded-2xl space-y-4 font-mono text-xs text-red-200 shadow-xl">
          <div className="flex items-center gap-3">
            <XCircle className="w-6 h-6 text-red-400 shrink-0" />
            <div>
              <h3 className="font-serif text-2xl text-red-400 uppercase tracking-wider font-bold">
                PROOF DOES NOT MATCH
              </h3>
              <p className="text-[11px] text-stone-300 font-sans mt-0.5">
                {result.errorMessage || 'No matching event log was found on-chain.'}
              </p>
            </div>
          </div>

          {result.computedHash && (
            <div className="bg-stone-950/80 p-4 rounded-xl border border-stone-800 text-[11px]">
              <span className="text-stone-400 block mb-1">Recomputed Proof Hash:</span>
              <span className="text-stone-300 break-all">{result.computedHash}</span>
            </div>
          )}
        </div>
      )}

      {result.status === 'rpcError' && (
        <div className="p-6 bg-amber-950/30 border border-amber-800/60 rounded-2xl space-y-3 font-mono text-xs text-amber-200 shadow-xl flex items-start gap-3">
          <WifiOff className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-serif text-xl text-amber-300 uppercase tracking-wider font-bold mb-1">
              UNABLE TO VERIFY — NETWORK/RPC ERROR
            </h3>
            <p className="text-stone-300 text-[11px] leading-relaxed">
              {result.errorMessage}
            </p>
          </div>
        </div>
      )}

      {result.status === 'error' && (
        <div className="p-4 bg-red-950/40 border border-red-800 rounded-xl text-red-200 font-mono text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{result.errorMessage}</span>
        </div>
      )}
    </div>
  );
};
