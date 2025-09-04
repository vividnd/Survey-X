'use client'

import { Shield, Lock } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-blue-50 to-purple-50 border-t border-gray-200 mt-auto overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-4 top-1/2 transform -translate-y-1/2 animate-bounce">
            <Shield className="w-8 h-8 text-purple-400 opacity-20" />
          </div>
          <div className="absolute left-1/4 top-1/3 transform -translate-y-1/2 animate-pulse">
            <Lock className="w-6 h-6 text-purple-300 opacity-15" />
          </div>
          <div className="absolute right-1/4 top-2/3 transform -translate-y-1/2 animate-bounce delay-1000">
            <Shield className="w-5 h-5 text-purple-500 opacity-25" />
          </div>
          <div className="absolute -right-4 top-1/3 transform -translate-y-1/2 animate-pulse delay-500">
            <Lock className="w-7 h-7 text-purple-400 opacity-20" />
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-4">
              {/* Animated Purple Padlock */}
              <div className="relative">
                <Lock className="w-8 h-8 text-purple-600 animate-pulse" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-400 rounded-full animate-ping"></div>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Privacy-Preserving Surveys</h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Powered by <span className="text-purple-600 font-semibold">Arcium's MPC</span> technology on Solana.
              Your survey responses are encrypted and processed with confidential computing.
            </p>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <Shield className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">End-to-End Encryption</p>
            </div>
            <div className="text-center">
              <Lock className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Zero-Knowledge Proofs</p>
            </div>
            <div className="text-center">
              <Shield className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">MPC-Powered Privacy</p>
            </div>
          </div>

          {/* Footer Links */}
          <div className="text-center text-gray-500 text-sm border-t border-gray-200 pt-6">
            <p>&copy; 2025 Survey-X. Built on Solana with Arcium MPC.</p>
            <div className="mt-2 flex justify-center space-x-6">
              <a href="#" className="hover:text-purple-600 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-purple-600 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-purple-600 transition-colors">Documentation</a>
            </div>
          </div>
        </div>

        {/* Floating Animated Padlocks */}
        <div className="absolute bottom-4 left-4 animate-bounce delay-300">
          <Lock className="w-4 h-4 text-purple-300 opacity-30" />
        </div>
        <div className="absolute bottom-8 right-8 animate-pulse delay-700">
          <Shield className="w-5 h-5 text-purple-400 opacity-25" />
        </div>
        <div className="absolute top-4 right-4 animate-bounce delay-1000">
          <Lock className="w-3 h-3 text-purple-500 opacity-40" />
        </div>
      </div>
    </footer>
  )
}
