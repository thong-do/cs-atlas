'use client'

import { ThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'
import { ThemeSync } from '@/components/theme-sync'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/lib/auth/context'
import { CatalogProvider } from '@/lib/content/catalog-context'
import { StoreProvider } from '@/lib/store/context'
import type { Catalog } from '@/lib/types'

export function Providers({ catalog, children }: { catalog: Catalog; children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <CatalogProvider catalog={catalog}>
        <AuthProvider>
          <StoreProvider>
            <ThemeSync />
            {children}
            <Toaster richColors position="top-center" />
          </StoreProvider>
        </AuthProvider>
      </CatalogProvider>
    </ThemeProvider>
  )
}
