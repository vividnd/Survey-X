import * as anchor from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import type { AnchorWallet } from '@solana/wallet-adapter-react';
import {
  getMXEPublicKey,
  getComputationAccAddress,
  getMXEAccAddress,
  getMempoolAccAddress,
  getExecutingPoolAccAddress,
  getCompDefAccAddress,
  getCompDefAccOffset,
  awaitComputationFinalization,
  deserializeLE,
  RescueCipher,
  x25519,
  getArciumEnv,
} from '@arcium-hq/client';
import { PROGRAM_ID } from './constants';

function randomU64BN(): anchor.BN {
  // Simple u64 from time; sufficient for unique offset per call
  return new anchor.BN(Date.now());
}

async function hashToU64(payload: Record<string, unknown>): Promise<bigint> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest).slice(0, 8);
  let val = 0n;
  for (let i = 0; i < 8; i++) {
    val |= BigInt(bytes[i]) << (8n * BigInt(i));
  }
  return val;
}

export async function submitSurveyEncrypted(
  input: Record<string, unknown>,
  connection: Connection,
  wallet: AnchorWallet
): Promise<{ queueSig: string; finalizeSig: string; decryptedResponse?: bigint }> {
  const provider = new anchor.AnchorProvider(connection, wallet as unknown as anchor.Wallet, { commitment: 'confirmed' });
  anchor.setProvider(provider);

  const programId = new PublicKey(PROGRAM_ID);
  const idl = await anchor.Program.fetchIdl(programId, provider);
  if (!idl) throw new Error('IDL not found for program');
  // @ts-expect-error Anchor Program constructor overloads differ across versions; this is correct at runtime
  const program = new anchor.Program(idl as anchor.Idl, programId, provider);

  // Keys and cipher
  const mxePublicKey = await getMXEPublicKey(provider as anchor.AnchorProvider, program.programId);
  if (!mxePublicKey) throw new Error('MXE x25519 public key not found');
  const privateKey = x25519.utils.randomSecretKey();
  const publicKey = x25519.getPublicKey(privateKey);
  const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey as Uint8Array);
  const cipher = new RescueCipher(sharedSecret);
  // Encode survey payload to u64
  const encoded = await hashToU64(input);
  const nonce = crypto.getRandomValues(new Uint8Array(16));
  const ciphertext = cipher.encrypt([encoded], nonce); // single field

  const computationOffset = randomU64BN();

  // Prepare event wait (ResponseEvent)
  type ResponseEvent = { response: number[] | Uint8Array; nonce: number[] | Uint8Array };
  const eventPromise: Promise<ResponseEvent> = new Promise((resolve) => {
    (program as unknown as { addEventListener: (name: string, cb: (ev: ResponseEvent) => void) => number })
      .addEventListener('responseEvent', (ev) => resolve(ev));
  });

  // Ensure comp def is initialized (best effort)
  try {
    const offset = Buffer.from(getCompDefAccOffset('submit_response')).readUInt32LE();
    const compDefPda = getCompDefAccAddress(program.programId, offset);
    await program.methods
      .initSubmitResponseCompDef()
      .accounts({
        payer: wallet.publicKey,
        mxeAccount: getMXEAccAddress(program.programId),
        compDefAccount: compDefPda,
        arciumProgram: new PublicKey('BKck65TgoKRokMjQM3datB9oRwJ8rAj2jxPXvHXUvcL6'),
      })
      .rpc({ commitment: 'confirmed' });
  } catch {
    // ignore if already initialized
  }

  const queueSig = await program.methods
    .submitResponse(
      computationOffset,
      Array.from(ciphertext[0]),
      Array.from(publicKey),
      new anchor.BN(deserializeLE(nonce).toString())
    )
    .accountsPartial({
      computationAccount: getComputationAccAddress(program.programId, computationOffset),
      clusterAccount: getArciumEnv().arciumClusterPubkey,
      mxeAccount: getMXEAccAddress(program.programId),
      mempoolAccount: getMempoolAccAddress(program.programId),
      executingPool: getExecutingPoolAccAddress(program.programId),
      compDefAccount: getCompDefAccAddress(
        program.programId,
        Buffer.from(getCompDefAccOffset('submit_response')).readUInt32LE()
      ),
    })
    .rpc({ commitment: 'confirmed' });

  const finalizeSig = await awaitComputationFinalization(
    provider as anchor.AnchorProvider,
    computationOffset,
    program.programId,
    'confirmed'
  );

  let decryptedResponse: bigint | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('event timeout')), 15000));
    const ev = await Promise.race([eventPromise, timeout]);
    if (ev && (ev as ResponseEvent).response && (ev as ResponseEvent).nonce) {
      const e = ev as ResponseEvent;
      const out = cipher.decrypt(
        [Array.from(e.response)],
        e.nonce instanceof Uint8Array ? e.nonce : new Uint8Array(e.nonce)
      )[0];
      decryptedResponse = out;
    }
  } catch {}

  return { queueSig, finalizeSig, decryptedResponse };
}

export async function createSurveyEncrypted(
  surveyData: Record<string, unknown>,
  connection: Connection,
  wallet: AnchorWallet
): Promise<{ queueSig: string; finalizeSig: string; decryptedResponse?: bigint }> {
  const provider = new anchor.AnchorProvider(connection, wallet as unknown as anchor.Wallet, { commitment: 'confirmed' });
  anchor.setProvider(provider);

  const programId = new PublicKey(PROGRAM_ID);
  const idl = await anchor.Program.fetchIdl(programId, provider);
  if (!idl) throw new Error('IDL not found for program');
  // @ts-expect-error Anchor Program constructor overloads differ across versions; this is correct at runtime
  const program = new anchor.Program(idl as anchor.Idl, programId, provider);

  // Keys and cipher
  const mxePublicKey = await getMXEPublicKey(provider as anchor.AnchorProvider, program.programId);
  if (!mxePublicKey) throw new Error('MXE x25519 public key not found');
  const privateKey = x25519.utils.randomSecretKey();
  const publicKey = x25519.getPublicKey(privateKey);
  const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey as Uint8Array);
  const cipher = new RescueCipher(sharedSecret);
  
  // Encode survey data to u64
  const encoded = await hashToU64(surveyData);
  const nonce = crypto.getRandomValues(new Uint8Array(16));
  const ciphertext = cipher.encrypt([encoded], nonce);

  const computationOffset = randomU64BN();

  // Prepare event wait (SurveyCreatedEvent)
  type SurveyCreatedEvent = { survey_hash: number[] | Uint8Array; nonce: number[] | Uint8Array };
  const eventPromise: Promise<SurveyCreatedEvent> = new Promise((resolve) => {
    (program as unknown as { addEventListener: (name: string, cb: (ev: SurveyCreatedEvent) => void) => number })
      .addEventListener('surveyCreatedEvent', (ev) => resolve(ev));
  });

  // Ensure comp def is initialized (best effort)
  try {
    const offset = Buffer.from(getCompDefAccOffset('create_survey')).readUInt32LE();
    const compDefPda = getCompDefAccAddress(program.programId, offset);
    await program.methods
      .initCreateSurveyCompDef()
      .accounts({
        payer: wallet.publicKey,
        mxeAccount: getMXEAccAddress(program.programId),
        compDefAccount: compDefPda,
        arciumProgram: new PublicKey('BKck65TgoKRokMjQM3datB9oRwJ8rAj2jxPXvHXUvcL6'),
      })
      .rpc({ commitment: 'confirmed' });
  } catch {
    // ignore if already initialized
  }

  const queueSig = await program.methods
    .createSurvey(
      computationOffset,
      Array.from(ciphertext[0]),
      Array.from(publicKey),
      new anchor.BN(deserializeLE(nonce).toString())
    )
    .accountsPartial({
      computationAccount: getComputationAccAddress(program.programId, computationOffset),
      clusterAccount: getArciumEnv().arciumClusterPubkey,
      mxeAccount: getMXEAccAddress(program.programId),
      executingPool: getExecutingPoolAccAddress(program.programId),
      compDefAccount: getCompDefAccAddress(
        program.programId,
        Buffer.from(getCompDefAccOffset('create_survey')).readUInt32LE()
      ),
    })
    .rpc({ commitment: 'confirmed' });

  const finalizeSig = await awaitComputationFinalization(
    provider as anchor.AnchorProvider,
    computationOffset,
    program.programId,
    'confirmed'
  );

  let decryptedResponse: bigint | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('event timeout')), 15000));
    const ev = await Promise.race([eventPromise, timeout]);
    if (ev && (ev as SurveyCreatedEvent).survey_hash && (ev as SurveyCreatedEvent).nonce) {
      const e = ev as SurveyCreatedEvent;
      const out = cipher.decrypt(
        [Array.from(e.survey_hash)],
        e.nonce instanceof Uint8Array ? e.nonce : new Uint8Array(e.nonce)
      )[0];
      decryptedResponse = out;
    }
  } catch {}

  return { queueSig, finalizeSig, decryptedResponse };
}
