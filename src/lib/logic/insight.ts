export const INSIGHT_MAX = 140

export type InsightResult = { ok: true; value: string } | { ok: false; error: string }

export function validateInsight(raw: string): InsightResult {
  const value = raw.trim()
  if (!value) return { ok: false, error: 'Write the key insight in one line.' }
  if (/[\r\n]/.test(value)) return { ok: false, error: 'The insight must be a single line.' }
  if (value.length > INSIGHT_MAX) return { ok: false, error: `Keep it under ${INSIGHT_MAX} characters (${value.length}).` }
  return { ok: true, value }
}
