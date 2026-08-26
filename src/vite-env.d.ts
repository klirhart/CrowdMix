/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_YOUTUBE_API_KEY: string
  readonly VITE_APP_URL: string
}

interface YouTubePlayer {
  destroy: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  playVideo: () => void
  pauseVideo: () => void
  stopVideo: () => void
  mute: () => void
  unMute: () => void
  isMuted: () => boolean
  setVolume: (volume: number) => void
  getVolume: () => number
  getCurrentTime: () => number
  getDuration: () => number
  getPlayerState: () => number
  loadVideoById: (options: { videoId: string; startSeconds?: number }) => void
  cueVideoById: (options: { videoId: string; startSeconds?: number }) => void
  getIframe?: () => HTMLIFrameElement
}

interface YouTubePlayerOptions {
  videoId?: string
  width?: string | number
  height?: string | number
  playerVars?: {
    autoplay?: number
    mute?: number
    controls?: number
    disablekb?: number
    fs?: number
    rel?: number
    modestbranding?: number
    playsinline?: number
    iv_load_policy?: number
    cc_load_policy?: number
    start?: number
    origin?: string
  }
  events?: {
    onReady?: (event: { target: YouTubePlayer }) => void
    onStateChange?: (event: { data: number; target: YouTubePlayer }) => void
    onError?: (event: { data: number; target: YouTubePlayer }) => void
  }
}

interface Window {
  YT?: {
    Player?: new (elementId: string | HTMLElement, options: YouTubePlayerOptions) => YouTubePlayer
    PlayerState?: {
      UNSTARTED: number
      ENDED: number
      PLAYING: number
      PAUSED: number
      BUFFERING: number
      CUED: number
    }
  }
  onYouTubeIframeAPIReady?: () => void
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
