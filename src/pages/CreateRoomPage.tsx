import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, EyeOff, Globe, Lock, Sparkles } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cx } from '@/components/ui/cx'
import { PageHeader, PageShell } from '@/components/layout/PageShell'
import { useAuth } from '@/contexts/AuthContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { createRoom } from '@/lib/rooms'
import type { RoomVisibility } from '@/types/room'

export function CreateRoomPage() {
  const navigate = useNavigate()
  const { user, isConfigured } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  usePageTitle('Create a room')

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
      icon: Globe,
    },
    {
      value: 'unlisted' as RoomVisibility,
      label: 'Unlisted',
      description: 'Only accessible via room code, link, or QR code',
      icon: EyeOff,
    },
    {
      value: 'private' as RoomVisibility,
      label: 'Private',
      description: 'Only invited users can join',
      icon: Lock,
    },
  ]

  return (
    <PageShell width="narrow">
      <PageHeader
        eyebrow="New room"
        title="Create a Room"
        description="Start a room where everyone votes equally. You start playback for the crowd."
      />

      <form onSubmit={handleSubmit} className="mt-10 space-y-7" noValidate>
        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">Room created! Redirecting...</Alert>}

        {/* Room Name */}
        <Input
          id="name"
          name="name"
          label="Room name"
          type="text"
          placeholder="e.g., Friday Night Vibes"
          value={formData.name}
          onChange={handleChange}
          disabled={loading}
          maxLength={50}
          required
          hint={
            <span className="flex justify-between gap-4">
              <span>What should we call your room?</span>
              <span className="font-mono tabular-nums">{formData.name.trim().length}/50</span>
            </span>
          }
        />

        {/* Description */}
        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-medium text-ink">
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
            className={cx(
              'w-full resize-y rounded-xl border border-border bg-surface-sunken px-4 py-3',
              'text-sm leading-relaxed text-ink outline-none transition-colors duration-150',
              'placeholder:text-subtle hover:border-border-strong',
              'focus:border-accent focus:bg-surface disabled:cursor-not-allowed disabled:opacity-50',
            )}
          />
          <p className="flex justify-between gap-4 text-xs text-muted">
            <span>Tell people what your room is about (optional)</span>
            <span className="font-mono tabular-nums">{formData.description.length}/500</span>
          </p>
        </div>

        {/* Visibility */}
        <fieldset>
          <legend className="mb-3 block text-sm font-medium text-ink">
            Room visibility
          </legend>
          <div className="space-y-2.5">
            {visibilityOptions.map((option) => {
              const isSelected = formData.visibility === option.value
              const OptionIcon = option.icon

              return (
                <label
                  key={option.value}
                  className={cx(
                    'flex cursor-pointer items-start gap-3.5 rounded-card border p-4',
                    'transition-all duration-150',
                    'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent',
                    isSelected
                      ? 'border-accent/60 bg-accent-soft'
                      : 'border-border bg-surface-raised hover:border-border-strong hover:bg-surface-overlay',
                  )}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={option.value}
                    checked={isSelected}
                    onChange={handleChange}
                    disabled={loading}
                    className="sr-only"
                  />
                  <span
                    className={cx(
                      'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                      isSelected ? 'bg-accent text-white' : 'bg-surface-overlay text-subtle',
                    )}
                    aria-hidden="true"
                  >
                    <OptionIcon size={17} strokeWidth={2.25} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">{option.label}</span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-muted">
                      {option.description}
                    </span>
                  </span>
                  {isSelected ? (
                    <Check
                      size={17}
                      strokeWidth={3}
                      className="mt-2.5 shrink-0 text-accent"
                      aria-hidden="true"
                    />
                  ) : null}
                </label>
              )
            })}
          </div>
        </fieldset>

        {/* Submit Buttons */}
        <div className="flex flex-col gap-2.5 pt-1 sm:flex-row">
          <Button type="submit" disabled={loading} size="lg" className="flex-1">
            {loading ? 'Creating...' : 'Create Room'}
          </Button>
          <Button
            type="button"
            onClick={() => navigate(-1)}
            disabled={loading}
            variant="secondary"
            size="lg"
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </form>

      {/* Info Section */}
      <div className="mt-12 rounded-card border border-border bg-surface-raised p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-section">
          <Sparkles size={16} strokeWidth={2.25} className="text-accent" aria-hidden="true" />
          How it works
        </h2>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
          {[
            'Share the room with a link or QR code so others can join',
            'Everyone can suggest songs and vote equally on the play order',
            'As the room creator, you start and advance playback for everyone',
            'The room stays active as long as there are members in it',
          ].map((line) => (
            <li key={line} className="flex gap-3">
              <Check
                size={15}
                strokeWidth={3}
                className="mt-1 shrink-0 text-accent"
                aria-hidden="true"
              />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </PageShell>
  )
}
