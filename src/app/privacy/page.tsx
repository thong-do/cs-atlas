import Link from 'next/link'

export const metadata = { title: 'Privacy · CS Atlas' }

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Privacy</h1>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Without an account</h2>
        <p>
          Everything stays in this browser (IndexedDB). Nothing is sent anywhere. You can export a backup from Settings.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">With an account</h2>
        <p>
          We store your learning data: exercise progress, notes, review history and schedule, training attempts, daily activity counts, and settings. We also store your display name and avatar URL from GitHub or Google. Supabase Auth keeps your email address and sign-in provider.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Where</h2>
        <p>
          Supabase (Postgres) in <strong>Singapore (ap-southeast-1)</strong>. Data is encrypted in transit, and row-level security lets only you read or change your rows.
        </p>
        <p>Page-view analytics are processed by Vercel, our host.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">What we don&apos;t do</h2>
        <p>
          No ads, no third-party trackers, and no selling or sharing your data. We count page views with Vercel Web
          Analytics, built into our host, which records the page, referrer, country and browser/device type, uses no
          cookies, and doesn&apos;t store your IP address.
        </p>
        <p>
          From synced data we compute aggregate figures: weekly active learners, how often due reviews are done on time,
          and 4-week retention. They contain only counts and percentages, never names, emails or user ids. In the
          retention and review reports, a cohort or week that would describe fewer than five learners is merged with
          others.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Your controls</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Export</strong> everything as JSON from <Link href="/settings/" className="underline">Settings</Link>.
          </li>
          <li>
            <strong>Delete your account</strong> in Settings → Account. This removes every row immediately. Supabase may keep encrypted database backups for up to 7 days before they expire.
          </li>
          <li>
            <strong>Questions:</strong> <a href="mailto:thongdo.swe@gmail.com" className="underline">thongdo.swe@gmail.com</a>.
          </li>
        </ul>
      </section>

      <p className="text-sm text-muted-foreground"><em>Last updated: 3 November 2026.</em></p>
    </div>
  )
}
