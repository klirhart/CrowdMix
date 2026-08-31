import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bell } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { cx } from '@/components/ui/cx'
import { useAuth } from '@/contexts/AuthContext'
import {
  listPendingJoinRequests,
  resolveJoinRequest,
  type PendingJoinRequest,
} from '@/lib/join-requests'
import { getSupabaseClient } from '@/lib/supabase'

interface JoinRequestInboxProps {
  /** Sidebar footer sits on the left edge, so the panel must open into the page. */
  placement?: 'sidebar' | 'header'
}

interface PanelCoords {
  top?: number
  bottom?: number
  left: number
  maxHeight: number
}

export function JoinRequestInbox({ placement = 'header' }: JoinRequestInboxProps) {
  const { user } = useAuth()
  const menuId = useId()
  const triggerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<PanelCoords | null>(null)
  const [requests, setRequests] = useState<PendingJoinRequest[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadRequests = useCallback(async () => {
    try {
      setRequests(await listPendingJoinRequests())
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load join requests')
    }
  }, [])

  const placePanel = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) {
      return
    }

    const rect = trigger.getBoundingClientRect()
    const width = Math.min(352, window.innerWidth - 16)
    const gap = 8

    if (placement === 'sidebar') {
      let left = rect.right + gap
      if (left + width > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - width - 8)
      }

      setCoords({
        left,
        bottom: Math.max(8, window.innerHeight - rect.bottom),
        maxHeight: Math.min(320, rect.bottom - 8),
      })
      return
    }

    let left = rect.right - width
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8))

    setCoords({
      left,
      top: Math.min(rect.bottom + gap, window.innerHeight - 48),
      maxHeight: Math.min(320, window.innerHeight - rect.bottom - 16),
    })
  }, [placement])

  useEffect(() => {
    if (!user) {
      return
    }

    void loadRequests()

    const supabase = getSupabaseClient()
    const channel = supabase
      .channel(`join-requests:${user.id}:${menuId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_join_requests' },
        () => {
          void loadRequests()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [loadRequests, menuId, user])

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null)
      return
    }

    placePanel()
    window.addEventListener('resize', placePanel)
    window.addEventListener('scroll', placePanel, true)
    return () => {
      window.removeEventListener('resize', placePanel)
      window.removeEventListener('scroll', placePanel, true)
    }
  }, [open, placePanel])

  useEffect(() => {
    if (!open) {
      return
    }

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return
      }
      setOpen(false)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!user) {
    return null
  }

  const handleResolve = async (requestId: string, approve: boolean) => {
    setBusyId(requestId)
    setError(null)
    try {
      await resolveJoinRequest(requestId, approve)
      await loadRequests()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update this request')
    } finally {
      setBusyId(null)
    }
  }

  const panel = open && coords
    ? createPortal(
        <div
          ref={panelRef}
          id={menuId}
          role="dialog"
          aria-label="Private room join requests"
          style={{
            top: coords.top,
            bottom: coords.bottom,
            left: coords.left,
            maxHeight: coords.maxHeight,
          }}
          className={cx(
            'fixed z-[80] flex w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden',
            'rounded-panel border border-border bg-surface-raised shadow-panel',
          )}
        >
          <div className="shrink-0 border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-ink">Join requests</p>
            <p className="mt-0.5 text-xs text-subtle">
              People asking to join your private rooms.
            </p>
          </div>

          <div className="min-h-0 overflow-y-auto">
            {error ? (
              <p className="px-4 py-3 text-sm text-live">{error}</p>
            ) : null}

            {requests.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted">No pending join requests.</p>
            ) : (
              <ul className="divide-y divide-border">
                {requests.map((request) => (
                  <li key={request.id} className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <Avatar
                        displayName={request.requester_display_name}
                        avatarUrl={request.requester_avatar_url}
                        size="sm"
                        identityKey={request.requester_id}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">
                          {request.requester_display_name}
                        </p>
                        <p className="truncate text-xs text-subtle">
                          @{request.requester_username} wants to join {request.room_name}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            disabled={busyId === request.id}
                            onClick={() => void handleResolve(request.id, true)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busyId === request.id}
                            onClick={() => void handleResolve(request.id, false)}
                          >
                            Decline
                          </Button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>,
        document.body,
      )
    : null

  return (
    <div className="relative" ref={triggerRef}>
      <IconButton
        label={
          requests.length > 0
            ? `${requests.length} pending join request${requests.length === 1 ? '' : 's'}`
            : 'Join requests'
        }
        icon={<Bell size={17} strokeWidth={2.25} />}
        tone={requests.length > 0 ? 'accent' : 'neutral'}
        active={open}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      />
      {requests.length > 0 ? (
        <span
          className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-accent"
          aria-hidden="true"
        />
      ) : null}
      {panel}
    </div>
  )
}
