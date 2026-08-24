import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { useNavigate } from 'react-router-dom'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { getRoomByCode, addRoomMember, searchPublicRooms } from '@/lib/rooms'
import { searchProfiles } from '@/lib/profiles'
import type { Room } from '@/types/room'
import type { Profile } from '@/types/profile'

export function JoinRoomPage() {
  const navigate = useNavigate()
  const { user, isConfigured } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roomCode, setRoomCode] = useState('')
  const [activeTab, setActiveTab] = useState<'code' | 'search' | 'qr'>('code')
  const [searchQuery, setSearchQuery] = useState('')
  const [roomResults, setRoomResults] = useState<Room[]>([])
  const [profileResults, setProfileResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cameraActive, setCameraActive] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sharedCode = params.get('room')?.trim().toUpperCase()
    if (sharedCode) {
      setRoomCode(sharedCode)
    }
  }, [])

  useEffect(() => {
    if (activeTab !== 'search' || !searchQuery.trim()) {
      setRoomResults([])
      setProfileResults([])
      return
    }

    let active = true
    const timer = window.setTimeout(async () => {
      setSearching(true)
      try {
        const [rooms, profiles] = await Promise.all([
          searchPublicRooms(searchQuery),
          searchProfiles(searchQuery),
        ])
        if (active) {
          setRoomResults(rooms)
          setProfileResults(profiles)
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Search failed')
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
            try {
              const url = new URL(result.data)
              const code = url.searchParams.get('room')
              if (code) {
                setRoomCode(code.toUpperCase())
                setActiveTab('code')
                return
              }
            } catch {
              if (/^[A-Z0-9]{5}$/i.test(result.data)) {
                setRoomCode(result.data.toUpperCase())
                setActiveTab('code')
                return
              }
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
  }, [activeTab, cameraActive])

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

      // Check room accessibility
      if (room.visibility === 'private') {
        setError('This room is private. You need an invitation to join.')
        return
      }

      if (!room.is_active) {
        setError('This room is no longer active.')
        return
      }

      // Join the room
      await addRoomMember(room.id, user.id)

      // Navigate to the room
      navigate(`/r/${room.room_code}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join room'
      // Ignore unique constraint error (user already member)
      if (errorMessage.includes('unique constraint')) {
        navigate(`/r/${code}`)
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const tabButtonClass = (isActive: boolean) =>
    `flex-1 px-4 py-3 font-semibold rounded-lg border transition-colors ${
      isActive
        ? 'bg-accent text-white border-accent'
        : 'border-border bg-surface-raised text-muted hover:bg-surface-overlay'
    }`

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-3xl font-bold">Join a Room</h1>
        <p className="mt-2 text-muted">
          Find and join a room to start voting on music
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Tabs */}
      <div className="mt-8 flex gap-2">
        <button
          onClick={() => {
            setActiveTab('code')
            setError(null)
          }}
          className={tabButtonClass(activeTab === 'code')}
        >
          Room Code
        </button>
        <button
          onClick={() => {
            setActiveTab('search')
            setError(null)
          }}
          className={tabButtonClass(activeTab === 'search')}
        >
          Search
        </button>
        <button
          onClick={() => {
            setActiveTab('qr')
            setError(null)
          }}
          className={tabButtonClass(activeTab === 'qr')}
        >
          QR Code
        </button>
      </div>

      {/* Tab: Room Code */}
      {activeTab === 'code' && (
        <form onSubmit={handleJoinByCode} className="mt-8 space-y-6">
          <div>
            <Input
              id="roomCode"
              label="Enter Room Code"
              type="text"
              placeholder="e.g., A7K29"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              disabled={loading}
              maxLength={5}
              className="flex-1 font-mono text-center text-lg tracking-widest"
            />
            <p className="mt-2 text-sm text-muted">
              You can find the room code from the room creator or in the shared link
            </p>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover"
          >
            {loading ? 'Joining...' : 'Join Room'}
          </Button>
        </form>
      )}

      {/* Tab: Search */}
      {activeTab === 'search' && (
        <div className="mt-8 space-y-6">
          <div>
            <Input
              id="search"
              label="Search for Rooms or Users"
              type="text"
              placeholder="Search room name, username..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            <p className="mt-2 text-sm text-muted">
              Search public rooms or user profiles.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface-raised p-6 text-center">
            {searching && <p className="text-muted">Searching...</p>}
            {!searching && searchQuery.trim() && roomResults.length === 0 && profileResults.length === 0 && (
              <p className="text-muted">No rooms or users found.</p>
            )}
            {roomResults.length > 0 && (
              <div className="space-y-2 text-left">
                <h3 className="font-semibold text-white">Rooms</h3>
                {roomResults.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => {
                      setRoomCode(room.room_code)
                      setActiveTab('code')
                    }}
                    className="flex w-full items-center justify-between rounded-lg border border-border p-3 hover:bg-surface-overlay"
                  >
                    <span>
                      <span className="block font-medium text-white">{room.name}</span>
                      <span className="block text-xs text-muted">{room.room_code}</span>
                    </span>
                    <span className="text-sm text-accent">Join</span>
                  </button>
                ))}
              </div>
            )}
            {profileResults.length > 0 && (
              <div className="mt-4 space-y-2 text-left">
                <h3 className="font-semibold text-white">Users</h3>
                {profileResults.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => navigate(`/u/${profile.username}`)}
                    className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left hover:bg-surface-overlay"
                  >
                    <span>
                      <span className="block font-medium text-white">{profile.display_name}</span>
                      <span className="block text-xs text-muted">@{profile.username}</span>
                    </span>
                    <span className="text-sm text-accent">View profile</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: QR Code */}
      {activeTab === 'qr' && (
        <div className="mt-8 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-4">
              Scan a QR Code
            </label>
            <div className="rounded-lg border border-border bg-surface-raised p-6 text-center">
              {cameraActive ? (
                <video ref={videoRef} className="mx-auto aspect-video w-full max-w-md rounded-lg bg-black object-cover" playsInline muted />
              ) : (
                <p className="py-12 text-muted">Enable your camera to scan a room QR code.</p>
              )}
              <canvas ref={canvasRef} className="hidden" />
              <p className="mt-4 text-sm text-muted">
                Point your camera at the QR code generated by a room.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setCameraActive((active) => !active)}
              className="w-full mt-4 bg-surface-raised hover:bg-surface-overlay"
            >
              {cameraActive ? 'Stop Camera' : 'Enable Camera'}
            </Button>
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="mt-12 rounded-lg border border-border bg-surface-raised p-6">
        <h3 className="font-semibold">How to join</h3>
        <ul className="mt-4 space-y-3 text-sm text-muted">
          <li className="flex gap-3">
            <span className="flex-shrink-0 text-accent">→</span>
            <span>Get a room code from the room creator</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 text-accent">→</span>
            <span>Enter the code above or scan the QR code</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 text-accent">→</span>
            <span>You'll be taken to the room if it exists and is accessible</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 text-accent">→</span>
            <span>Start voting and suggesting songs immediately</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
