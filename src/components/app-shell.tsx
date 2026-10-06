'use client'

import { BarChart3, ListChecks, Map as MapIcon, Search, Settings, Sun, Target } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { CommandPalette, openCommandPalette } from './command-palette'
import { MasteryCelebration } from './mastery-celebration'
import { StatusBanners } from './status-banners'

const NAV = [
  { href: '/', label: 'Today', icon: Sun },
  { href: '/roadmap/', label: 'Roadmap', icon: MapIcon },
  { href: '/exercises/', label: 'Exercises', icon: ListChecks },
  { href: '/train/', label: 'Train', icon: Target },
  { href: '/stats/', label: 'Stats', icon: BarChart3 },
]

const trim = (p: string) => p.replace(/\/+$/, '') || '/'

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = trim(usePathname() ?? '/')
  // Default to "Ctrl" (server render), then swap to the macOS glyph after mount to avoid a hydration mismatch.
  const [mac, setMac] = useState(false)
  useEffect(() => {
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } }
    setMac(/mac|iphone|ipad/i.test(nav.userAgentData?.platform ?? navigator.platform ?? ''))
  }, [])
  const isActive = (href: string) => {
    const h = trim(href)
    return h === '/' ? pathname === '/' : pathname === h || pathname.startsWith(`${h}/`)
  }

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-1 border-r p-4 md:flex">
        <Link href="/" className="mb-4 text-lg font-bold">LeetHub</Link>
        <button
          type="button"
          onClick={openCommandPalette}
          className="mb-3 flex items-center justify-between rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
        >
          <span className="flex items-center gap-2"><Search className="size-4" aria-hidden /> Search</span>
          <kbd className="text-xs">{mac ? '⌘K' : 'Ctrl K'}</kbd>
        </button>
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? 'page' : undefined}
            className={cn('flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted', isActive(href) && 'bg-muted font-medium')}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </Link>
        ))}
        <div className="mt-auto flex flex-col gap-1">
          <Link
            href="/settings/"
            aria-current={isActive('/settings/') ? 'page' : undefined}
            className={cn('flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted', isActive('/settings/') && 'bg-muted font-medium')}
          >
            <Settings className="size-4" aria-hidden /> Settings
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="flex h-12 items-center justify-between border-b px-4 md:hidden">
          <Link href="/" className="font-bold">LeetHub</Link>
          <div className="flex items-center gap-4">
            <button type="button" onClick={openCommandPalette} aria-label="Search"><Search className="size-5" /></button>
            <Link
              href="/settings/"
              aria-label="Settings"
              aria-current={isActive('/settings/') ? 'page' : undefined}
              className={cn(isActive('/settings/') ? 'text-foreground' : 'text-muted-foreground')}
            >
              <Settings className="size-5" />
            </Link>
          </div>
        </header>
        <StatusBanners />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background md:hidden" aria-label="Main">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? 'page' : undefined}
            className={cn('flex flex-col items-center gap-0.5 py-2 text-xs text-muted-foreground', isActive(href) && 'text-foreground')}
          >
            <Icon className="size-5" aria-hidden /> {label}
          </Link>
        ))}
      </nav>

      <CommandPalette />
      <MasteryCelebration />
    </div>
  )
}
