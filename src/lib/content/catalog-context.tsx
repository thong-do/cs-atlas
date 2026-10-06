'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { Catalog, ExerciseMeta, LessonMeta, TrackMeta } from '@/lib/types'

type CatalogValue = Catalog & {
  trackBySlug: Map<string, TrackMeta>
  lessonBySlug: Map<string, LessonMeta>
  exerciseBySlug: Map<string, ExerciseMeta>
}

const CatalogContext = createContext<CatalogValue | null>(null)

export function CatalogProvider({ catalog, children }: { catalog: Catalog; children: ReactNode }) {
  const value = useMemo<CatalogValue>(
    () => ({
      ...catalog,
      trackBySlug: new Map(catalog.tracks.map((t) => [t.slug, t])),
      lessonBySlug: new Map(catalog.lessons.map((l) => [l.slug, l])),
      exerciseBySlug: new Map(catalog.exercises.map((e) => [e.slug, e])),
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
