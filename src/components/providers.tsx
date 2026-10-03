'use client'

import { ThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { CatalogProvider } from '@/lib/content/catalog-context'
import { StoreProvider } from '@/lib/store/context'
import type { Catalog } from '@/lib/types'

export function Providers({ catalog, children }: { catalog: Catalog; children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <CatalogProvider catalog={catalog}>
        <StoreProvider>
          {children}
          <Toaster richColors position="top-center" />
        </StoreProvider>
      </CatalogProvider>
    </ThemeProvider>
  )
}
