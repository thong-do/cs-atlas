import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function NotFound() {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
  return (
    <div className="mx-auto max-w-md space-y-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-muted-foreground">That lesson or exercise doesn’t exist. Try searching:</p>
      <form action={`${base}/exercises/`} method="get" className="flex gap-2">
        <Input name="q" placeholder="Search exercises…" aria-label="Search exercises" />
        <Button type="submit">Search</Button>
      </form>
      <Link href="/" className="underline">Back to Today</Link>
    </div>
  )
}
