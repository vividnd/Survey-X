import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { PROGRAM_ID, RPC_URL } from './constants';

export function getProvider(): AnchorProvider {
  const connection = new Connection(RPC_URL ?? 'https://api.devnet.solana.com', 'confirmed');
  // In-app provider is supplied by wallet-adapter; here we just create a fallback for read ops if needed
  // Note: In production, this should use the actual wallet adapter
  const keypair = Keypair.generate();
  const wallet = {
    publicKey: keypair.publicKey,
    signTransaction: async (tx: any) => {
      tx.partialSign(keypair);
      return tx;
    },
    signAllTransactions: async (txs: any[]) => {
      return txs.map(tx => {
        tx.partialSign(keypair);
        return tx;
      });
    },
  };
  return new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
}

export function getProgramId(): PublicKey {
  return new PublicKey(PROGRAM_ID);
}


