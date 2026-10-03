'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { downloadText } from '@/lib/download'
import { formatDateTime } from '@/lib/format'
import { localDate } from '@/lib/logic/dates'
import { parseExport, type ExportFile } from '@/lib/logic/transfer'
import { useLive, useStore } from '@/lib/store/context'
import type { Settings } from '@/lib/types'

const message = (err: unknown) => (err instanceof Error ? err.message : String(err))

export function SettingsView() {
  const store = useStore()
  const { setTheme } = useTheme()
  const meta = useLive((s) => s.getMeta())
  const [retention, setRetention] = useState('')
  const [pending, setPending] = useState<ExportFile | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const savedRetention = meta?.settings.desiredRetention
  useEffect(() => {
    if (savedRetention !== undefined) setRetention(String(savedRetention))
  }, [savedRetention])

  async function exportBackup() {
    const now = new Date()
    const file = await store.exportAll(now)
    downloadText(JSON.stringify(file, null, 2), `leethub-backup-${localDate(now)}.json`)
    await store.markBackedUp(now).catch(() => undefined)
    toast.success('Backup downloaded')
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const result = parseExport(await file.text())
    if (!result.ok) {
      setImportError(result.error)
      setPending(null)
      return
    }
    setImportError(null)
    setPending(result.file)
  }

  async function doImport(mode: 'merge' | 'replace') {
    if (!pending) return
    if (mode === 'replace' && !window.confirm('Replace ALL progress in this browser with this backup? This cannot be undone.')) return
    try {
      await store.importAll(pending, mode)
      setPending(null)
      toast.success(mode === 'replace' ? 'Backup restored' : 'Backup merged')
    } catch (err) {
      toast.error(message(err))
    }
  }

  async function saveRetention() {
    const value = Number(retention)
    if (!meta || !(value >= 0.7 && value <= 0.97)) {
      toast.error('Choose a value between 0.70 and 0.97')
      return
    }
    try {
      await store.saveSettings({ ...meta.settings, desiredRetention: value })
      toast.success('Saved')
    } catch (err) {
      toast.error(message(err))
    }
  }

  async function changeTheme(theme: Settings['theme']) {
    setTheme(theme)
    if (meta) await store.saveSettings({ ...meta.settings, theme }).catch(() => undefined)
  }

  return (
    <div className="max-w-2xl space-y-10">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Backup</h2>
        <p className="text-sm text-muted-foreground">
          Your progress lives only in this browser. Export a backup regularly
          {meta?.lastBackupAt ? ` — last backup ${formatDateTime(meta.lastBackupAt)}.` : ' — you haven’t backed up yet.'}
        </p>
        <Button onClick={exportBackup}>Export backup</Button>
        <div className="space-y-1 pt-2">
          <Label htmlFor="import-file">Import backup</Label>
          <Input id="import-file" type="file" accept="application/json,.json" onChange={onFile} />
          {importError && <p role="alert" className="text-sm text-destructive">{importError}</p>}
        </div>
        {pending && (
          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-sm">
              Backup from {formatDateTime(pending.exportedAt)}: {pending.data.progress.filter((p) => p.status === 'solved').length} solved problems,{' '}
              {pending.data.notes.length} notes.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => doImport('merge')}>Merge into my data</Button>
              <Button variant="destructive" onClick={() => doImport('replace')}>Replace all data</Button>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Review schedule</h2>
        <Label htmlFor="retention">Desired retention</Label>
        <div className="flex gap-2">
          <Input id="retention" type="number" min={0.7} max={0.97} step={0.01} value={retention} onChange={(e) => setRetention(e.target.value)} className="w-28" />
          <Button variant="outline" onClick={saveRetention}>Save</Button>
        </div>
        <p className="text-sm text-muted-foreground">Higher means more frequent reviews and fewer forgotten problems. 0.90 is a good default.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Appearance</h2>
        <Label htmlFor="theme">Theme</Label>
        <select
          id="theme"
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={meta?.settings.theme ?? 'system'}
          onChange={(e) => changeTheme(e.target.value as Settings['theme'])}
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </section>
    </div>
  )
}
