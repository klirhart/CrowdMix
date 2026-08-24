import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { createRoom } from '@/lib/rooms'
import type { RoomVisibility } from '@/types/room'

export function CreateRoomPage() {
  const navigate = useNavigate()
  const { user, isConfigured } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    visibility: 'public' as RoomVisibility,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // Validation
    if (!formData.name.trim()) {
      setError('Room name is required')
      return
    }

    if (formData.name.trim().length < 3) {
      setError('Room name must be at least 3 characters')
      return
    }

    if (formData.name.trim().length > 50) {
      setError('Room name must be less than 50 characters')
      return
    }

    if (formData.description.length > 500) {
      setError('Description must be less than 500 characters')
      return
    }

    if (!isConfigured || !user) {
      setError('Authentication is not configured or you are not logged in')
      return
    }

    setLoading(true)

    try {
      const newRoom = await createRoom(
        {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          visibility: formData.visibility,
        },
        user.id,
      )

      setSuccess(true)

      // Redirect to the new room
      setTimeout(() => {
        navigate(`/r/${newRoom.room_code}`)
      }, 500)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        setError(String(err.message))
      } else {
        setError('Failed to create room. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const visibilityOptions = [
    {
      value: 'public' as RoomVisibility,
      label: 'Public',
      description: 'Anyone can discover and join this room',
    },
    {
      value: 'unlisted' as RoomVisibility,
      label: 'Unlisted',
      description: 'Only accessible via room code, link, or QR code',
    },
    {
      value: 'private' as RoomVisibility,
      label: 'Private',
      description: 'Only invited users can join',
    },
  ]

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-3xl font-bold">Create a Room</h1>
        <p className="mt-2 text-muted">
          Start your own music room where everyone has equal voting power
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-10 space-y-6">
        {error && <Alert variant="error">{error}</Alert>}
        {success && (
          <Alert variant="success">Room created! Redirecting...</Alert>
        )}

        {/* Room Name */}
        <div>
          <Input
            id="name"
            name="name"
            label="Room Name *"
            type="text"
            placeholder="e.g., Friday Night Vibes"
            value={formData.name}
            onChange={handleChange}
            disabled={loading}
            maxLength={50}
            required
          />
          <div className="mt-1 flex justify-between">
            <p className="text-xs text-muted">
              What should we call your room?
            </p>
            <p className="text-xs text-muted">
              {formData.name.length}/50
            </p>
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            placeholder="e.g., A chill room for discovering new music on Friday nights"
            value={formData.description}
            onChange={handleChange}
            disabled={loading}
            maxLength={500}
            rows={4}
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-white placeholder-muted/50 focus:border-accent focus:outline-none disabled:opacity-50"
          />
          <div className="mt-1 flex justify-between">
            <p className="text-xs text-muted">
              Tell people what your room is about (optional)
            </p>
            <p className="text-xs text-muted">
              {formData.description.length}/500
            </p>
          </div>
        </div>

        {/* Visibility */}
        <div>
          <label className="block text-sm font-medium mb-4">
            Room Visibility *
          </label>
          <div className="space-y-3">
            {visibilityOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-start gap-3 rounded-lg border border-border bg-surface-raised p-4 cursor-pointer transition-colors hover:bg-surface-overlay"
              >
                <input
                  type="radio"
                  name="visibility"
                  value={option.value}
                  checked={formData.visibility === option.value}
                  onChange={handleChange}
                  disabled={loading}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-medium text-white">{option.label}</p>
                  <p className="text-sm text-muted">{option.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-3 pt-6">
          <Button
            type="submit"
            disabled={loading}
            className="flex-1 bg-accent hover:bg-accent-hover"
          >
            {loading ? 'Creating...' : 'Create Room'}
          </Button>
          <Button
            type="button"
            onClick={() => navigate(-1)}
            disabled={loading}
            className="flex-1 bg-surface-raised hover:bg-surface-overlay"
          >
            Cancel
          </Button>
        </div>
      </form>

      {/* Info Section */}
      <div className="mt-12 rounded-lg border border-border bg-surface-raised p-6">
        <h3 className="font-semibold">How it works</h3>
        <ul className="mt-4 space-y-3 text-sm text-muted">
          <li className="flex gap-3">
            <span className="flex-shrink-0 text-accent">✓</span>
            <span>Once you create a room, you can share it with a URL or QR code</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 text-accent">✓</span>
            <span>Everyone in the room has equal permissions—no special host powers</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 text-accent">✓</span>
            <span>Members can suggest songs and vote to determine what plays next</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 text-accent">✓</span>
            <span>The room stays active as long as there are members in it</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
