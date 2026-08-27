import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ShareRoomPanelProps {
  roomName: string
  roomCode: string
  roomLink: string
  qrImageUrl: string
  copied: boolean
  onCopyRoomLink: () => void
}

export function ShareRoomPanel({
  roomName,
  roomCode,
  roomLink,
  qrImageUrl,
  copied,
  onCopyRoomLink,
}: ShareRoomPanelProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="rounded-xl bg-white p-2.5 shadow-raised">
        <img
          src={qrImageUrl}
          alt={`QR code to join ${roomName}`}
          className="h-36 w-36"
        />
      </div>

      <p className="mt-4 text-meta uppercase text-subtle">Room code</p>
      <p className="mt-1 font-mono text-2xl font-bold uppercase tracking-[0.2em] text-ink">
        {roomCode}
      </p>

      <p className="mt-3 w-full break-all text-center text-xs leading-relaxed text-subtle">
        {roomLink}
      </p>

      <Button onClick={onCopyRoomLink} variant="secondary" fullWidth className="mt-4">
        {copied ? (
          <>
            <Check size={15} strokeWidth={2.5} aria-hidden="true" />
            Link Copied
          </>
        ) : (
          <>
            <Copy size={15} strokeWidth={2.25} aria-hidden="true" />
            Copy Room Link
          </>
        )}
      </Button>
    </div>
  )
}
