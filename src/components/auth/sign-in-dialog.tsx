'use client'

import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/lib/auth/context'

type Provider = 'github' | 'google'

export function SignInDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { signIn } = useAuth()
  const [pending, setPending] = useState<Provider | null>(null)

  async function go(provider: Provider) {
    setPending(provider)
    try {
      await signIn(provider)
    } catch (err) {
      setPending(null)
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const label = (provider: Provider, text: string) => (pending === provider ? 'Redirecting…' : text)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign in to CS Atlas</DialogTitle>
          <DialogDescription>
            Your progress syncs across devices. We store only your learning data — see <Link href="/privacy/" className="underline">Privacy</Link>.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button className="w-full" disabled={pending !== null} onClick={() => go('github')}>{label('github', 'Continue with GitHub')}</Button>
          <Button variant="outline" className="w-full" disabled={pending !== null} onClick={() => go('google')}>{label('google', 'Continue with Google')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
