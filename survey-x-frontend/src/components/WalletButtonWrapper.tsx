'use client'

import { useState, useEffect } from 'react'

interface WalletButtonWrapperProps {
  className?: string
  mobile?: boolean
}

export default function WalletButtonWrapper({ className, mobile = false }: WalletButtonWrapperProps) {
  const [mounted, setMounted] = useState(false)
  const [WalletMultiButton, setWalletMultiButton] = useState<any>(null)

  useEffect(() => {
    // Wait for client-side to be fully ready
    const timer = setTimeout(async () => {
      try {
        // Dynamically import the wallet component only on client-side
        const { WalletMultiButton: WMB } = await import('@solana/wallet-adapter-react-ui')
        setWalletMultiButton(() => WMB)
        setMounted(true)
      } catch (error) {
        console.error('Failed to load wallet component:', error)
        // Still set mounted to true to show fallback
        setMounted(true)
      }
    }, 3000) // Wait 3 seconds to ensure everything is ready

    return () => clearTimeout(timer)
  }, [])

  // Don't render anything until mounted and component is loaded
  if (!mounted || !WalletMultiButton) {
    return (
      <div className={`w-24 h-8 bg-gray-200 rounded animate-pulse ${mobile ? '!text-sm' : ''}`} />
    )
  }

  return (
    <WalletMultiButton 
      className={className || `!bg-blue-600 hover:!bg-blue-700 !text-white !border-0 !rounded-lg !font-medium !px-4 !py-2 !h-auto ${mobile ? '!text-sm !px-3 !py-1' : ''}`} 
    />
  )
}
