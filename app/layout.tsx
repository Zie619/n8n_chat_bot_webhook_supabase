import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'xFunnel - Article Editor with Claude AI',
  description: 'Edit and manage articles with AI-powered assistance from Claude',
  keywords: 'article editor, AI assistant, Claude, content management',
}

import { Providers } from './providers'
import ConsoleBanner from './components/ConsoleBanner'
import Footer from './components/Footer'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full`}>
        <Providers>
          <ConsoleBanner />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  )
}