import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  Camera,
  ChevronRight,
  KeyRound,
  Music,
  QrCode,
  ScanLine,
  Search,
  Users,
} from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Tabs, type TabItem } from '@/components/ui/Tabs'
import { tabId, tabPanelId } from '@/components/ui/tab-ids'
import { cx } from '@/components/ui/cx'
import { PageHeader, PageShell } from '@/components/layout/PageShell'
import { useAuth } from '@/contexts/AuthContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getRoomByCode, addRoomMember, searchPublicRooms } from '@/lib/rooms'
import { searchProfiles } from '@/lib/profiles'
import type { Room } from '@/types/room'
import type { Profile } from '@/types/profile'

function roomCodeFromScan(raw: string): string | null {
  const trimmed = raw.trim()
  if (/^[A-Z0-9]{5}$/i.test(trimmed)) {
    return trimmed.toUpperCase()
  }

  try {
    const url = new URL(trimmed)
    const fromQuery = url.searchParams.get('room')?.trim()
    if (fromQuery && /^[A-Z0-9]{5}$/i.test(fromQuery)) {
      return fromQuery.toUpperCase()
    }

    const fromPath = url.pathname.match(/\/r\/([A-Z0-9]{5})/i)
    if (fromPath?.[1]) {
      return fromPath[1].toUpperCase()
    }
  } catch {
    return null
  }

  return null
}

function isAlreadyMemberError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    if ((error as { code?: string }).code === '23505') {
      return true
    }
  }

  const message = error instanceof Error ? error.message : String(error)
  return /unique constraint|duplicate key/i.test(message)
}

type JoinTab = 'code' | 'search' | 'qr'

function parseJoinTab(value: string | null): JoinTab | null {
  if (value === 'code' || value === 'search' || value === 'qr') {
    return value
  }

  return null
}

const tabItems: ReadonlyArray<TabItem<JoinTab>> = [
  { value: 'code', label: 'Room Code', icon: <KeyRound size={15} strokeWidth={2.25} /> },
  { value: 'search', label: 'Search', icon: <Search size={15} strokeWidth={2.25} /> },
  { value: 'qr', label: 'QR Code', icon: <QrCode size={15} strokeWidth={2.25} /> },
]

export function JoinRoomPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, isConfigured } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [roomCode, setRoomCode] = useState(
    () => new URLSearchParams(window.location.search).get('room')?.trim().toUpperCase() ?? '',
  )
  const activeTab = parseJoinTab(searchParams.get('tab')) ?? 'code'
  const [searchQuery, setSearchQuery] = useState('')
  const [roomResults, setRoomResults] = useState<Room[]>([])
  const [profileResults, setProfileResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cameraActive, setCameraActive] = useState(false)

  usePageTitle('Join a room')

  useEffect(() => {
    const sharedCode = searchParams.get('room')?.trim().toUpperCase()
    if (sharedCode) {
      setRoomCode(sharedCode)
    }
  }, [searchParams])

  const handleTabChange = (next: JoinTab) => {
    setError(null)
    setSearchError(null)
    const nextParams = new URLSearchParams(searchParams)
    if (next === 'code') {
      nextParams.delete('tab')
    } else {
      nextParams.set('tab', next)
    }
    setSearchParams(nextParams, { replace: true })
  }

  useEffect(() => {
    const term = searchQuery.trim()

    if (activeTab !== 'search' || !term) {
      setRoomResults([])
      setProfileResults([])
      setSearching(false)
      return
    }

    let active = true
    const timer = window.setTimeout(async () => {
      setSearching(true)
      setSearchError(null)
      try {
        const [rooms, profiles] = await Promise.all([
          searchPublicRooms(term),
          searchProfiles(term),
        ])
        if (active) {
          setRoomResults(rooms)
          setProfileResults(profiles)
        }
      } catch (err) {
        if (active) {
          setSearchError(err instanceof Error ? err.message : 'Search failed')
        }
      } finally {
        if (active) setSearching(false)
      }
    }, 250)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [activeTab, searchQuery])

  useEffect(() => {
    if (activeTab !== 'qr' || !cameraActive) return

    let stream: MediaStream | undefined
    let animationFrame = 0
    let cancelled = false

    const scan = () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || cancelled) return

      if (video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const context = canvas.getContext('2d')
        if (context) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height)
          const result = jsQR(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)
          if (result?.data) {
            const code = roomCodeFromScan(result.data)
            if (code) {
              setCameraActive(false)
              navigate(`/r/${code}`)
              return
            }
          }
        }
      }
      animationFrame = window.requestAnimationFrame(scan)
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera scanning is not supported by this browser.')
      return
    }

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then((nextStream) => {
        if (cancelled) {
          nextStream.getTracks().forEach((track) => track.stop())
          return
        }
        stream = nextStream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          void videoRef.current.play()
          animationFrame = window.requestAnimationFrame(scan)
        }
      })
      .catch(() => setError('Camera permission is required to scan a QR code.'))

    return () => {
      cancelled = true
      window.cancelAnimationFrame(animationFrame)
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [activeTab, cameraActive, navigate])

  const handleJoinByCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const code = roomCode.trim().toUpperCase()

    if (!code) {
      setError('Please enter a room code')
      return
    }

    if (code.length !== 5) {
      setError('Room code must be 5 characters')
      return
    }

    if (!isConfigured || !user) {
      setError('Authentication is not configured or you are not logged in')
      return
    }

    setLoading(true)

    try {
      // Get room by code
      const room = await getRoomByCode(code)

      if (!room) {
        setError('Room not found. Please check the room code.')
        return
      }

      if (!room.is_active) {
        setError('This room is no longer active.')
        return
      }

      if (room.visibility === 'private') {
        navigate(`/r/${room.room_code}`)
        return
      }

      await addRoomMember(room.id, user.id)
      navigate(`/r/${room.room_code}`)
    } catch (err) {
      if (isAlreadyMemberError(err)) {
        navigate(`/r/${code}`)
      } else {
        setError(err instanceof Error ? err.message : 'Failed to join room')
      }
    } finally {
      setLoading(false)
    }
  }

  const hasSearched = Boolean(searchQuery.trim())
  const noResults =
    !searching && hasSearched && roomResults.length === 0 && profileResults.length === 0

  return (
    <PageShell width="narrow">
      <PageHeader
        eyebrow="Join in"
        title="Join a Room"
        description="Enter a code, search the community, or scan a QR code to start voting on music."
      />

      {error && (
        <Alert variant="error" className="mt-6">
          {error}
        </Alert>
      )}

      <Tabs
        items={tabItems}
        value={activeTab}
        onChange={handleTabChange}
        idBase="join"
        label="How to join a room"
        className="mt-8"
      />

      {/* Tab: Room Code */}
      {activeTab === 'code' && (
        <form
          onSubmit={handleJoinByCode}
          role="tabpanel"
          id={tabPanelId('join', 'code')}
          aria-labelledby={tabId('join', 'code')}
          className="mt-8 animate-enter space-y-6"
        >
          <div className="rounded-panel border border-border bg-surface-raised p-6 text-center sm:p-8">
            <span
              className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent"
              aria-hidden="true"
            >
              <KeyRound size={22} strokeWidth={2.25} />
            </span>

            <p className="mb-3 text-meta uppercase text-subtle">Room code</p>

            <Input
              id="roomCode"
              label="Enter room code"
              type="text"
              placeholder="A7K29"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              disabled={loading}
              maxLength={5}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              hideLabel
              className={cx(
                'text-center font-mono text-2xl font-bold uppercase',
                'tracking-[0.15em] placeholder:tracking-[0.15em] sm:tracking-[0.35em] sm:placeholder:tracking-[0.35em] sm:text-3xl',
              )}
            />

            <p className="mt-4 text-sm leading-relaxed text-muted">
              Room codes are 5 characters. Ask the room creator, or use a shared link.
            </p>
          </div>

          <Button type="submit" disabled={loading} size="lg" fullWidth>
            {loading ? 'Joining...' : 'Join Room'}
            {loading ? null : <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" />}
          </Button>
        </form>
      )}

      {/* Tab: Search */}
      {activeTab === 'search' && (
        <div
          role="tabpanel"
          id={tabPanelId('join', 'search')}
          aria-labelledby={tabId('join', 'search')}
          className="mt-8 animate-enter space-y-5"
        >
          <Input
            id="search"
            label="Search for rooms or users"
            type="text"
            placeholder="Search room name, username..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            icon={<Search size={16} strokeWidth={2.25} />}
            hint="Search public rooms or user profiles."
          />

          {searchError ? (
            <Alert variant="error">{searchError}</Alert>
          ) : null}

          {searching ? <LoadingSpinner label="Searching..." inline className="px-1" /> : null}

          {noResults ? (
            <div className="rounded-card border border-dashed border-border bg-surface-raised/60 p-8 text-center">
              <p className="text-sm text-muted">No rooms or users match “{searchQuery.trim()}”.</p>
            </div>
          ) : null}

          {roomResults.length > 0 && (
            <section>
              <h2 className="mb-2.5 flex items-center gap-2 text-meta uppercase text-subtle">
                <Music size={13} strokeWidth={2.5} aria-hidden="true" />
                Rooms
              </h2>
              <div className="space-y-2">
                {roomResults.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => navigate(`/r/${room.room_code}`)}
                    className={cx(
                      'flex w-full items-center gap-3 rounded-card border border-border bg-surface-raised p-3.5',
                      'text-left transition-all duration-150',
                      'hover:border-border-strong hover:bg-surface-overlay',
                    )}
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent/30 to-accent-2/20 text-white/80"
                      aria-hidden="true"
                    >
                      <Music size={17} strokeWidth={2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">
                        {room.name}
                      </span>
                      <span className="block font-mono text-xs uppercase tracking-wider text-subtle">
                        {room.room_code}
                      </span>
                    </span>
                    <ChevronRight
                      size={17}
                      strokeWidth={2.5}
                      className="shrink-0 text-subtle"
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
            </section>
          )}

          {profileResults.length > 0 && (
            <section>
              <h2 className="mb-2.5 flex items-center gap-2 text-meta uppercase text-subtle">
                <Users size={13} strokeWidth={2.5} aria-hidden="true" />
                People
              </h2>
              <div className="space-y-2">
                {profileResults.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => navigate(`/u/${profile.username}`)}
                    className={cx(
                      'flex w-full items-center gap-3 rounded-card border border-border bg-surface-raised p-3.5',
                      'text-left transition-all duration-150',
                      'hover:border-border-strong hover:bg-surface-overlay',
                    )}
                  >
                    <Avatar
                      displayName={profile.display_name}
                      avatarUrl={profile.avatar_url}
                      size="sm"
                      identityKey={profile.id}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">
                        {profile.display_name}
                      </span>
                      <span className="block truncate text-xs text-subtle">
                        @{profile.username}
                      </span>
                    </span>
                    <ChevronRight
                      size={17}
                      strokeWidth={2.5}
                      className="shrink-0 text-subtle"
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Tab: QR Code */}
      {activeTab === 'qr' && (
        <div
          role="tabpanel"
          id={tabPanelId('join', 'qr')}
          aria-labelledby={tabId('join', 'qr')}
          className="mt-8 animate-enter space-y-4"
        >
          <div className="overflow-hidden rounded-panel border border-border bg-surface-raised">
            {cameraActive ? (
              <div className="relative bg-black">
                <video
                  ref={videoRef}
                  className="mx-auto aspect-video w-full object-cover"
                  playsInline
                  muted
                />
                <div
                  className="pointer-events-none absolute inset-0 flex items-center justify-center"
                  aria-hidden="true"
                >
                  <div className="h-40 w-40 rounded-2xl border-2 border-accent/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center px-6 py-14 text-center">
                <span
                  className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent"
                  aria-hidden="true"
                >
                  <ScanLine size={24} strokeWidth={2} />
                </span>
                <p className="text-section text-ink">Scan a room QR code</p>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">
                  Point your camera at the QR code shown in a room to join instantly.
                </p>
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />
          </div>

          <Button
            type="button"
            onClick={() => setCameraActive((active) => !active)}
            variant={cameraActive ? 'secondary' : 'primary'}
            size="lg"
            fullWidth
          >
            <Camera size={16} strokeWidth={2.25} aria-hidden="true" />
            {cameraActive ? 'Stop Camera' : 'Enable Camera'}
          </Button>
        </div>
      )}

      {/* Info Section */}
      <div className="mt-12 rounded-card border border-border bg-surface-raised p-5 sm:p-6">
        <h2 className="text-section">How to join</h2>
        <ol className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
          {[
            'Get a room code from the room creator',
            'Enter the code above or scan the QR code',
            "You'll be taken to the room if it exists and is accessible",
            'Start voting and suggesting songs immediately',
          ].map((line, index) => (
            <li key={line} className="flex gap-3">
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft font-mono text-[11px] font-bold text-accent"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ol>
      </div>
    </PageShell>
  )
}
