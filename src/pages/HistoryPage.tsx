import React, { useEffect, useState } from 'react';
import { SUPPORTED_CHAINS } from '../config/chains';
import { truncateHash } from '../utils/hashing';
import { History, ShieldCheck, Eye, ExternalLink, RefreshCw } from 'lucide-react';
import { ethers } from 'ethers';

interface HistoryPageProps {
  account: string | null;
  connectWallet: () => void;
  onSelectInscription: (chain: string, txHash: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  account,
  connectWallet,
  onSelectInscription,
}) => {
  const [inscriptions, setInscriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = async () => {
    if (!account) return;
    setIsLoading(true);

    try {
      const records: any[] = [];
      const cleanAccount = ethers.getAddress(account.toLowerCase());

      for (const chainKey of Object.keys(SUPPORTED_CHAINS)) {
        const chain = SUPPORTED_CHAINS[chainKey];
        try {
          const provider = new ethers.JsonRpcProvider(chain.rpcUrl, undefined, { staticNetwork: true });
          const currentBlock = await provider.getBlockNumber().catch(() => 0);
          if (!currentBlock) continue;

          const iface = new ethers.Interface([
            "event PublicInscription(address indexed author, bytes32 indexed proofHash, string content, uint256 timestamp)",
            "event PrivateProof(address indexed author, bytes32 indexed commitmentHash, uint256 timestamp)"
          ]);

          // Fetch Public Inscriptions
          const publicFilter = {
            address: chain.contractAddress,
            topics: [
              iface.getEvent("PublicInscription")?.topicHash,
              ethers.zeroPadValue(cleanAccount, 32),
            ],
            fromBlock: 0,
            toBlock: 'latest',
          };

          const publicLogs = await provider.getLogs(publicFilter).catch(async () => {
            // Fallback for RPCs enforcing 2000 block max query range
            const fallbackFromBlock = Math.max(0, currentBlock - 1999);
            return await provider.getLogs({ ...publicFilter, fromBlock: fallbackFromBlock }).catch(() => []);
          });

          for (const log of publicLogs) {
            try {
              const parsed = iface.parseLog(log);
              if (parsed) {
                records.push({
                  chain: chain.name,
                  chainId: chain.id,
                  mode: 'public',
                  author: parsed.args.author,
                  contentHash: parsed.args.proofHash,
                  content: parsed.args.content,
                  timestamp: new Date(Number(parsed.args.timestamp) * 1000).toLocaleDateString(),
                  txHash: log.transactionHash,
                  blockNumber: log.blockNumber,
                });
              }
            } catch (e) {}
          }

          // Fetch Private Proofs
          const privateFilter = {
            address: chain.contractAddress,
            topics: [
              iface.getEvent("PrivateProof")?.topicHash,
              ethers.zeroPadValue(cleanAccount, 32),
            ],
            fromBlock: 0,
            toBlock: 'latest',
          };

          const privateLogs = await provider.getLogs(privateFilter).catch(async () => {
            const fallbackFromBlock = Math.max(0, currentBlock - 1999);
            return await provider.getLogs({ ...privateFilter, fromBlock: fallbackFromBlock }).catch(() => []);
          });

          for (const log of privateLogs) {
            try {
              const parsed = iface.parseLog(log);
              if (parsed) {
                records.push({
                  chain: chain.name,
                  chainId: chain.id,
                  mode: 'private',
                  author: parsed.args.author,
                  contentHash: parsed.args.commitmentHash,
                  timestamp: new Date(Number(parsed.args.timestamp) * 1000).toLocaleDateString(),
                  txHash: log.transactionHash,
                  blockNumber: log.blockNumber,
                });
              }
            } catch (e) {}
          }
        } catch (e) {
          // Silent fallback per chain
        }
      }

      setInscriptions(records);
    } catch (err) {
      console.error('Failed to load wallet history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [account]);

  if (!account) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-500 mx-auto">
          <History className="w-8 h-8" />
        </div>
        <h2 className="font-serif text-2xl text-stone-100 uppercase tracking-wide">
          My Inscriptions
        </h2>
        <p className="text-stone-400 font-sans text-sm">
          Connect your Web3 wallet to query on-chain historical events recorded under your address.
        </p>
        <button
          onClick={connectWallet}
          className="px-6 py-3 bg-amber-900/60 hover:bg-amber-800/80 border border-amber-700/60 text-amber-200 font-mono text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between border-b border-stone-800 pb-4">
        <div>
          <h1 className="font-serif text-3xl text-stone-100 uppercase tracking-wider">
            My Inscriptions
          </h1>
          <p className="text-xs font-mono text-stone-400 mt-1">
            Connected: {truncateHash(account, 8, 6)}
          </p>
        </div>

        <button
          onClick={fetchHistory}
          disabled={isLoading}
          className="p-2.5 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 rounded-lg text-xs font-mono transition-all flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-stone-500 font-mono text-xs animate-pulse">
          Querying EVM event logs across supported chains...
        </div>
      ) : inscriptions.length === 0 ? (
        <div className="py-12 text-center text-stone-500 font-mono text-xs bg-stone-900/40 rounded-2xl border border-stone-800 p-8 space-y-3">
          <p>No inscriptions found for wallet address {account}.</p>
          <p className="text-stone-400 text-[11px]">
            If you deployed a fresh custom contract or completed a testnet transaction recently, click Refresh above.
          </p>
        </div>
      ) : (
        <div className="space-y-3 font-mono text-xs">
          {inscriptions.map((item, idx) => (
            <div
              key={idx}
              onClick={() => onSelectInscription(item.chainId, item.txHash)}
              className="p-4 bg-stone-900/60 hover:bg-stone-900 border border-stone-800 hover:border-amber-800/60 rounded-xl transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                {item.mode === 'private' ? (
                  <div className="w-8 h-8 rounded-lg bg-amber-950/60 border border-amber-800 flex items-center justify-center text-amber-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-400">
                    <Eye className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-200 uppercase">{item.mode}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-stone-950 text-stone-400 border border-stone-800">
                      {item.chain}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Hash: {truncateHash(item.contentHash, 10, 8)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div className="text-[11px] text-stone-400">
                  <p>{item.timestamp}</p>
                  <p className="text-stone-500 text-[10px]">Block #{item.blockNumber}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-stone-500" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
