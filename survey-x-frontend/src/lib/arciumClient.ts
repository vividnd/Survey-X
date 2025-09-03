import * as anchor from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, RPC_URL } from './constants';

export function getProvider(): anchor.AnchorProvider {
  const connection = new Connection(RPC_URL ?? anchor.web3.clusterApiUrl('devnet'), 'confirmed');
  // In-app provider is supplied by wallet-adapter; here we just create a fallback for read ops if needed
  const wallet = new anchor.Wallet(anchor.web3.Keypair.generate());
  return new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
}

export function getProgramId(): PublicKey {
  return new PublicKey(PROGRAM_ID);
}


