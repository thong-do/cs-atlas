'use client'

import Link from 'next/link'
import { needsBackupReminder } from '@/lib/logic/dates'
import { useLive, useStoreStatus } from '@/lib/store/context'

export function StatusBanners() {
  const { ready, available } = useStoreStatus()
  const backup = useLive(async (s) => ({ meta: await s.getMeta(), hasData: await s.hasData() }))
  const showBackup = backup && needsBackupReminder(backup.meta.lastBackupAt, backup.hasData, new Date())

  return (
    <>
      {ready && !available && (
        <div role="status" className="bg-amber-100 px-4 py-2 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">
          Progress won’t be saved in this browser — storage is unavailable (private browsing?).
        </div>
      )}
      {showBackup && (
        <div role="status" className="bg-sky-50 px-4 py-2 text-sm text-sky-950 dark:bg-sky-950 dark:text-sky-100">
          Your progress only lives in this browser.{' '}
          <Link href="/settings/" className="font-medium underline">Back it up</Link>.
        </div>
      )}
    </>
  )
}
