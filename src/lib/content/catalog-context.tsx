'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { Catalog, PatternMeta, ProblemMeta } from '@/lib/types'

type CatalogValue = Catalog & {
  patternBySlug: Map<string, PatternMeta>
  problemBySlug: Map<string, ProblemMeta>
}

const CatalogContext = createContext<CatalogValue | null>(null)

export function CatalogProvider({ catalog, children }: { catalog: Catalog; children: ReactNode }) {
  const value = useMemo<CatalogValue>(
    () => ({
      ...catalog,
      patternBySlug: new Map(catalog.patterns.map((p) => [p.slug, p])),
      problemBySlug: new Map(catalog.problems.map((p) => [p.slug, p])),
    }),
    [catalog],
  )
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog(): CatalogValue {
  const value = useContext(CatalogContext)
  if (!value) throw new Error('useCatalog must be used inside <CatalogProvider>')
  return value
}
