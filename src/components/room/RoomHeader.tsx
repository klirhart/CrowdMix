import { useCallback, useState } from 'react'
import { Headphones, QrCode } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { IconButton } from '@/components/ui/IconButton'
import { Modal } from '@/components/ui/Modal'
import { ShareRoomPanel } from '@/components/room/ShareRoomPanel'
import type { Room } from '@/types/room'

interface RoomHeaderProps {
  room: Room
  listenerCount: number
  copied: boolean
  roomLink: string
  qrImageUrl: string
  onCopyRoomLink: () => void
}

export function RoomHeader({
  room,
  listenerCount,
  copied,
  roomLink,
  qrImageUrl,
  onCopyRoomLink,
}: RoomHeaderProps) {
  const [shareOpen, setShareOpen] = useState(false)
  const closeShare = useCallback(() => setShareOpen(false), [])

  return (
    <header className="room-page-header flex min-w-0 w-full shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border pb-3 sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">
            {room.name}
          </h1>
          {room.is_active ? (
            <Badge tone="live" pulse>
              LIVE
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-subtle">
          <span className="font-mono font-semibold uppercase tracking-widest text-muted">
            {room.room_code}
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Headphones size={12} strokeWidth={2.25} aria-hidden="true" />
            {listenerCount} listening
          </span>
        </p>
      </div>

      <IconButton
        label="Invite people"
        icon={<QrCode size={17} strokeWidth={2.25} />}
        tone="accent"
        onClick={() => setShareOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={shareOpen}
        className="ml-auto shrink-0"
      />

      <Modal open={shareOpen} title="Invite People" onClose={closeShare}>
        <ShareRoomPanel
          roomName={room.name}
          roomCode={room.room_code}
          roomLink={roomLink}
          qrImageUrl={qrImageUrl}
          copied={copied}
          onCopyRoomLink={onCopyRoomLink}
        />
      </Modal>
    </header>
  )
}
