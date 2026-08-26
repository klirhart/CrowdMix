const LRCLIB_SEARCH = 'https://lrclib.net/api/search'

const TITLE_JUNK =
  /\s*[([{-]?\s*(official\s*)?(music\s*)?(lyric(s)?\s*)?(video|audio|visualizer|hd|4k|remaster(ed)?|color\s*coded)\s*[)\]}]?/gi

const CHANNEL_SUFFIX = /\s*(vevo|-?\s*topic)$/i

export class LyricsRequestError extends Error {
  constructor(message = "We couldn't load lyrics right now. Try again in a moment.") {
    super(message)
    this.name = 'LyricsRequestError'
  }
}

export type LyricsLookup =
  | { status: 'found'; lyrics: string }
  | { status: 'unavailable' }

interface LrclibHit {
  trackName?: string
  artistName?: string
  instrumental?: boolean
  plainLyrics?: string | null
  syncedLyrics?: string | null
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function tidy(value: string): string {
  return decodeHtml(value)
    .replace(TITLE_JUNK, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[-–—|:]+|[-–—|:]+$/g, '')
    .trim()
}

function stripChannelLabel(artist: string): string {
  return tidy(artist.replace(CHANNEL_SUFFIX, ' '))
}

function looksLikeChannel(artist: string): boolean {
  return /vevo|topic/i.test(artist)
}

/** Derive a track + artist query from YouTube-style titles and channel names. */
export function lyricsQueryFromSong(title: string, artist: string): { trackName: string; artistName: string } {
  const rawTitle = tidy(title) || title.trim()
  const rawArtist = stripChannelLabel(artist) || artist.trim()

  const dash = rawTitle.match(/^(.*?)\s+[-–—]\s+(.*)$/)
  if (dash && (looksLikeChannel(artist) || rawArtist.toLowerCase() === dash[1].toLowerCase())) {
    return { artistName: tidy(dash[1]) || rawArtist, trackName: tidy(dash[2]) || rawTitle }
  }

  return { trackName: rawTitle, artistName: rawArtist }
}

function pickLyrics(hits: LrclibHit[]): string | null {
  for (const hit of hits) {
    const plain = hit.plainLyrics?.trim()
    if (plain) {
      return plain
    }

    const synced = hit.syncedLyrics?.trim()
    if (synced) {
      return synced
        .split('\n')
        .map((line) => line.replace(/^\s*\[[^\]]+\]\s*/, ''))
        .join('\n')
        .trim()
    }
  }

  return null
}

async function searchLrclib(params: URLSearchParams, signal: AbortSignal): Promise<LrclibHit[]> {
  const response = await fetch(`${LRCLIB_SEARCH}?${params}`, { signal })

  if (!response.ok) {
    throw new LyricsRequestError()
  }

  const payload = (await response.json()) as unknown
  return Array.isArray(payload) ? (payload as LrclibHit[]) : []
}

/**
 * Look up lyrics for a playing song. Uses LRCLIB (not YouTube).
 * 404 / empty results are "unavailable"; network and 5xx are request errors.
 */
export async function fetchSongLyrics(
  title: string,
  artist: string,
  signal?: AbortSignal,
): Promise<LyricsLookup> {
  const abort = signal ?? new AbortController().signal
  const { trackName, artistName } = lyricsQueryFromSong(title, artist)

  const attempts: URLSearchParams[] = [
    new URLSearchParams({ track_name: trackName, artist_name: artistName }),
    new URLSearchParams({ q: [artistName, trackName].filter(Boolean).join(' ') }),
  ]

  const featured = trackName.replace(/\s+\(?f(?:ea)?t\.?\s+.+$/i, '').trim()
  if (featured && featured !== trackName) {
    attempts.splice(1, 0, new URLSearchParams({ track_name: featured, artist_name: artistName }))
  }

  let lastHits: LrclibHit[] = []

  try {
    for (const params of attempts) {
      const hits = await searchLrclib(params, abort)
      lastHits = hits
      const lyrics = pickLyrics(hits)
      if (lyrics) {
        return { status: 'found', lyrics }
      }
    }
  } catch (caught) {
    if (caught instanceof DOMException && caught.name === 'AbortError') {
      throw caught
    }
    if (caught instanceof LyricsRequestError) {
      throw caught
    }
    throw new LyricsRequestError()
  }

  if (lastHits.length > 0 && lastHits.every((hit) => hit.instrumental)) {
    return { status: 'unavailable' }
  }

  return { status: 'unavailable' }
}
