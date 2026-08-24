/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_YOUTUBE_API_KEY: string
  readonly VITE_APP_URL: string
}

interface YouTubePlayerOptions {
  events?: {
    onStateChange?: (event: { data: number }) => void
  }
}

interface Window {
  YT?: {
    Player?: new (elementId: string, options: YouTubePlayerOptions) => { destroy: () => void }
    PlayerState?: { ENDED: number }
  }
  onYouTubeIframeAPIReady?: () => void
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
