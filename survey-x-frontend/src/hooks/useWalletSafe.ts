'use client'

import { useState, useEffect } from 'react'

export function useWalletSafe() {
  const [mounted, setMounted] = useState(false)
  const [walletState, setWalletState] = useState<{
    publicKey: any | null
    connected: boolean
    connecting: boolean
    disconnecting: boolean
    wallet: any | null
    wallets: any[]
    select: () => void
    connect: () => Promise<void>
    disconnect: () => Promise<void>
  }>({
    publicKey: null,
    connected: false,
    connecting: false,
    disconnecting: false,
    wallet: null,
    wallets: [],
    select: () => {},
    connect: () => Promise.resolve(),
    disconnect: () => Promise.resolve(),
  })

  useEffect(() => {
    setMounted(true)
    
    // Check for wallet connection state from browser storage/localStorage
    const checkWalletState = () => {
      try {
        // Check if Phantom wallet is connected (with error handling)
        if (typeof window !== 'undefined' && window.solana) {
          try {
            const isConnected = window.solana.isConnected
            const publicKey = window.solana.publicKey
            
            if (isConnected && publicKey) {
              console.log('✅ Solana wallet connected:', publicKey.toString())
              setWalletState(prev => ({
                ...prev,
                connected: true,
                publicKey: publicKey,
                wallet: window.solana
              }))
              return
            }
          } catch (e) {
            console.log('Error checking Solana wallet:', e)
            // Continue to other detection methods
          }
        }
        
        // Check localStorage for wallet connection state
        const storedWalletState = localStorage.getItem('wallet-adapter')
        if (storedWalletState) {
          try {
            const parsed = JSON.parse(storedWalletState)
            if (parsed.connected && parsed.publicKey) {
              console.log('✅ Found connected wallet in localStorage:', parsed.publicKey)
              setWalletState(prev => ({
                ...prev,
                connected: true,
                publicKey: parsed.publicKey
              }))
              return
            }
          } catch (e) {
            console.log('❌ Invalid stored wallet state:', e)
          }
        }
        
        // Check for other wallet adapter storage keys
        const keys = Object.keys(localStorage)
        for (const key of keys) {
          if (key.includes('wallet') || key.includes('phantom')) {
            try {
              const value = localStorage.getItem(key)
              if (value) {
                const parsed = JSON.parse(value)
                if (parsed.connected && parsed.publicKey) {
                  setWalletState(prev => ({
                    ...prev,
                    connected: true,
                    publicKey: parsed.publicKey
                  }))
                  return
                }
              }
            } catch (e) {
              // Skip invalid entries
            }
          }
        }
        
        // Default to disconnected
        setWalletState(prev => ({
          ...prev,
          connected: false,
          publicKey: null
        }))
      } catch (error) {
        console.log('Error checking wallet state:', error)
      }
    }

    // Check immediately
    checkWalletState()
    
    // Also check after a delay to catch late-loading extensions
    const delayedCheck = setTimeout(checkWalletState, 1000)
    
    // Listen for wallet connection events
    const handleWalletConnect = () => {
      setTimeout(checkWalletState, 200) // Longer delay to let extensions settle
    }
    
    if (typeof window !== 'undefined') {
      // Listen for wallet adapter events
      window.addEventListener('wallet-adapter-connect', handleWalletConnect)
      window.addEventListener('wallet-adapter-disconnect', handleWalletConnect)
      
      // Listen for Phantom-specific events if available
      if (window.solana && 'on' in window.solana && typeof (window.solana as any).on === 'function') {
        try {
          (window.solana as any).on('connect', handleWalletConnect)
          (window.solana as any).on('disconnect', handleWalletConnect)
        } catch (e) {
          console.log('Could not attach Phantom event listeners:', e)
        }
      }
      
      // Listen for storage changes
      window.addEventListener('storage', (e) => {
        if (e.key && (e.key.includes('wallet') || e.key.includes('phantom'))) {
          handleWalletConnect()
        }
      })
    }

    return () => {
      clearTimeout(delayedCheck)
      if (typeof window !== 'undefined') {
        window.removeEventListener('wallet-adapter-connect', handleWalletConnect)
        window.removeEventListener('wallet-adapter-disconnect', handleWalletConnect)
        window.removeEventListener('storage', handleWalletConnect)
        
        if (window.solana && 'removeListener' in window.solana && typeof (window.solana as any).removeListener === 'function') {
          try {
            (window.solana as any).removeListener('connect', handleWalletConnect)
            (window.solana as any).removeListener('disconnect', handleWalletConnect)
          } catch (e) {
            console.log('Could not remove Phantom event listeners:', e)
          }
        }
      }
    }
  }, [])

  // Return safe defaults during SSR
  if (!mounted) {
    return {
      publicKey: null,
      connected: false,
      connecting: false,
      disconnecting: false,
      wallet: null,
      wallets: [],
      select: () => {},
      connect: () => Promise.resolve(),
      disconnect: () => Promise.resolve(),
    }
  }

  return walletState
}

