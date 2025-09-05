'use client'

import Link from 'next/link'
import WalletButtonWrapper from './WalletButtonWrapper'

export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">Survey-X</h1>
              <span className="ml-2 text-sm text-gray-500 hidden sm:inline">Private Surveys</span>
            </Link>
          </div>

          {/* Wallet Button */}
          <WalletButtonWrapper />
        </div>
      </div>
    </header>
  )
}