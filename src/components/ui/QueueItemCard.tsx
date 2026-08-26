import { ChevronUp, Trash2 } from 'lucide-react'
import { Artwork } from '@/components/ui/Artwork'
import { IconButton } from '@/components/ui/IconButton'
import { cx } from '@/components/ui/cx'

interface QueueItemCardProps {
  id: string
  title: string
  artist: string
  votes: number
  thumbnail?: string
  suggestedBy: string
  index?: number
  isCurrentlyPlaying?: boolean
  hasVoted?: boolean
  onVote?: (id: string) => void
  onRemoveVote?: (id: string) => void
  onRemoveSong?: (id: string) => void
}

/** Animated bars standing in for playback position, which the API does not expose. */
export function NowPlayingBars({ className = '' }: { className?: string }) {
  return (
    <span className={cx('flex items-end gap-[3px]', className)} aria-hidden="true">
      {[0, 150, 300].map((delay, position) => (
        <span
          key={delay}
          className="w-[3px] rounded-full bg-accent"
          style={{
            height: position === 1 ? '14px' : '10px',
            animation: `equalizer 900ms ${delay}ms ease-in-out infinite`,
          }}
        />
      ))}
    </span>
  )
}

export function QueueItemCard({
  id,
  title,
  artist,
  votes,
  thumbnail,
  suggestedBy,
  index,
  isCurrentlyPlaying,
  hasVoted,
  onVote,
  onRemoveVote,
  onRemoveSong,
}: QueueItemCardProps) {
  return (
    <div
      className={cx(
        'group flex items-center gap-2.5 rounded-card border p-2.5 transition-all duration-200 sm:gap-4 sm:p-3',
        isCurrentlyPlaying
          ? 'border-accent/50 bg-accent-soft'
          : 'border-border bg-surface-raised hover:border-border-strong hover:bg-surface-overlay',
      )}
    >
      <div className="hidden w-6 shrink-0 justify-center sm:flex">
        {isCurrentlyPlaying ? (
          <NowPlayingBars />
        ) : (
          <span className="font-mono text-sm text-subtle">{index}</span>
        )}
      </div>

      <Artwork
        src={thumbnail}
        alt={`Artwork for ${title}`}
        iconSize={18}
        className="h-12 w-12 rounded-lg sm:h-14 sm:w-14"
      />

      <div className="min-w-0 flex-1">
        {isCurrentlyPlaying ? (
          <p className="mb-0.5 text-meta uppercase text-accent">Now playing</p>
        ) : null}
        <h3 className="truncate font-semibold text-white">{title}</h3>
        <p className="truncate text-sm text-muted">{artist}</p>
        <p className="mt-0.5 truncate text-xs text-subtle">Suggested by @{suggestedBy}</p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {onRemoveSong ? (
          <IconButton
            label="Remove this song"
            icon={<Trash2 size={15} strokeWidth={2.25} />}
            onClick={() => onRemoveSong(id)}
            tone="danger"
            size="sm"
          />
        ) : null}

        <button
          type="button"
          onClick={() => (hasVoted ? onRemoveVote?.(id) : onVote?.(id))}
          aria-label={hasVoted ? `Remove your vote from ${title}` : `Upvote ${title}`}
          aria-pressed={hasVoted}
          className={cx(
            'ml-1 flex w-12 flex-col items-center gap-0.5 rounded-xl border px-1 py-1.5',
            'transition-all duration-150 active:scale-95',
            hasVoted
              ? 'border-accent/60 bg-accent-soft text-accent'
              : 'border-border bg-surface-sunken text-muted hover:border-accent/60 hover:bg-accent-soft hover:text-accent',
          )}
        >
          <ChevronUp size={16} strokeWidth={2.75} aria-hidden="true" />
          <span className="font-mono text-sm font-bold text-white">{votes}</span>
        </button>
      </div>
    </div>
  )
}
