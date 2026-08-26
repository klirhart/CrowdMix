import { useEffect, useState } from 'react'
import { MicVocal } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Artwork } from '@/components/ui/Artwork'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Modal } from '@/components/ui/Modal'
import { fetchSongLyrics, LyricsRequestError } from '@/lib/lyrics'

export interface LyricsSong {
  title: string
  artist: string
  thumbnailUrl: string | null
}

interface LyricsPanelProps {
  song: LyricsSong
  onClose: () => void
}

type LyricsView =
  | { status: 'loading' }
  | { status: 'found'; lyrics: string }
  | { status: 'unavailable' }
  | { status: 'error'; message: string }

export function LyricsPanel({ song, onClose }: LyricsPanelProps) {
  const [view, setView] = useState<LyricsView>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    void fetchSongLyrics(song.title, song.artist, controller.signal)
      .then((result) => {
        setView(
          result.status === 'found'
            ? { status: 'found', lyrics: result.lyrics }
            : { status: 'unavailable' },
        )
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === 'AbortError') {
          return
        }
        const message =
          caught instanceof LyricsRequestError
            ? caught.message
            : "We couldn't load lyrics right now. Try again in a moment."
        setView({ status: 'error', message })
      })

    return () => controller.abort()
  }, [song.title, song.artist])

  return (
    <Modal open title="Lyrics" size="lg" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Artwork
            src={song.thumbnailUrl}
            alt=""
            iconSize={18}
            className="h-14 w-14 rounded-xl"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{song.title}</p>
            <p className="truncate text-sm text-muted">{song.artist}</p>
          </div>
        </div>

        {view.status === 'loading' ? <LoadingSpinner label="Finding lyrics..." /> : null}

        {view.status === 'unavailable' ? (
          <EmptyState
            icon={<MicVocal size={22} strokeWidth={2.25} />}
            title="Lyrics aren't available for this song yet."
            description="We couldn't find lyrics for this title and artist."
            className="border-0 bg-transparent py-8"
          />
        ) : null}

        {view.status === 'error' ? <Alert variant="error">{view.message}</Alert> : null}

        {view.status === 'found' ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-7 text-muted">
            {view.lyrics}
          </p>
        ) : null}
      </div>
    </Modal>
  )
}
