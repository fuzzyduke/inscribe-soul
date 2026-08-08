import React, { useEffect, useState } from 'react';
import { SUPPORTED_CHAINS } from '../config/chains';
import { truncateHash } from '../utils/hashing';
import { ShieldCheck, Eye, ExternalLink, Calendar, Database, Layers, KeyRound } from 'lucide-react';
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
        const chain = SUPPORTED_CHAINS[chainId] || SUPPORTED_CHAINS.base;
        const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
        const receipt = await provider.getTransactionReceipt(txHash);

        if (!receipt) {
          throw new Error('Transaction receipt not found on chain RPC.');
        }

        const iface = new ethers.Interface([
          "event PublicInscription(address indexed author, bytes32 indexed proofHash, string content, uint256 timestamp)",
          "event PrivateProof(address indexed author, bytes32 indexed commitmentHash, uint256 timestamp)"
        ]);

        let matchedEvent: any = null;
        let mode: 'public' | 'private' = 'private';

        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed) {
              matchedEvent = parsed;
              mode = parsed.name === 'PublicInscription' ? 'public' : 'private';
              break;
            }
          } catch (e) {}
        }

        const block = await provider.getBlock(receipt.blockNumber);
        const timestampDate = block
          ? new Date(block.timestamp * 1000).toLocaleString()
          : 'Timestamp recorded on-chain';

        const proofHash = matchedEvent
          ? matchedEvent.args.proofHash || matchedEvent.args.commitmentHash
          : 'Unknown';

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
          protocolVersion: 'INSCRIBESOUL_V1',
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
            {data.mode === 'private' ? 'Private Proof' : 'Public Inscription'}
          </span>
        </div>

        {/* Inscription Content (If Public) */}
        {data.mode === 'public' && data.content && (
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
            <span className="text-stone-400 shrink-0">Proof Hash:</span>
            <span className="text-amber-400 font-bold break-all text-right ml-4">{data.proofHash}</span>
          </div>

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
