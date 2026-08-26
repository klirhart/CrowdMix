import { env } from '@/lib/env'

export interface YouTubeSearchResult {
  videoId: string
  title: string
  channelTitle: string
  thumbnailUrl: string
}

interface YouTubeVideoListResponse {
  items?: Array<{
    contentDetails?: { duration?: string }
  }>
  error?: { message?: string }
}

/** Parse a YouTube ISO-8601 duration like PT4M17S into seconds. */
export function parseYouTubeDuration(iso: string | undefined): number {
  if (!iso) return 0
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const hours = Number(match[1] || 0)
  const minutes = Number(match[2] || 0)
  const seconds = Number(match[3] || 0)
  const total = hours * 3600 + minutes * 60 + seconds
  return Number.isFinite(total) && total > 0 ? total : 0
}

export async function fetchYouTubeDuration(videoId: string): Promise<number> {
  if (!env.youtubeApiKey || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return 0
  }

  const params = new URLSearchParams({
    part: 'contentDetails',
    id: videoId,
    key: env.youtubeApiKey,
  })
  const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`)
  const payload = (await response.json()) as YouTubeVideoListResponse

  if (!response.ok) {
    return 0
  }

  return parseYouTubeDuration(payload.items?.[0]?.contentDetails?.duration)
}

interface YouTubeApiResponse {
  items?: Array<{
    id?: { videoId?: string }
    snippet?: {
      title?: string
      channelTitle?: string
      thumbnails?: { medium?: { url?: string }; default?: { url?: string } }
    }
  }>
  error?: { message?: string }
}

export async function searchYouTube(query: string): Promise<YouTubeSearchResult[]> {
  if (!env.youtubeApiKey) {
    throw new Error('YouTube search is not configured. Add VITE_YOUTUBE_API_KEY to .env.')
  }

  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: '8',
    videoEmbeddable: 'true',
    key: env.youtubeApiKey,
  })
  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`)
  const payload = (await response.json()) as YouTubeApiResponse

  if (!response.ok) {
    throw new Error(payload.error?.message || 'YouTube search failed')
  }

  return (payload.items || [])
    .map((item) => ({
      videoId: item.id?.videoId || '',
      title: item.snippet?.title || 'Untitled video',
      channelTitle: item.snippet?.channelTitle || 'Unknown channel',
      thumbnailUrl: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
    }))
    .filter((item) => item.videoId)
}