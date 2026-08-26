import { Calendar, EyeOff, Globe, Info, Lock, Radio } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from '@/components/ui/cx'
import type { Room, RoomVisibility } from '@/types/room'

interface RoomInfoPanelProps {
  room: Room
}

const visibilityMeta: Record<RoomVisibility, { label: string; icon: typeof Globe }> = {
  public: { label: 'Public', icon: Globe },
  unlisted: { label: 'Unlisted', icon: EyeOff },
  private: { label: 'Private', icon: Lock },
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="flex items-center gap-2 text-sm text-muted">
        <span className="text-subtle" aria-hidden="true">
          {icon}
        </span>
        {label}
      </span>
      <span className="text-sm font-semibold text-white">{children}</span>
    </div>
  )
}

export function RoomInfoPanel({ room }: RoomInfoPanelProps) {
  const visibility = visibilityMeta[room.visibility] ?? visibilityMeta.public
  const VisibilityIcon = visibility.icon

  return (
    <section
      aria-label="Room info"
      className="shrink-0 rounded-card border border-border bg-surface-raised p-4"
    >
      <h2 className="mb-1.5 flex items-center gap-2 text-section">
        <Info size={16} strokeWidth={2.25} className="text-accent" aria-hidden="true" />
        Room Info
      </h2>

      {room.description ? (
        <p className="mb-2 text-sm leading-relaxed text-muted">{room.description}</p>
      ) : null}

      <div className="divide-y divide-border">
        <InfoRow icon={<VisibilityIcon size={14} strokeWidth={2.25} />} label="Visibility">
          {visibility.label}
        </InfoRow>
        <InfoRow icon={<Radio size={14} strokeWidth={2.25} />} label="Status">
          <span className="inline-flex items-center gap-1.5">
            <span
              className={cx(
                'h-1.5 w-1.5 rounded-full',
                room.is_active ? 'bg-online' : 'bg-subtle',
              )}
              aria-hidden="true"
            />
            {room.is_active ? 'Live' : 'Inactive'}
          </span>
        </InfoRow>
        <InfoRow icon={<Calendar size={14} strokeWidth={2.25} />} label="Created">
          {new Date(room.created_at).toLocaleDateString()}
        </InfoRow>
      </div>
    </section>
  )
}
