import { Music } from 'lucide-react'
import { useState } from 'react'
import { cx } from './cx'

interface ArtworkProps {
  src?: string | null
  alt?: string
  /** Icon size for the gradient fallback tile. */
  iconSize?: number
  className?: string
}

/** Album art with a branded gradient fallback when no image is available or it fails to load. */
export function Artwork({ src, alt = '', iconSize = 20, className = '' }: ArtworkProps) {
  // Tracking the failed URL rather than a flag means a new src recovers on its own.
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  const base = 'shrink-0 overflow-hidden bg-surface-overlay'

  if (!src || failedSrc === src) {
    return (
      <div
        className={cx(
          base,
          'flex items-center justify-center bg-gradient-to-br from-accent/30 to-accent-2/20 text-white/70',
          className,
        )}
        aria-hidden="true"
      >
        <Music size={iconSize} strokeWidth={2} />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailedSrc(src)}
      className={cx(base, 'object-cover', className)}
    />
  )
}
