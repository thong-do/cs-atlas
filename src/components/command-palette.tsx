'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { useCatalog } from '@/lib/content/catalog-context'
import { exerciseHref, lessonHref } from '@/lib/content/hrefs'

const OPEN_EVENT = 'csatlas:open-palette'

export function openCommandPalette(): void {
  window.dispatchEvent(new Event(OPEN_EVENT))
}

const PAGES = [
  { href: '/', label: 'Today' },
  { href: '/tracks/', label: 'Tracks' },
  { href: '/roadmap/', label: 'Roadmap' },
  { href: '/exercises/', label: 'Exercises' },
  { href: '/train/', label: 'Train' },
  { href: '/stats/', label: 'Stats' },
  { href: '/settings/', label: 'Settings' },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { tracks, lessons, exercises } = useCatalog()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(OPEN_EVENT, onOpen)
    }
  }, [])

  const go = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Jump to" description="Search lessons and exercises">
      <Command>
      <CommandInput placeholder="Jump to a lesson or exercise…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Pages">
          {PAGES.map((p) => (
            <CommandItem key={p.href} value={`page ${p.label}`} onSelect={() => go(p.href)}>{p.label}</CommandItem>
          ))}
        </CommandGroup>
        {tracks.map((t) => (
          <CommandGroup key={t.slug} heading={t.title}>
            {lessons.filter((l) => l.track === t.slug).map((l) => (
              <CommandItem key={l.slug} value={`lesson ${l.title} ${l.slug} ${t.title}`} onSelect={() => go(lessonHref(l))}>{l.title}</CommandItem>
            ))}
          </CommandGroup>
        ))}
        <CommandGroup heading="Exercises">
          {exercises.map((p) => (
            <CommandItem key={p.slug} value={`exercise ${p.leetcodeId} ${p.title}`} onSelect={() => go(exerciseHref(p.slug))}>
              <span className="text-muted-foreground">{p.leetcodeId}.</span> {p.title}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
      </Command>
    </CommandDialog>
  )
}
