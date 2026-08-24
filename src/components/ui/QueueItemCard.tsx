interface QueueItemCardProps {
  id: string
  title: string
  artist: string
  votes: number
  thumbnail?: string
  suggestedBy: string
  index?: number
  isCurrentlyPlaying?: boolean
  onVote?: (id: string) => void
  onRemoveVote?: (id: string) => void
  onRemoveSong?: (id: string) => void
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
  onVote,
  onRemoveVote,
  onRemoveSong,
}: QueueItemCardProps) {
  return (
    <div
      className={`rounded-lg border transition-all ${
        isCurrentlyPlaying
          ? 'border-accent bg-accent/10'
          : 'border-border bg-surface-raised hover:bg-surface-overlay'
      } p-4`}
    >
      <div className="flex gap-4">
        {/* Thumbnail */}
        <div className="h-16 w-16 flex-shrink-0 rounded bg-gradient-to-br from-accent/50 to-accent/20 flex items-center justify-center text-xl">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={title}
              className="h-full w-full object-cover rounded"
            />
          ) : (
            '🎵'
          )}
        </div>

        {/* Song Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            {index !== undefined && (
              <span className="flex-shrink-0 font-semibold text-muted">
                {index}.
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-white truncate">
                {isCurrentlyPlaying && '▶ '}
                {title}
              </h3>
              <p className="text-sm text-muted truncate">{artist}</p>
              <p className="text-xs text-muted mt-1">Suggested by @{suggestedBy}</p>
            </div>
          </div>
        </div>

        {/* Voting */}
        <div className="flex flex-col items-center justify-center gap-2 flex-shrink-0">
          <button
            onClick={() => onVote?.(id)}
            className="text-accent hover:text-accent-hover text-xl transition-colors"
            title="Upvote"
          >
            ▲
          </button>
          <span className="font-bold text-sm w-8 text-center font-mono">
            {votes}
          </span>
          <button
            onClick={() => onRemoveVote?.(id)}
            className="text-muted hover:text-white text-xs transition-colors"
            title="Remove vote"
          >
            ✕
          </button>
          {onRemoveSong && (
            <button
              onClick={() => onRemoveSong(id)}
              className="text-red-500 hover:text-red-400 text-xs mt-1 transition-colors"
              title="Remove song"
            >
              🗑
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
