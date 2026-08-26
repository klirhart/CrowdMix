import { useState } from 'react'
import { Clock, ListMusic, Plus } from 'lucide-react'
import { Artwork } from '@/components/ui/Artwork'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { PlayHistoryWithSong, Song } from '@/types/queue'

export type RecentlyPlayedAction = 'queue' | 'suggest'

interface RecentlyPlayedPanelProps {
  playHistory: PlayHistoryWithSong[]
  busy?: boolean
  onReplaySong?: (song: Song, action: RecentlyPlayedAction) => Promise<void>
}

export function RecentlyPlayedPanel({
  playHistory,
  busy = false,
  onReplaySong,
}: RecentlyPlayedPanelProps) {
  const [selected, setSelected] = useState<PlayHistoryWithSong | null>(null)
  const selectedSong = selected?.song

  const close = () => {
    if (busy) return
    setSelected(null)
  }

  const choose = async (action: RecentlyPlayedAction) => {
    if (!selectedSong || !onReplaySong) return
    try {
      await onReplaySong(selectedSong, action)
      setSelected(null)
    } catch {
      // Parent surfaces the existing queue/suggestion error.
    }
  }

  return (
    <section
      aria-label="Recently played"
      className="recently-played-panel flex h-64 max-h-64 min-h-64 flex-col overflow-hidden rounded-card border border-border bg-surface-raised p-4 sm:h-80 sm:max-h-80 sm:min-h-80 lg:h-auto lg:max-h-none lg:min-h-48"
    >
      <h2 className="mb-1 flex shrink-0 items-center gap-2 text-section">
        <Clock size={16} strokeWidth={2.25} className="text-accent" aria-hidden="true" />
        Recently Played
      </h2>
      <p className="mb-3 shrink-0 text-xs text-subtle">
        Anyone in the room can tap a song to add it back.
      </p>

      <div className="recently-played-list min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
        {playHistory.length > 0 ? (
          <ol className="space-y-1">
            {playHistory.map((historyItem) => {
              const title = historyItem.song?.title || 'Unknown song'
              const artist = historyItem.song?.artist || 'Unknown artist'
              const canOpen = Boolean(historyItem.song && onReplaySong)

              return (
                <li key={historyItem.id}>
                  <button
                    type="button"
                    disabled={!canOpen}
                    onClick={() => {
                      if (canOpen) setSelected(historyItem)
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-1.5 py-1.5 text-left transition-colors duration-150 hover:bg-surface-overlay disabled:cursor-default disabled:hover:bg-transparent"
                  >
                    <Artwork
                      src={historyItem.song?.thumbnail_url}
                      alt={historyItem.song?.title ? `Artwork for ${historyItem.song.title}` : ''}
                      iconSize={15}
                      className="h-10 w-10 rounded-lg"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{title}</p>
                      <p className="truncate text-xs text-subtle">{artist}</p>
                    </div>
                  </button>
                </li>
              )
            })}
          </ol>
        ) : (
          <p className="text-sm leading-relaxed text-subtle">
            No songs have finished playing yet.
          </p>
        )}
      </div>

      <Modal
        open={Boolean(selectedSong)}
        title="Add this song"
        onClose={close}
      >
        {selectedSong ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Artwork
                src={selectedSong.thumbnail_url}
                alt=""
                iconSize={18}
                className="h-14 w-14 rounded-xl"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{selectedSong.title}</p>
                <p className="truncate text-sm text-muted">{selectedSong.artist}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                fullWidth
                disabled={busy}
                onClick={() => choose('queue')}
              >
                <ListMusic size={15} strokeWidth={2.5} aria-hidden="true" />
                {busy ? 'Adding...' : 'Add to Queue'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                fullWidth
                disabled={busy}
                onClick={() => choose('suggest')}
              >
                <Plus size={15} strokeWidth={2.75} aria-hidden="true" />
                {busy ? 'Adding...' : 'Suggest Song'}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  )
}
