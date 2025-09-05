declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      isConnected?: boolean;
      publicKey?: any;
      connect?: () => Promise<any>;
      disconnect?: () => Promise<void>;
      signTransaction?: (transaction: any) => Promise<any>;
      signAllTransactions?: (transactions: any[]) => Promise<any[]>;
    };
  }
}

export {};
