import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type PointerEvent } from 'react'
import { MessageCircle, Send } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cx } from '@/components/ui/cx'
import { listRoomMessages, ROOM_MESSAGE_MAX_LENGTH, sendRoomMessage } from '@/lib/chat'
import { getSupabaseClient } from '@/lib/supabase'
import type { RoomMember, RoomMessage } from '@/types/room'

interface RoomChatPanelProps {
  roomId: string
  currentUserId: string
  creatorUserId: string
  members: Array<Pick<RoomMember, 'user_id' | 'role' | 'profile'>>
}

const CHAT_HEIGHT_KEY = 'crowdmix.room-chat-height'
const MIN_CHAT_HEIGHT = 160
const DEFAULT_CHAT_HEIGHT = 192

function maxChatHeight(): number {
  if (typeof window === 'undefined') return 480
  return Math.max(MIN_CHAT_HEIGHT, Math.round(window.innerHeight * 0.5))
}

function clampChatHeight(value: number): number {
  return Math.min(maxChatHeight(), Math.max(MIN_CHAT_HEIGHT, Math.round(value)))
}

function readChatHeight(): number {
  try {
    const raw = window.localStorage.getItem(CHAT_HEIGHT_KEY)
    if (raw == null || raw === '') return DEFAULT_CHAT_HEIGHT
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return DEFAULT_CHAT_HEIGHT
    return clampChatHeight(parsed)
  } catch {
    return DEFAULT_CHAT_HEIGHT
  }
}

function writeChatHeight(value: number): number {
  const next = clampChatHeight(value)
  try {
    window.localStorage.setItem(CHAT_HEIGHT_KEY, String(next))
  } catch {
    // Private mode can reject localStorage; the in-memory height still applies.
  }
  return next
}

function formatChatTime(isoDate: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(isoDate))
}

function isCreatorMessage(
  userId: string,
  creatorUserId: string,
  members: Array<Pick<RoomMember, 'user_id' | 'role'>>,
): boolean {
  const membership = members.find((member) => member.user_id === userId)
  if (membership?.role === 'creator') {
    return true
  }
  return userId === creatorUserId
}

export function RoomChatPanel({
  roomId,
  currentUserId,
  creatorUserId,
  members,
}: RoomChatPanelProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ pointerId: number; startY: number; startHeight: number } | null>(null)
  const heightRef = useRef(DEFAULT_CHAT_HEIGHT)
  const [messages, setMessages] = useState<RoomMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [height, setHeight] = useState(DEFAULT_CHAT_HEIGHT)
  heightRef.current = height

  useEffect(() => {
    setHeight(readChatHeight())

    const handleWindowResize = () => {
      setHeight((current) => clampChatHeight(current))
    }

    window.addEventListener('resize', handleWindowResize)
    return () => window.removeEventListener('resize', handleWindowResize)
  }, [])

  useEffect(() => {
    let active = true

    const loadMessages = async () => {
      try {
        const next = await listRoomMessages(roomId)
        if (active) {
          setMessages(next)
          setError(null)
        }
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : 'Unable to load chat.')
        }
      }
    }

    void loadMessages()

    const supabase = getSupabaseClient()
    const channel = supabase
      .channel(`room-chat:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_messages',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          void loadMessages()
        },
      )
      .subscribe()

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [roomId])

  useEffect(() => {
    const list = listRef.current
    if (!list) {
      return
    }
    list.scrollTop = list.scrollHeight
  }, [messages])

  const applyHeight = useCallback((next: number, persist = true) => {
    const clamped = clampChatHeight(next)
    heightRef.current = clamped
    setHeight(clamped)
    if (persist) {
      writeChatHeight(clamped)
    }
  }, [])

  const handleResizePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return

    event.preventDefault()
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startHeight: height,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleResizePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    applyHeight(drag.startHeight + (drag.startY - event.clientY), false)
  }

  const handleResizePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    applyHeight(drag.startHeight + (drag.startY - event.clientY))
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleResizeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 48 : 16

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      applyHeight(heightRef.current + step)
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      applyHeight(heightRef.current - step)
      return
    }
    if (event.key === 'Home') {
      event.preventDefault()
      applyHeight(maxChatHeight())
      return
    }
    if (event.key === 'End') {
      event.preventDefault()
      applyHeight(MIN_CHAT_HEIGHT)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (sending) {
      return
    }

    const body = draft.trim()
    if (!body) {
      return
    }

    setSending(true)
    setError(null)
    try {
      const sent = await sendRoomMessage(roomId, currentUserId, body)
      setDraft('')
      setMessages((current) =>
        current.some((message) => message.id === sent.id)
          ? current
          : [...current, sent],
      )
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to send that message.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section
      aria-label="Room chat"
      className="room-chat-panel relative shrink-0 rounded-card border border-border bg-surface-raised"
      style={{ height }}
    >
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize room chat"
        aria-valuemin={MIN_CHAT_HEIGHT}
        aria-valuemax={maxChatHeight()}
        aria-valuenow={height}
        aria-valuetext={`${height} pixels tall`}
        tabIndex={0}
        className={cx(
          'room-chat-resize absolute inset-x-0 top-0 z-10 flex h-3 cursor-row-resize items-center justify-center',
          'rounded-t-card text-border-strong hover:text-muted',
        )}
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        onPointerCancel={handleResizePointerUp}
        onDoubleClick={() => applyHeight(DEFAULT_CHAT_HEIGHT)}
        onKeyDown={handleResizeKeyDown}
      >
        <span className="h-1 w-10 rounded-full bg-current" aria-hidden="true" />
      </div>

      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 pb-3 pt-4">
        <MessageCircle size={16} strokeWidth={2.25} className="text-accent" aria-hidden="true" />
        <h2 className="text-section">Room chat</h2>
      </div>

      <div
        ref={listRef}
        className="room-chat-list"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <p className="px-4 py-6 text-sm text-subtle">Say something to the room.</p>
        ) : (
          <ul className="space-y-2.5 px-3 py-3">
            {messages.map((message) => {
              const isYou = message.user_id === currentUserId
              const name = message.profile?.display_name || 'Member'
              const creator = isCreatorMessage(message.user_id, creatorUserId, members)

              return (
                <li key={message.id} className="flex items-start gap-2.5">
                  <Avatar
                    displayName={name}
                    avatarUrl={message.profile?.avatar_url}
                    size="xs"
                    identityKey={message.user_id}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className={cx('font-semibold', isYou ? 'text-accent' : 'text-white')}>
                        {isYou ? 'You' : name}
                      </span>
                      {creator ? (
                        <Badge tone="accent" className="px-1.5 py-0 text-[10px]">
                          Creator
                        </Badge>
                      ) : null}
                      <span className="text-subtle">{formatChatTime(message.created_at)}</span>
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-muted">
                      {message.body}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="flex shrink-0 items-end gap-2 border-t border-border p-3"
      >
        <Input
          id="room-chat-message"
          name="message"
          label="Message"
          hideLabel
          wrapperClassName="min-w-0 flex-1 space-y-0"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Message the room"
          maxLength={ROOM_MESSAGE_MAX_LENGTH}
          autoComplete="off"
          disabled={sending}
        />
        <Button type="submit" size="sm" disabled={sending || !draft.trim()}>
          <Send size={14} strokeWidth={2.5} aria-hidden="true" />
          Send
        </Button>
      </form>

      {error ? (
        <p className="px-4 pb-3 text-xs text-live" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  )
}
