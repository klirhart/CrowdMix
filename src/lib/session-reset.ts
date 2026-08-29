import { resetPlaybackEngine } from '@/components/room/SyncedYouTubePlayer'
import { clearPresenceLeaveTimers } from '@/lib/rooms'
import { removeAllRealtimeChannels } from '@/lib/supabase'

/**
 * Drop user-specific client runtime that is not stored in Supabase.
 * Theme and device volume stay — they are device preferences, not account data.
 */
export function resetClientSessionState(): void {
  resetPlaybackEngine()
  clearPresenceLeaveTimers()
  removeAllRealtimeChannels()
}
