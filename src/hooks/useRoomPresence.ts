import { useEffect, useState } from 'react'
import { markMemberPresent, updateMemberOnlineStatus } from '@/lib/rooms'
import { getSupabaseClient } from '@/lib/supabase'

const HIDDEN_OFFLINE_MS = 90_000
const IDLE_OFFLINE_MS = 10 * 60_000

function idsFromPresenceState(state: Record<string, unknown[]>): Set<string> {
  const ids = new Set<string>()

  for (const [key, metas] of Object.entries(state)) {
    if (key) {
      ids.add(key)
    }
    for (const meta of metas) {
      if (meta && typeof meta === 'object' && 'user_id' in meta) {
        const userId = (meta as { user_id?: unknown }).user_id
        if (typeof userId === 'string' && userId) {
          ids.add(userId)
        }
      }
    }
  }

  return ids
}

/**
 * Live room presence from the Realtime channel, with activity and page-lifecycle
 * fallbacks so members do not stay "Listening" after they leave or go idle.
 */
export function useRoomPresence(roomId: string | undefined, userId: string | undefined): Set<string> | null {
  const [presentIds, setPresentIds] = useState<Set<string> | null>(null)

  useEffect(() => {
    if (!roomId || !userId) {
      setPresentIds(null)
      return
    }

    const supabase = getSupabaseClient()
    const channel = supabase.channel(`room-presence:${roomId}`, {
      config: { presence: { key: userId } },
    })

    let hiddenTimer: ReturnType<typeof setTimeout> | undefined
    let idleTimer: ReturnType<typeof setTimeout> | undefined
    let tracked = false
    let cancelled = false
    let writeToken = 0

    const syncFromChannel = () => {
      if (!cancelled) {
        setPresentIds(idsFromPresenceState(channel.presenceState()))
      }
    }

    const goOnline = () => {
      if (cancelled || document.visibilityState === 'hidden') {
        return
      }

      const token = ++writeToken
      tracked = true
      void channel.track({ user_id: userId, at: Date.now() })
      void markMemberPresent(roomId, userId)
        .then(() => {
          if (token !== writeToken) {
            void updateMemberOnlineStatus(roomId, userId, false).catch(() => undefined)
          }
        })
        .catch(() => undefined)
    }

    const goOffline = () => {
      writeToken += 1
      if (tracked) {
        tracked = false
        void channel.untrack()
      }
      void updateMemberOnlineStatus(roomId, userId, false).catch(() => undefined)
    }

    const resetIdle = () => {
      if (idleTimer !== undefined) {
        clearTimeout(idleTimer)
      }
      idleTimer = setTimeout(() => {
        goOffline()
      }, IDLE_OFFLINE_MS)
    }

    channel.on('presence', { event: 'sync' }, syncFromChannel).subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setPresentIds((current) => {
          const next = new Set(current ?? [])
          next.add(userId)
          return next
        })
        goOnline()
        resetIdle()
      }
    })

    const syncFallback = window.setTimeout(() => {
      setPresentIds((current) => current ?? new Set([userId]))
    }, 2000)

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenTimer = setTimeout(goOffline, HIDDEN_OFFLINE_MS)
        return
      }

      if (hiddenTimer !== undefined) {
        clearTimeout(hiddenTimer)
        hiddenTimer = undefined
      }
      goOnline()
      resetIdle()
    }

    const onPageHide = () => {
      goOffline()
    }

    const onActivity = () => {
      if (document.visibilityState === 'hidden') {
        return
      }
      if (!tracked) {
        goOnline()
      }
      resetIdle()
    }

    document.addEventListener('visibilitychange', onVisibility)
    document.addEventListener('freeze', onPageHide)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('pageshow', goOnline)
    window.addEventListener('pointerdown', onActivity)
    window.addEventListener('keydown', onActivity)
    window.addEventListener('scroll', onActivity, { passive: true })

    return () => {
      cancelled = true
      window.clearTimeout(syncFallback)
      if (hiddenTimer !== undefined) {
        clearTimeout(hiddenTimer)
      }
      if (idleTimer !== undefined) {
        clearTimeout(idleTimer)
      }
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('freeze', onPageHide)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('pageshow', goOnline)
      window.removeEventListener('pointerdown', onActivity)
      window.removeEventListener('keydown', onActivity)
      window.removeEventListener('scroll', onActivity)
      goOffline()
      void supabase.removeChannel(channel)
      setPresentIds(null)
    }
  }, [roomId, userId])

  return presentIds
}

export function applyRoomPresence<T extends { user_id: string; is_online: boolean }>(
  members: T[],
  presentIds: Set<string> | null,
  currentUserId: string | undefined,
): T[] {
  return members.map((member) => {
    if (!presentIds) {
      return {
        ...member,
        is_online: member.user_id === currentUserId ? true : member.is_online,
      }
    }

    return {
      ...member,
      is_online: presentIds.has(member.user_id),
    }
  })
}
