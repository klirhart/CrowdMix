import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import {
  clampDeviceVolume,
  DEFAULT_DEVICE_VOLUME,
  roomElapsedSeconds,
  roomPlaybackFinished,
} from '@/lib/playback'

const DRIFT_SECONDS = 1.5
const SEEK_COOLDOWN_MS = 2500
const FAST_SYNC_MS = 500
const FAST_SYNC_WINDOW_MS = 8000
const SLOW_SYNC_MS = 2000

export interface PlaybackEngineHandle {
  setVolume: (volume: number) => void
}

interface SyncedYouTubePlayerProps {
  videoId: string
  startedAt: string | null
  volume?: number
  onEnded: () => void
  onDuration?: (seconds: number) => void
  onEngineState?: (state: 'loading' | 'live') => void
}

let playerGeneration = 0
let livePlayer: YouTubePlayer | undefined

function isYouTubeIframe(iframe: HTMLIFrameElement): boolean {
  const src = iframe.src || iframe.getAttribute('src') || ''
  return /youtube\.com|youtube-nocookie\.com|youtu\.be/.test(src)
}

function commandYouTubeIframe(iframe: HTMLIFrameElement | undefined, func: string, args: Array<number | string> = []) {
  const target = iframe?.contentWindow
  if (!target || !iframe) return

  target.postMessage(JSON.stringify({ event: 'listening', id: iframe.id || 'crowdmix-player' }), '*')
  target.postMessage(
    JSON.stringify({ event: 'command', func, args, id: iframe.id || 'crowdmix-player' }),
    '*',
  )
}

function youtubeIframes(root: ParentNode | Document = document): HTMLIFrameElement[] {
  return [...root.querySelectorAll('iframe')].filter(isYouTubeIframe)
}

function muteIframe(iframe: HTMLIFrameElement) {
  commandYouTubeIframe(iframe, 'setVolume', [0])
  commandYouTubeIframe(iframe, 'mute')
}

function applyVolumeToIframe(iframe: HTMLIFrameElement, volume: number) {
  const next = clampDeviceVolume(volume)
  if (next <= 0) {
    muteIframe(iframe)
    return
  }
  commandYouTubeIframe(iframe, 'unMute')
  commandYouTubeIframe(iframe, 'setVolume', [next])
}

function silenceAndRemoveIframe(iframe: HTMLIFrameElement) {
  muteIframe(iframe)
  commandYouTubeIframe(iframe, 'stopVideo')
  iframe.src = 'about:blank'
  iframe.remove()
}

function silenceOrphanIframes(keep: HTMLIFrameElement | undefined) {
  for (const frame of youtubeIframes()) {
    if (keep && frame === keep) continue
    silenceAndRemoveIframe(frame)
  }
}

function applyLocalVolume(player: YouTubePlayer, volume: number) {
  const next = clampDeviceVolume(volume)
  const iframe = player.getIframe?.()
  const engine = iframe?.closest('.youtube-playback-engine')

  silenceOrphanIframes(iframe)

  try {
    if (next <= 0) {
      player.setVolume?.(0)
      player.mute()
    } else {
      // Unmute first. YouTube ignores setVolume while autoplay mute is on.
      player.unMute()
      player.setVolume?.(next)
    }
  } catch {
    // Player methods throw until the iframe API is fully ready.
  }

  if (iframe) {
    applyVolumeToIframe(iframe, next)
  }

  engine?.setAttribute('data-volume', String(next))
  engine?.setAttribute('data-muted', next <= 0 ? 'true' : 'false')
}

function destroyYouTubePlayer(player: YouTubePlayer | undefined) {
  if (!player) return

  try {
    player.mute()
  } catch {
    // Ignore teardown errors from a half-ready player.
  }
  try {
    player.setVolume?.(0)
  } catch {
    // Ignore teardown errors from a half-ready player.
  }
  try {
    player.stopVideo()
  } catch {
    // Ignore teardown errors from a half-ready player.
  }
  try {
    player.pauseVideo()
  } catch {
    // Ignore teardown errors from a half-ready player.
  }

  const iframe = player.getIframe?.()
  try {
    player.destroy()
  } catch {
    // Ignore teardown errors from a half-ready player.
  }

  if (iframe?.isConnected) {
    silenceAndRemoveIframe(iframe)
  }

  if (livePlayer === player) {
    livePlayer = undefined
  }
}

function sizeYouTubeIframe(player: YouTubePlayer) {
  const iframe = player.getIframe?.()
  if (!iframe) return

  iframe.tabIndex = -1
  iframe.setAttribute('tabindex', '-1')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.setProperty('position', 'absolute', 'important')
  iframe.style.setProperty('left', '-12%', 'important')
  iframe.style.setProperty('top', '-28%', 'important')
  iframe.style.setProperty('width', '124%', 'important')
  iframe.style.setProperty('height', '156%', 'important')
  iframe.style.setProperty('pointer-events', 'none', 'important')
  iframe.style.border = '0'
}

function isReadyPlayer(player: YouTubePlayer | undefined): player is YouTubePlayer {
  return typeof player?.seekTo === 'function' && typeof player.getPlayerState === 'function'
}

function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve()
    }

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(script)
    }
  })
}

export const SyncedYouTubePlayer = forwardRef<PlaybackEngineHandle, SyncedYouTubePlayerProps>(
  function SyncedYouTubePlayer(
    { videoId, startedAt, volume = DEFAULT_DEVICE_VOLUME, onEnded, onDuration, onEngineState },
    ref,
  ) {
    const playerRef = useRef<YouTubePlayer | undefined>(undefined)
    const startedAtRef = useRef(startedAt)
    const onEndedRef = useRef(onEnded)
    const onDurationRef = useRef(onDuration)
    const onEngineStateRef = useRef(onEngineState)
    const volumeRef = useRef(clampDeviceVolume(volume))
    const endedForVideoRef = useRef<string | null>(null)
    const hostRef = useRef<HTMLDivElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)

    useImperativeHandle(ref, () => ({
      setVolume(nextVolume) {
        volumeRef.current = clampDeviceVolume(nextVolume)
        const player = playerRef.current
        if (isReadyPlayer(player)) {
          applyLocalVolume(player, volumeRef.current)
          return
        }
        for (const frame of youtubeIframes()) {
          applyVolumeToIframe(frame, volumeRef.current)
        }
      },
    }))

    useEffect(() => {
      volumeRef.current = clampDeviceVolume(volume)
      const player = playerRef.current
      if (isReadyPlayer(player)) {
        applyLocalVolume(player, volumeRef.current)
        return
      }
      for (const frame of youtubeIframes()) {
        applyVolumeToIframe(frame, volumeRef.current)
      }
    }, [volume])

    useEffect(() => {
      startedAtRef.current = startedAt
      onEndedRef.current = onEnded
      onDurationRef.current = onDuration
      onEngineStateRef.current = onEngineState
    }, [startedAt, onEnded, onDuration, onEngineState])

    useEffect(() => {
      onEngineStateRef.current?.(isPlaying ? 'live' : 'loading')
    }, [isPlaying])

    useEffect(() => {
      const host = hostRef.current
      if (!host) return

      const generation = ++playerGeneration
      let cancelled = false
      endedForVideoRef.current = null
      setIsPlaying(false)

      destroyYouTubePlayer(livePlayer)
      destroyYouTubePlayer(playerRef.current)
      for (const frame of youtubeIframes(host)) {
        silenceAndRemoveIframe(frame)
      }
      host.replaceChildren()

      const target = document.createElement('div')
      target.style.width = '100%'
      target.style.height = '100%'
      target.style.pointerEvents = 'none'
      host.append(target)

      const expectedTime = () => roomElapsedSeconds(startedAtRef.current)

      const fireEnded = () => {
        if (cancelled || endedForVideoRef.current === videoId) return
        endedForVideoRef.current = videoId
        setIsPlaying(false)
        onEndedRef.current()
      }

      const reportDuration = (player: YouTubePlayer) => {
        const duration = player.getDuration?.() ?? 0
        if (duration > 1) {
          onDurationRef.current?.(duration)
        }
        return duration
      }

      const maybeFinishFromClock = (player: YouTubePlayer) => {
        const duration = reportDuration(player)
        if (roomPlaybackFinished(startedAtRef.current, duration)) {
          fireEnded()
          return true
        }
        return false
      }

      const roomPosition = (player: YouTubePlayer) => {
        const expected = expectedTime()
        const duration = reportDuration(player)
        if (duration > 1 && expected >= duration - 0.35) {
          return duration
        }
        if (duration > 0) {
          return Math.min(expected, Math.max(duration - 0.25, 0))
        }
        return expected
      }

      let lastSeekAt = 0

      const seekIfNeeded = (player: YouTubePlayer, force = false) => {
        if (!isReadyPlayer(player)) return

        const expected = roomPosition(player)
        const actual = player.getCurrentTime()
        if (!force && Math.abs(actual - expected) <= DRIFT_SECONDS) return

        const now = Date.now()
        if (!force && now - lastSeekAt < SEEK_COOLDOWN_MS) return

        lastSeekAt = now
        player.seekTo(expected, true)
      }

      const resumePlayback = (player: YouTubePlayer) => {
        if (!isReadyPlayer(player)) return
        if (player.getPlayerState() !== window.YT?.PlayerState?.PLAYING) {
          player.playVideo()
        }
        seekIfNeeded(player)
      }

      const seekToRoomClock = (player: YouTubePlayer) => {
        if (!isReadyPlayer(player)) return
        if (maybeFinishFromClock(player)) return
        resumePlayback(player)
      }

      const syncToRoomClock = (player: YouTubePlayer) => {
        if (!isReadyPlayer(player)) return

        if (maybeFinishFromClock(player)) {
          return
        }

        const state = player.getPlayerState()

        if (state === window.YT?.PlayerState?.ENDED) {
          fireEnded()
          return
        }

        if (state === window.YT?.PlayerState?.BUFFERING) {
          return
        }

        if (state === window.YT?.PlayerState?.PAUSED || state === window.YT?.PlayerState?.CUED) {
          if (!cancelled) setIsPlaying(false)
          player.playVideo()
          return
        }

        seekIfNeeded(player)
      }

      const timers: number[] = []
      let slowSwitch = 0
      let createdPlayer: YouTubePlayer | undefined

      const startSync = () => {
        if (cancelled || timers.length > 0) return

        timers.push(
          window.setInterval(() => {
            const player = playerRef.current
            if (isReadyPlayer(player)) syncToRoomClock(player)
          }, FAST_SYNC_MS),
        )
        slowSwitch = window.setTimeout(() => {
          window.clearInterval(timers[0])
          timers.push(
            window.setInterval(() => {
              const player = playerRef.current
              if (isReadyPlayer(player)) syncToRoomClock(player)
            }, SLOW_SYNC_MS),
          )
        }, FAST_SYNC_WINDOW_MS)
      }

      const createPlayer = () => {
        if (cancelled || generation !== playerGeneration || !window.YT?.Player) return

        // cueVideoById + playVideo is the offset API. Passing videoId into the
        // constructor auto-starts at 0:00; loadVideoById + autoplay can spawn a
        // second audio graph so the bar volume and the picture get out of sync.
        const created = new window.YT.Player(target, {
          height: '100%',
          width: '100%',
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            iv_load_policy: 3,
            cc_load_policy: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled || generation !== playerGeneration) {
                destroyYouTubePlayer(event.target)
                return
              }

              playerRef.current = event.target
              livePlayer = event.target
              sizeYouTubeIframe(event.target)
              startSync()
              event.target.mute()
              event.target.cueVideoById({
                videoId,
                startSeconds: expectedTime(),
              })
              event.target.playVideo()
              applyLocalVolume(event.target, volumeRef.current)
            },
            onError: (event) => {
              if (!isReadyPlayer(event.target) || cancelled || generation !== playerGeneration) return
              seekToRoomClock(event.target)
            },
            onStateChange: (event) => {
              if (!isReadyPlayer(event.target) || cancelled || generation !== playerGeneration) {
                return
              }

              if (event.data === window.YT?.PlayerState?.UNSTARTED) {
                event.target.playVideo()
                return
              }

              if (event.data === window.YT?.PlayerState?.PLAYING) {
                if (!cancelled) setIsPlaying(true)
                applyLocalVolume(event.target, volumeRef.current)
                seekIfNeeded(event.target)
                return
              }

              if (event.data === window.YT?.PlayerState?.PAUSED) {
                if (!cancelled) setIsPlaying(false)
                event.target.playVideo()
                return
              }

              if (event.data === window.YT?.PlayerState?.BUFFERING) {
                return
              }

              if (event.data === window.YT?.PlayerState?.CUED) {
                if (!cancelled) setIsPlaying(false)
                event.target.playVideo()
                return
              }

              if (event.data !== window.YT?.PlayerState?.ENDED) {
                return
              }

              if (maybeFinishFromClock(event.target)) {
                return
              }

              const duration = reportDuration(event.target)
              const actual = event.target.getCurrentTime?.() ?? 0
              if (duration > 1 && actual >= duration - 1.25) {
                fireEnded()
                return
              }

              seekToRoomClock(event.target)
            },
          },
        })

        createdPlayer = created
        if (isReadyPlayer(created) && !cancelled && generation === playerGeneration) {
          playerRef.current = created
          livePlayer = created
          startSync()
        }
      }

      void loadYouTubeApi().then(() => {
        if (!cancelled && generation === playerGeneration) createPlayer()
      })

      return () => {
        cancelled = true
        window.clearTimeout(slowSwitch)
        for (const timer of timers) {
          window.clearInterval(timer)
        }
        destroyYouTubePlayer(playerRef.current ?? createdPlayer)
        playerRef.current = undefined
        for (const frame of youtubeIframes(host)) {
          silenceAndRemoveIframe(frame)
        }
        host.replaceChildren()
      }
    }, [videoId])

    return (
      <div className="youtube-playback-engine" aria-hidden="true">
        <div
          ref={hostRef}
          className="synced-youtube-host pointer-events-none relative h-full w-full overflow-hidden"
        />
        <div
          className="absolute inset-0 z-20 cursor-default bg-transparent"
          onContextMenu={(event) => event.preventDefault()}
          onClick={(event) => event.preventDefault()}
          onMouseDown={(event) => event.preventDefault()}
          onDoubleClick={(event) => event.preventDefault()}
          onPointerDown={(event) => event.preventDefault()}
        />
      </div>
    )
  },
)
