'use client'

import React, { useEffect, useState } from 'react'
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css'

export default function WalletProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const endpoint = 'https://api.devnet.solana.com'
  const wallets = [new PhantomWalletAdapter()]

  useEffect(() => {
    setMounted(true)
    
    // Clean up any conflicting wallet providers
    if (typeof window !== 'undefined') {
      // Handle multiple wallet extension conflicts
      const originalEthereum = (window as any).ethereum
      if (originalEthereum) {
        console.log('Ethereum wallet detected, ensuring Solana wallet compatibility')
        
        // Prevent multiple wallet extensions from conflicting
        try {
          // Store original ethereum provider
          if (!(window as any).__originalEthereum) {
            (window as any).__originalEthereum = originalEthereum
          }
        } catch (error) {
          console.log('Wallet extension conflict detected, continuing with Solana wallet')
        }
      }
    }
  }, [])

  // Only render wallet provider after mounting to prevent hydration errors
  if (!mounted) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-blue-600">Survey-X</h1>
                <span className="ml-2 text-sm text-gray-500 hidden sm:inline">Private Surveys</span>
              </div>
            </div>
          </div>
        </div>
        <main className="flex-1">
          {children}
        </main>
        <footer className="bg-gradient-to-r from-blue-50 to-purple-50 border-t border-gray-200 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <p className="text-gray-600">&copy; 2025 Survey-X. Built on Solana with Arcium MPC.</p>
            </div>
          </div>
        </footer>
      </div>
    )
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  )
}