'use client'

import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { initials } from '@/components/auth/user-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth/context'

const PROVIDER_LABEL: Record<string, string> = { github: 'GitHub', google: 'Google' }
const message = (err: unknown) => (err instanceof Error ? err.message : String(err))

export function AccountSection() {
  const { status, user, signOut, deleteAccount } = useAuth()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  if (status !== 'signed-in' || !user) return null
  const provider = PROVIDER_LABEL[user.provider]

  async function doSignOut() {
    try {
      await signOut()
      toast.success('Signed out')
    } catch (err) {
      toast.error(message(err))
    }
  }

  async function doDelete() {
    setBusy(true)
    try {
      await deleteAccount()
      toast.success('Your account and data were deleted')
      setOpen(false)
    } catch (err) {
      toast.error(message(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Account</h2>
      <div className="flex items-center gap-3">
        <Avatar>
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />}
          <AvatarFallback>{initials(user.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-medium">{user.name}</p>
          <p className="text-sm text-muted-foreground">{provider ? `Signed in with ${provider}` : 'Signed in'}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={doSignOut}>Sign out</Button>
        <Button variant="destructive" onClick={() => { setConfirm(''); setOpen(true) }}>Delete account</Button>
      </div>
      <p className="text-sm text-muted-foreground">See the <Link href="/privacy/" className="underline">Privacy</Link> page for what we store.</p>

      <Dialog open={open} onOpenChange={(o) => { if (!busy) setOpen(o) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This permanently deletes your account and all its progress, notes and reviews. Export a backup first if you want to keep a copy.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
            <Input id="delete-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
          </div>
          <DialogFooter>
            <Button variant="destructive" disabled={confirm !== 'DELETE' || busy} onClick={doDelete}>Delete account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
