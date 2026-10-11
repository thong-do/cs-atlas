'use client'

import { LogIn } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth/context'
import { SignInDialog } from './sign-in-dialog'
import { UserMenu } from './user-menu'

export function AuthButton({ variant }: { variant: 'sidebar' | 'header' }) {
  const { status } = useAuth()
  const [open, setOpen] = useState(false)

  if (status === 'disabled') return null
  if (status === 'loading') return <div className="size-8" aria-hidden />
  if (status === 'signed-in') return <UserMenu />
  return (
    <>
      <Button
        variant="ghost"
        size={variant === 'sidebar' ? 'default' : 'icon'}
        aria-label="Sign in"
        onClick={() => setOpen(true)}
        className={variant === 'sidebar' ? 'justify-start gap-2 px-3 font-normal' : undefined}
      >
        <LogIn className="size-4" aria-hidden />
        {variant === 'sidebar' && 'Sign in'}
      </Button>
      <SignInDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
