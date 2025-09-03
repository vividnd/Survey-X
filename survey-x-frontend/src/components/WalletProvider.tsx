'use client';

import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { useMemo } from 'react';

// Import wallet styles
import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletProviderProps {
  children: React.ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => {
    // Prefer explicit RPC URL if provided (e.g., Helius)
    const envUrl = process.env.NEXT_PUBLIC_RPC_URL;
    if (envUrl && envUrl.length > 0) return envUrl;

    const heliusKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
    if (heliusKey && heliusKey.length > 0) {
      return `https://devnet.helius-rpc.com/?api-key=${heliusKey}`;
    }

    return clusterApiUrl(network);
  }, [network]);

  const wallets = useMemo(
    () => [new PhantomWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
