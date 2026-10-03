import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { AppShell } from '@/components/app-shell'
import { Providers } from '@/components/providers'
import { getCatalog } from '@/lib/content'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LeetHub',
  description: 'Learn algorithm patterns, practice LeetCode, and remember what you solved.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const catalog = getCatalog()
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground antialiased`}>
        <Providers catalog={catalog}>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  )
}
