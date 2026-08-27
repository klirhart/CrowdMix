import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cx } from '@/components/ui/cx'
import type { YouTubeSearchResult } from '@/lib/youtube'

interface Suggestion {
  youtubeId: string
  title: string
  artist: string
}

interface SuggestSongFormProps {
  suggestion: Suggestion
  onSuggestionChange: (next: Suggestion) => void
  searchQuery: string
  onSearchQueryChange: (next: string) => void
  searchResults: YouTubeSearchResult[]
  searching: boolean
  submitting: boolean
  onSearch: () => void
  onSelectResult: (result: YouTubeSearchResult) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onCancel: () => void
}

export function SuggestSongForm({
  suggestion,
  onSuggestionChange,
  searchQuery,
  onSearchQueryChange,
  searchResults,
  searching,
  submitting,
  onSearch,
  onSelectResult,
  onSubmit,
  onCancel,
}: SuggestSongFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-card border border-border bg-surface-raised shadow-raised animate-enter"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-b border-border bg-surface-sunken/50 p-4 sm:p-5">
        <div className="flex shrink-0 items-end gap-2">
          <Input
            label="Search YouTube"
            name="youtubeSearch"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                onSearch()
              }
            }}
            placeholder="Search for a song or artist"
            icon={<Search size={16} strokeWidth={2.25} />}
            wrapperClassName="flex-1"
          />
          <Button
            type="button"
            onClick={onSearch}
            disabled={searching}
            variant="secondary"
            className="shrink-0"
          >
            {searching ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {searchResults.length > 0 ? (
          <div className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain">
            {searchResults.map((result) => (
              <button
                key={result.videoId}
                type="button"
                onClick={() => onSelectResult(result)}
                className={cx(
                  'flex w-full items-center gap-3 rounded-xl border border-transparent p-2 text-left',
                  'transition-colors duration-150 hover:border-border hover:bg-surface-overlay',
                )}
              >
                <img
                  src={result.thumbnailUrl}
                  alt=""
                  className="h-11 w-[74px] shrink-0 rounded-lg object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">
                    {result.title}
                  </span>
                  <span className="block truncate text-xs text-subtle">
                    {result.channelTitle}
                  </span>
                </span>
                <Plus
                  size={16}
                  strokeWidth={2.5}
                  className="shrink-0 text-subtle"
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {searchResults.length > 0 ? (
        <div className="flex shrink-0 justify-end border-t border-border px-4 py-3">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      ) : (
      <div className="min-h-0 shrink-0 space-y-3 overflow-y-auto p-4 sm:p-5">
        <Input
          label="YouTube URL or video ID"
          name="youtubeId"
          value={suggestion.youtubeId}
          onChange={(event) =>
            onSuggestionChange({ ...suggestion, youtubeId: event.target.value })
          }
          placeholder="https://youtube.com/watch?v=dQw4w9WgXcQ"
          required
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Song title"
            name="title"
            value={suggestion.title}
            onChange={(event) =>
              onSuggestionChange({ ...suggestion, title: event.target.value })
            }
            required
          />
          <Input
            label="Artist"
            name="artist"
            value={suggestion.artist}
            onChange={(event) =>
              onSuggestionChange({ ...suggestion, artist: event.target.value })
            }
            required
          />
        </div>

        <div className="flex justify-end gap-2.5 pt-1">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Adding...' : 'Add to queue'}
          </Button>
        </div>
      </div>
      )}
    </form>
  )
}
