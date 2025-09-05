import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import WalletProvider from '@/components/WalletProvider'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import '@/lib/suppressWalletErrors' // Suppress wallet extension errors

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Survey-X | Private Surveys on Solana',
  description: 'Create and respond to encrypted surveys with privacy-preserving MPC technology',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gradient-to-br from-slate-50 to-purple-50 text-gray-900 min-h-screen`}>
        <WalletProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </WalletProvider>
      </body>
    </html>
  )
}