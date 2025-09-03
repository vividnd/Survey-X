export const PROGRAM_ID =
  process.env.NEXT_PUBLIC_PROGRAM_ID ??
  'FoZGZMWrz5ATiCDJsyakp8bxF9gZjGBWZFGpJQrLEgtY';

export const CLUSTER_OFFSET: number = Number(
  process.env.NEXT_PUBLIC_CLUSTER_OFFSET ?? '1116522165'
);

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ||
  (process.env.NEXT_PUBLIC_HELIUS_API_KEY
    ? `https://devnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`
    : undefined);


