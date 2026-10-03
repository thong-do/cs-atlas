'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { useCatalog } from '@/lib/content/catalog-context'

const OPEN_EVENT = 'leethub:open-palette'

export function openCommandPalette(): void {
  window.dispatchEvent(new Event(OPEN_EVENT))
}

const PAGES = [
  { href: '/', label: 'Today' },
  { href: '/roadmap/', label: 'Roadmap' },
  { href: '/problems/', label: 'Problems' },
  { href: '/train/', label: 'Train' },
  { href: '/stats/', label: 'Stats' },
  { href: '/settings/', label: 'Settings' },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { patterns, problems } = useCatalog()

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
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Jump to a pattern or problem…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Pages">
          {PAGES.map((p) => (
            <CommandItem key={p.href} value={`page ${p.label}`} onSelect={() => go(p.href)}>{p.label}</CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Patterns">
          {patterns.map((p) => (
            <CommandItem key={p.slug} value={`pattern ${p.title} ${p.slug}`} onSelect={() => go(`/patterns/${p.slug}/`)}>{p.title}</CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Problems">
          {problems.map((p) => (
            <CommandItem key={p.slug} value={`problem ${p.leetcodeId} ${p.title}`} onSelect={() => go(`/problems/${p.slug}/`)}>
              <span className="text-muted-foreground">{p.leetcodeId}.</span> {p.title}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
