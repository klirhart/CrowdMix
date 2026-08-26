/** Shared room-clock helpers. Position is derived from `playing_started_at`, not local player time. */

export const DEVICE_VOLUME_KEY = 'crowdmix.device-volume'
export const DEFAULT_DEVICE_VOLUME = 80

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function roomElapsedSeconds(
  startedAt: string | null | undefined,
  nowMs = Date.now(),
): number {
  if (!startedAt) return 0
  const elapsed = (nowMs - Date.parse(startedAt)) / 1000
  return Number.isFinite(elapsed) && elapsed > 0 ? elapsed : 0
}

export function roomTrackDuration(
  engineDuration: number | null | undefined,
  songDuration?: number | null,
): number {
  if (typeof engineDuration === 'number' && engineDuration > 1) return engineDuration
  if (typeof songDuration === 'number' && songDuration > 1) return songDuration
  return 0
}

export function displayElapsedSeconds(elapsedSeconds: number, durationSeconds: number): number {
  if (durationSeconds > 0) return Math.min(elapsedSeconds, durationSeconds)
  return Math.max(0, elapsedSeconds)
}

/** True once the shared room clock has reached the track length. */
export function roomPlaybackFinished(
  startedAt: string | null | undefined,
  durationSeconds: number,
  nowMs = Date.now(),
  leadSeconds = 0.35,
): boolean {
  if (!startedAt || !Number.isFinite(durationSeconds) || durationSeconds <= 1) {
    return false
  }
  return roomElapsedSeconds(startedAt, nowMs) >= durationSeconds - leadSeconds
}

export function clampDeviceVolume(volume: number): number {
  if (!Number.isFinite(volume)) return DEFAULT_DEVICE_VOLUME
  return Math.min(100, Math.max(0, Math.round(volume)))
}

export function readDeviceVolume(): number {
  try {
    return clampDeviceVolume(Number(window.localStorage.getItem(DEVICE_VOLUME_KEY)))
  } catch {
    return DEFAULT_DEVICE_VOLUME
  }
}

export function writeDeviceVolume(volume: number): number {
  const next = clampDeviceVolume(volume)
  try {
    window.localStorage.setItem(DEVICE_VOLUME_KEY, String(next))
  } catch {
    // Private mode can reject localStorage; playback still uses `next`.
  }
  return next
}
