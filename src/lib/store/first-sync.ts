import { mergeUserData } from '@/lib/logic/transfer'
import type { RemoteApi } from '@/lib/supabase/remote-api'
import { DEFAULT_SETTINGS, type UserData } from '@/lib/types'

export const ACCOUNT_UNREACHABLE_MESSAGE = "Couldn't reach your account — changes are saved on this device for now."
export const MOVE_FAILED_MESSAGE = "Couldn't move this device's progress — it's still saved here. Try signing in again."

const isEmpty = (d: UserData) =>
  d.progress.length + d.notes.length + d.cards.length + d.reviewLogs.length + d.trainAttempts.length + d.activity.length === 0
const isDefault = (s: UserData['meta']['settings']) =>
  s.desiredRetention === DEFAULT_SETTINGS.desiredRetention && s.theme === DEFAULT_SETTINGS.theme

/** Moves guest progress on this device into the signed-in account. Local data is cleared only after the upload succeeds. */
export async function moveGuestData(
  local: { getUserData(): Promise<UserData>; clearAll(): Promise<void> },
  remote: RemoteApi,
): Promise<{ data: UserData; moved: number }> {
  let guest: UserData
  try {
    guest = await local.getUserData()
  } catch {
    throw new Error(MOVE_FAILED_MESSAGE)
  }
  if (isEmpty(guest)) {
    try {
      return { data: await remote.loadAll(), moved: 0 }
    } catch {
      throw new Error(ACCOUNT_UNREACHABLE_MESSAGE)
    }
  }
  try {
    const account = await remote.loadAll()
    const merged = mergeUserData(account, guest)
    merged.meta = {
      ...merged.meta,
      settings: isDefault(account.meta.settings) ? guest.meta.settings : account.meta.settings,
    }
    await remote.replaceAll(merged)
    await local.clearAll()
    return { data: merged, moved: guest.progress.filter((p) => p.status === 'solved').length }
  } catch {
    throw new Error(MOVE_FAILED_MESSAGE)
  }
}
