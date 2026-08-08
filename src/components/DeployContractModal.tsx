import React, { useState } from 'react';
import { ethers } from 'ethers';
import { SUPPORTED_CHAINS } from '../config/chains';
import { Rocket, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

// InscribeSoul V1 Bytecode & ABI for Browser In-Wallet Deployment
import artifact from '../../artifacts/contracts/InscribeSoul.sol/InscribeSoul.json';

interface DeployContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newAddress: string) => void;
}

export const DeployContractModal: React.FC<DeployContractModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isDeploying, setIsDeploying] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deployedTxHash, setDeployedTxHash] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDeploy = async () => {
    setIsDeploying(true);
    setErrorMsg(null);
    setStatusMsg('Connecting to Rabby Wallet...');

    try {
      if (!window.ethereum) {
        throw new Error('No EVM wallet detected in browser.');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Ensure connected to Base Sepolia (0x14a34 = 84532)
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: SUPPORTED_CHAINS.baseSepolia.hexChainId }],
        });
      } catch (switchError: any) {}

      const signer = await provider.getSigner();
      const balance = await provider.getBalance(signer.address);

      if (balance === 0n) {
        throw new Error(
          `Connected wallet (${signer.address.slice(0, 6)}...${signer.address.slice(-4)}) has 0 Base Sepolia ETH. Please get testnet ETH from a Base Sepolia faucet first.`
        );
      }

      setStatusMsg('Please confirm deployment transaction in Rabby Wallet...');

      const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
      const contract = await factory.deploy(0); // initialFee = 0

      const deployTx = contract.deploymentTransaction();
      if (deployTx) {
        setDeployedTxHash(deployTx.hash);
      }

      setStatusMsg('Deploying InscribeSoul V1 contract to Base Sepolia... Waiting for block confirmation...');
      await contract.waitForDeployment();

      const deployedAddress = await contract.getAddress();
      setStatusMsg(`Successfully deployed! Address: ${deployedAddress}`);

      // Callback to update application state with real contract address
      onSuccess(deployedAddress);
    } catch (err: any) {
      console.error('Deployment error:', err);
      setErrorMsg(err.reason || err.shortMessage || err.message || 'Deployment transaction failed or rejected.');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-stone-900 border border-amber-900/60 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6 relative">
        <div className="flex items-center gap-3 border-b border-stone-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-800 flex items-center justify-center text-amber-400">
            <Rocket className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif text-lg text-stone-100 font-bold uppercase tracking-wider">
              Deploy InscribeSoul V1
            </h2>
            <p className="text-xs font-mono text-stone-400">Base Sepolia Testnet</p>
          </div>
        </div>

        <p className="text-xs font-sans text-stone-300 leading-relaxed">
          Deploy the official minimalist event-based contract (`InscribeSoul.sol`) directly using your connected Rabby Wallet on <strong>Base Sepolia Testnet</strong>.
        </p>

        {statusMsg && (
          <div className="p-3 bg-amber-950/40 border border-amber-800/50 rounded-xl font-mono text-xs text-amber-200 animate-pulse">
            {statusMsg}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xl font-mono text-xs text-red-300 leading-relaxed">
            <strong>Error:</strong> {errorMsg}
          </div>
        )}

        {deployedTxHash && (
          <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 font-mono text-[11px] text-stone-300 flex justify-between items-center">
            <span>Deploy Tx:</span>
            <a
              href={`https://sepolia.basescan.org/tx/${deployedTxHash}`}
              target="_blank"
              rel="noreferrer"
              className="text-amber-400 hover:underline flex items-center gap-1"
            >
              {deployedTxHash.slice(0, 10)}...
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={isDeploying}
            className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-mono text-xs uppercase tracking-wider rounded-xl transition-all"
          >
            Cancel
          </button>

          <button
            onClick={handleDeploy}
            disabled={isDeploying}
            className="flex-1 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-serif font-bold text-sm tracking-wider uppercase rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {isDeploying ? 'Deploying...' : 'Deploy Contract'}
          </button>
        </div>
      </div>
    </div>
  );
};
