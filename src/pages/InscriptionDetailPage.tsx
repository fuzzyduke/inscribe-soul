import React, { useEffect, useState } from 'react';
import { SUPPORTED_CHAINS, CONTRACT_ABI, getApprovedContractsForChain, getLogsChunked } from '../config/chains';
import { truncateHash } from '../utils/hashing';
import { ShieldCheck, Eye, ExternalLink, Calendar, Database, Layers, KeyRound, CheckCircle2, ArrowRight } from 'lucide-react';
import { ethers } from 'ethers';

interface InscriptionDetailPageProps {
  chainId: string;
  txHash: string;
  onBack: () => void;
}

export const InscriptionDetailPage: React.FC<InscriptionDetailPageProps> = ({
  chainId,
  txHash,
  onBack,
}) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInscription() {
      setIsLoading(true);
      setError(null);

      try {
        const chain = SUPPORTED_CHAINS[chainId] || SUPPORTED_CHAINS.baseSepolia;
        const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
        const receipt = await provider.getTransactionReceipt(txHash);

        if (!receipt) {
          throw new Error('Transaction receipt not found on chain RPC.');
        }

        const iface = new ethers.Interface(CONTRACT_ABI);

        let matchedEvent: any = null;
        let mode: 'public' | 'private' | 'reveal' = 'private';

        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed) {
              matchedEvent = parsed;
              if (parsed.name === 'PublicInscription') mode = 'public';
              else if (parsed.name === 'ProofRevealed') mode = 'reveal';
              else mode = 'private';
              break;
            }
          } catch (e) {}
        }

        const block = await provider.getBlock(receipt.blockNumber);
        const timestampDate = block
          ? new Date(block.timestamp * 1000).toLocaleString()
          : 'Timestamp recorded on-chain';

        const proofHash = matchedEvent
          ? matchedEvent.args.proofHash || matchedEvent.args.commitmentHash || matchedEvent.args.originalCommitmentHash
          : 'Unknown';

        // Check if Private Proof has a corresponding Reveal event log on-chain
        let revealLogData: any = null;
        if (mode === 'private') {
          try {
            const v1_1Contract = (getApprovedContractsForChain(chain.chainId) || []).find((c) => c.supportsReveal) || { address: chain.contractAddress, deploymentBlock: 45207053 };
            const revealLogs = await getLogsChunked({
              provider,
              address: v1_1Contract.address,
              topics: [
                iface.getEvent("ProofRevealed")?.topicHash,
                ethers.zeroPadValue(receipt.from, 32),
                proofHash,
              ],
              fromBlock: v1_1Contract.deploymentBlock,
              toBlock: 'latest',
            });
            if (revealLogs.length > 0) {
              const revLog = revealLogs[0];
              const revParsed = iface.parseLog(revLog);
              const revBlock = await provider.getBlock(revLog.blockNumber);
              revealLogData = {
                revealTxHash: revLog.transactionHash,
                revealBlockNumber: revLog.blockNumber,
                revealTimestamp: revBlock ? new Date(revBlock.timestamp * 1000).toLocaleString() : 'Timestamp verified',
                content: revParsed?.args.content,
                secret: revParsed?.args.secret,
              };
            }
          } catch (e) {}
        }

        setData({
          chain: chain.name,
          explorer: chain.blockExplorerUrl,
          contractAddress: chain.contractAddress,
          txHash,
          blockNumber: receipt.blockNumber,
          timestamp: timestampDate,
          mode,
          author: matchedEvent ? matchedEvent.args.author : receipt.from,
          proofHash,
          content: matchedEvent && matchedEvent.args.content ? matchedEvent.args.content : undefined,
          secret: matchedEvent && matchedEvent.args.secret ? matchedEvent.args.secret : undefined,
          origTxHash: matchedEvent && matchedEvent.args.originalTransactionHash ? matchedEvent.args.originalTransactionHash : undefined,
          revealLogData,
          protocolVersion: 'INSCRIBESOUL_V1_1',
        });
      } catch (err: any) {
        setError(err.message || 'Failed to reconstruct inscription from blockchain');
      } finally {
        setIsLoading(false);
      }
    }

    loadInscription();
  }, [chainId, txHash]);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-amber-600 border-t-transparent animate-spin mx-auto" />
        <p className="font-mono text-xs text-stone-400">
          Reconstructing canonical inscription from EVM blockchain RPC...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-6">
        <h2 className="font-serif text-2xl text-red-400">Inscription Unresolvable</h2>
        <p className="font-mono text-xs text-stone-400">{error || 'Data missing'}</p>
        <button
          onClick={onBack}
          className="px-6 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-mono text-xs uppercase tracking-wider rounded-xl"
        >
          Return to App
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <button
        onClick={onBack}
        className="text-stone-400 hover:text-amber-400 font-mono text-xs transition-colors flex items-center gap-1"
      >
        ← Back to InscribeSoul
      </button>

      {/* Main Canonical Certificate Card */}
      <div className="bg-stone-900/80 border border-amber-900/50 rounded-2xl p-8 shadow-2xl space-y-8 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Layers className="w-64 h-64 text-amber-500" />
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {data.mode === 'private' ? (
                <ShieldCheck className="w-6 h-6 text-amber-400" />
              ) : (
                <Eye className="w-6 h-6 text-stone-300" />
              )}
              <h1 className="font-serif text-2xl text-stone-100 uppercase tracking-wide">
                Canonical Blockchain Inscription
              </h1>
            </div>
            <p className="text-xs font-mono text-stone-400">
              Protocol: <span className="text-amber-400 font-bold">{data.protocolVersion}</span>
            </p>
          </div>

          <span className="px-3 py-1.5 rounded-full bg-amber-950/60 border border-amber-800 text-amber-300 font-mono text-xs uppercase tracking-wider font-bold shrink-0">
            {data.mode === 'private' ? (data.revealLogData ? 'Private Proof (Revealed ✓)' : 'Private Proof (Sealed)') : data.mode === 'reveal' ? 'Proof Revealed' : 'Public Inscription'}
          </span>
        </div>

        {/* Connected Pair Provenance Banner for Revealed Proofs */}
        {data.revealLogData && (
          <div className="p-5 bg-emerald-950/20 border border-emerald-800/60 rounded-xl font-mono text-xs space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase text-xs">
              <CheckCircle2 className="w-4 h-4" />
              Revealed Provenance Pair Discovered
            </div>
            <p className="text-stone-300 text-[11px] font-sans">
              This original private commitment has been publicly revealed in a subsequent blockchain transaction.
            </p>
            <div className="p-4 bg-stone-950/90 rounded-lg border border-stone-800 space-y-2 text-[11px]">
              <span className="text-amber-400 font-bold uppercase block">Publicly Revealed Content:</span>
              <p className="text-stone-100 font-mono text-xs whitespace-pre-wrap">{data.revealLogData.content}</p>
              <div className="pt-2 border-t border-stone-800 flex justify-between items-center text-stone-400">
                <span>Reveal Transaction:</span>
                <a
                  href={`${data.explorer}/tx/${data.revealLogData.revealTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 hover:underline flex items-center gap-1"
                >
                  {truncateHash(data.revealLogData.revealTxHash, 8, 6)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Inscription Content (If Public or Reveal) */}
        {data.content && (
          <div className="space-y-2">
            <label className="block text-xs font-mono uppercase tracking-widest text-stone-400">
              On-Chain Plaintext Content
            </label>
            <div className="p-5 rounded-xl bg-stone-950/90 border border-stone-800 font-mono text-stone-200 text-xs leading-relaxed whitespace-pre-wrap break-words shadow-inner">
              {data.content}
            </div>
          </div>
        )}

        {/* Metadata Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          <div className="bg-stone-950/60 p-4 rounded-xl border border-stone-800 space-y-2">
            <span className="text-stone-500 block uppercase text-[10px] tracking-widest">Author Wallet</span>
            <span className="text-stone-200 font-semibold block truncate">{data.author}</span>
          </div>

          <div className="bg-stone-950/60 p-4 rounded-xl border border-stone-800 space-y-2">
            <span className="text-stone-500 block uppercase text-[10px] tracking-widest">Blockchain Target</span>
            <span className="text-stone-200 font-semibold block">{data.chain}</span>
          </div>

          <div className="bg-stone-950/60 p-4 rounded-xl border border-stone-800 space-y-2">
            <span className="text-stone-500 block uppercase text-[10px] tracking-widest">Block Height</span>
            <span className="text-stone-200 font-semibold block">#{data.blockNumber}</span>
          </div>

          <div className="bg-stone-950/60 p-4 rounded-xl border border-stone-800 space-y-2">
            <span className="text-stone-500 block uppercase text-[10px] tracking-widest">Timestamp</span>
            <span className="text-stone-200 font-semibold block">{data.timestamp}</span>
          </div>
        </div>

        {/* Hashes & Transactions */}
        <div className="bg-stone-950/90 p-5 rounded-xl border border-stone-800 space-y-3 font-mono text-xs">
          <div className="flex justify-between items-start">
            <span className="text-stone-400 shrink-0">Proof / Commitment Hash:</span>
            <span className="text-amber-400 font-bold break-all text-right ml-4">{data.proofHash}</span>
          </div>

          {data.origTxHash && (
            <div className="flex justify-between items-start pt-2 border-t border-stone-800">
              <span className="text-stone-400 shrink-0">Original Commitment Tx:</span>
              <a
                href={`${data.explorer}/tx/${data.origTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 hover:underline flex items-center gap-1 text-right ml-4"
              >
                {truncateHash(data.origTxHash, 8, 6)}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          <div className="flex justify-between items-start pt-2 border-t border-stone-800">
            <span className="text-stone-400 shrink-0">Transaction Hash:</span>
            <a
              href={`${data.explorer}/tx/${data.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="text-stone-300 hover:text-amber-400 flex items-center gap-1 transition-colors break-all text-right ml-4"
            >
              {data.txHash}
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </a>
          </div>

          <div className="flex justify-between items-start pt-2 border-t border-stone-800">
            <span className="text-stone-400 shrink-0">Smart Contract Address:</span>
            <span className="text-stone-300 break-all text-right ml-4">{data.contractAddress}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
