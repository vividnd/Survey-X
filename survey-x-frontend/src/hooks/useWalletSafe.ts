'use client'

import { useState, useEffect, useRef } from 'react'

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

  // Use ref to track stable connection state
  const stableConnectionRef = useRef<{
    publicKey: string | null
    connected: boolean
    lastChecked: number
  }>({
    publicKey: null,
    connected: false,
    lastChecked: 0
  })

  useEffect(() => {
    setMounted(true)
    
    // Stable wallet state checking with persistence
    const checkWalletState = () => {
      try {
        const now = Date.now()
        let detectedPublicKey: string | null = null
        let detectedConnected = false

        // Check if Phantom wallet is connected (with error handling)
        if (typeof window !== 'undefined' && window.solana) {
          try {
            const isConnected = window.solana.isConnected
            const publicKey = window.solana.publicKey

            console.log('🔍 Checking Solana wallet:', { isConnected, publicKey: publicKey?.toString() })

            if (isConnected && publicKey) {
              detectedPublicKey = publicKey.toString()
              detectedConnected = true
              console.log('✅ Solana wallet connected:', detectedPublicKey)
            }
          } catch (e) {
            console.log('Error checking Solana wallet:', e)
          }
        }

        // Additional check: Try to get wallet info directly
        if (!detectedPublicKey && typeof window !== 'undefined' && window.solana && window.solana.publicKey) {
          try {
            const publicKey = window.solana.publicKey
            if (publicKey) {
              detectedPublicKey = publicKey.toString()
              detectedConnected = true
              console.log('✅ Direct wallet connection found:', detectedPublicKey)
            }
          } catch (e) {
            console.log('Error in direct wallet check:', e)
          }
        }

        // Check localStorage for wallet connection state
        if (!detectedPublicKey) {
          const storedWalletState = localStorage.getItem('wallet-adapter')
          if (storedWalletState) {
            try {
              const parsed = JSON.parse(storedWalletState)
              if (parsed.connected && parsed.publicKey) {
                detectedPublicKey = parsed.publicKey
                detectedConnected = true
                console.log('✅ Found connected wallet in localStorage:', detectedPublicKey)
              }
            } catch (e) {
              console.log('❌ Invalid stored wallet state:', e)
            }
          }
        }

        // Check for other wallet adapter storage keys
        if (!detectedPublicKey) {
          const keys = Object.keys(localStorage)
          for (const key of keys) {
            if (key.includes('wallet') || key.includes('phantom')) {
              try {
                const value = localStorage.getItem(key)
                if (value) {
                  const parsed = JSON.parse(value)
                  if (parsed.connected && parsed.publicKey) {
                    detectedPublicKey = parsed.publicKey
                    detectedConnected = true
                    break
                  }
                }
              } catch (e) {
                // Skip invalid entries
              }
            }
          }
        }

        // Update stable connection reference
        if (detectedPublicKey && detectedConnected) {
          stableConnectionRef.current = {
            publicKey: detectedPublicKey,
            connected: true,
            lastChecked: now
          }
        } else if (now - stableConnectionRef.current.lastChecked > 10000) {
          // Only reset to disconnected if it's been more than 10 seconds since last check
          stableConnectionRef.current = {
            publicKey: null,
            connected: false,
            lastChecked: now
          }
        }

        // Update React state with stable values
        setWalletState(prev => ({
          ...prev,
          connected: stableConnectionRef.current.connected,
          publicKey: stableConnectionRef.current.connected ? stableConnectionRef.current.publicKey : null,
          wallet: stableConnectionRef.current.connected ? window.solana : null
        }))

      } catch (error) {
        console.log('Error checking wallet state:', error)
      }
    }

    // Check immediately
    checkWalletState()
    
    // Also check after delays to catch late-loading extensions
    const delayedCheck1 = setTimeout(checkWalletState, 500)
    const delayedCheck2 = setTimeout(checkWalletState, 1000)
    const delayedCheck3 = setTimeout(checkWalletState, 2000)
    const delayedCheck4 = setTimeout(checkWalletState, 3000)
    const delayedCheck5 = setTimeout(checkWalletState, 5000)
    
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
          // Could not attach Phantom event listeners
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
      clearTimeout(delayedCheck1)
      clearTimeout(delayedCheck2)
      clearTimeout(delayedCheck3)
      clearTimeout(delayedCheck4)
      clearTimeout(delayedCheck5)
      if (typeof window !== 'undefined') {
        window.removeEventListener('wallet-adapter-connect', handleWalletConnect)
        window.removeEventListener('wallet-adapter-disconnect', handleWalletConnect)
        window.removeEventListener('storage', handleWalletConnect)
        
        if (window.solana && 'removeListener' in window.solana && typeof (window.solana as any).removeListener === 'function') {
          try {
            (window.solana as any).removeListener('connect', handleWalletConnect)
            (window.solana as any).removeListener('disconnect', handleWalletConnect)
          } catch (e) {
            // Could not remove Phantom event listeners
          }
        }
      }
    }
  }, [])

  // Return stable state during SSR or when not mounted
  if (!mounted) {
    return {
      publicKey: stableConnectionRef.current.publicKey,
      connected: stableConnectionRef.current.connected,
      connecting: false,
      disconnecting: false,
      wallet: stableConnectionRef.current.connected ? window.solana : null,
      wallets: [],
      select: () => {},
      connect: () => Promise.resolve(),
      disconnect: () => Promise.resolve(),
    }
  }

  return walletState
}

