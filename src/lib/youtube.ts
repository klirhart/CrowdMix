import { env } from '@/lib/env'

export interface YouTubeSearchResult {
  videoId: string
  title: string
  channelTitle: string
  thumbnailUrl: string
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