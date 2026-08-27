import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Camera, ImagePlus, Trash2 } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { cx } from '@/components/ui/cx'
import {
  BIO_MAX_LENGTH,
  LOCATION_MAX_LENGTH,
  normalizeUsername,
  normalizeWebsite,
  validateBio,
  validateDisplayName,
  validateLocation,
  validateUsername,
  validateWebsite,
} from '@/lib/auth-validation'
import { validateImageFile, PROFILE_IMAGE_MAX_MB } from '@/lib/image'
import { deleteProfileMedia, uploadProfileMedia } from '@/lib/profile-media'
import { getProfileSaveError, isUsernameAvailable, updateProfile } from '@/lib/profiles'
import type { Profile } from '@/types/profile'

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'

interface EditProfileModalProps {
  open: boolean
  profile: Profile
  onClose: () => void
  onSaved: (profile: Profile) => void
}

type FieldErrors = {
  displayName?: string
  username?: string
  bio?: string
  location?: string
  website?: string
  avatar?: string
  cover?: string
}

export function EditProfileModal({ open, profile, onClose, onSaved }: EditProfileModalProps) {
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState(profile.display_name)
  const [username, setUsername] = useState(profile.username)
  const [bio, setBio] = useState(profile.bio ?? '')
  const [location, setLocation] = useState(profile.location ?? '')
  const [website, setWebsite] = useState(profile.website ?? '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [avatarRemoved, setAvatarRemoved] = useState(false)
  const [coverRemoved, setCoverRemoved] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    setDisplayName(profile.display_name)
    setUsername(profile.username)
    setBio(profile.bio ?? '')
    setLocation(profile.location ?? '')
    setWebsite(profile.website ?? '')
    setAvatarFile(null)
    setCoverFile(null)
    setAvatarRemoved(false)
    setCoverRemoved(false)
    setFieldErrors({})
    setError(null)
    setSaving(false)
  }, [open, profile])

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null)
      return
    }

    const url = URL.createObjectURL(avatarFile)
    setAvatarPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [avatarFile])

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview(null)
      return
    }

    const url = URL.createObjectURL(coverFile)
    setCoverPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [coverFile])

  const handleClose = useCallback(() => {
    if (!saving) {
      onClose()
    }
  }, [onClose, saving])

  const previewAvatar = avatarPreview ?? (avatarRemoved ? null : profile.avatar_url)
  const previewCover = coverPreview ?? (coverRemoved ? null : profile.cover_url)

  const pickImage = (
    kind: 'avatar' | 'cover',
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }

    try {
      validateImageFile(file)
      if (kind === 'avatar') {
        setAvatarFile(file)
        setAvatarRemoved(false)
        setFieldErrors((current) => ({ ...current, avatar: undefined }))
      } else {
        setCoverFile(file)
        setCoverRemoved(false)
        setFieldErrors((current) => ({ ...current, cover: undefined }))
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'That image could not be used.'
      setFieldErrors((current) => ({ ...current, [kind]: message }))
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) {
      return
    }

    setError(null)

    const nextDisplayName = displayName.trim()
    const nextUsername = normalizeUsername(username)
    const nextBio = bio.trim()
    const nextLocation = location.trim()
    const nextWebsite = website.trim() ? normalizeWebsite(website) : ''

    const nextFieldErrors: FieldErrors = {
      displayName: validateDisplayName(nextDisplayName) ?? undefined,
      username: validateUsername(username) ?? undefined,
      bio: validateBio(nextBio) ?? undefined,
      location: validateLocation(nextLocation) ?? undefined,
      website: validateWebsite(website) ?? undefined,
    }

    setFieldErrors((current) => ({
      avatar: current.avatar,
      cover: current.cover,
      ...nextFieldErrors,
    }))

    if (
      nextFieldErrors.displayName ||
      nextFieldErrors.username ||
      nextFieldErrors.bio ||
      nextFieldErrors.location ||
      nextFieldErrors.website
    ) {
      return
    }

    setSaving(true)

    try {
      if (nextUsername !== profile.username) {
        const available = await isUsernameAvailable(nextUsername, profile.id)
        if (!available) {
          setFieldErrors((current) => ({
            ...current,
            username: 'That username is already taken.',
          }))
          return
        }
      }

      let nextAvatarUrl = avatarRemoved ? null : profile.avatar_url
      let nextCoverUrl = coverRemoved ? null : profile.cover_url

      if (avatarFile) {
        nextAvatarUrl = await uploadProfileMedia(profile.id, 'avatar', avatarFile)
      }

      if (coverFile) {
        nextCoverUrl = await uploadProfileMedia(profile.id, 'cover', coverFile)
      }

      const updated = await updateProfile(profile.id, {
        display_name: nextDisplayName,
        username: nextUsername,
        bio: nextBio || null,
        location: nextLocation || null,
        website: nextWebsite || null,
        avatar_url: nextAvatarUrl,
        cover_url: nextCoverUrl,
      })

      const staleUrls = [
        avatarFile || avatarRemoved ? profile.avatar_url : null,
        coverFile || coverRemoved ? profile.cover_url : null,
      ]

      await Promise.all(
        staleUrls.map((url) => deleteProfileMedia(profile.id, url).catch(() => undefined)),
      )

      onSaved(updated)
    } catch (caught) {
      setError(getProfileSaveError(caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title="Edit profile" size="xl" onClose={handleClose}>
      <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
        {error ? <Alert variant="error">{error}</Alert> : null}

        <div className="space-y-2">
          <p className="text-sm font-medium text-ink">Cover photo</p>
          <div className="relative overflow-hidden rounded-xl border border-border bg-surface-sunken">
            <div className="relative h-28 sm:h-36">
              {previewCover ? (
                <img
                  src={previewCover}
                  alt="Cover preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="h-full bg-gradient-to-r from-accent/35 via-accent-2/25 to-transparent"
                  aria-hidden="true"
                />
              )}
              <div className="absolute inset-0 flex items-end justify-end gap-2 bg-gradient-to-t from-black/55 to-transparent p-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={saving}
                  onClick={() => coverInputRef.current?.click()}
                >
                  <ImagePlus size={14} strokeWidth={2.25} aria-hidden="true" />
                  {previewCover ? 'Change' : 'Add cover'}
                </Button>
                {previewCover ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={saving}
                    onClick={() => {
                      setCoverFile(null)
                      setCoverRemoved(true)
                      setFieldErrors((current) => ({ ...current, cover: undefined }))
                    }}
                  >
                    <Trash2 size={14} strokeWidth={2.25} aria-hidden="true" />
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
          {fieldErrors.cover ? (
            <p role="alert" className="text-sm text-live">
              {fieldErrors.cover}
            </p>
          ) : (
            <p className="text-xs text-muted">JPG, PNG, or WebP. Up to {PROFILE_IMAGE_MAX_MB} MB.</p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-ink">Profile picture</p>
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="rounded-full ring-4 ring-surface-raised">
                <Avatar
                  displayName={displayName.trim() || profile.display_name}
                  avatarUrl={previewAvatar}
                  size="xl"
                  identityKey={profile.id}
                />
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-1 right-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white shadow-raised transition-colors hover:bg-accent-hover disabled:opacity-50"
                aria-label={previewAvatar ? 'Change profile picture' : 'Add profile picture'}
              >
                <Camera size={14} strokeWidth={2.25} aria-hidden="true" />
              </button>
            </div>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={saving}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {previewAvatar ? 'Change photo' : 'Upload photo'}
                </Button>
                {previewAvatar ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={saving}
                    onClick={() => {
                      setAvatarFile(null)
                      setAvatarRemoved(true)
                      setFieldErrors((current) => ({ ...current, avatar: undefined }))
                    }}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
              {fieldErrors.avatar ? (
                <p role="alert" className="text-sm text-live">
                  {fieldErrors.avatar}
                </p>
              ) : (
                <p className="text-xs text-muted">JPG, PNG, or WebP. Up to {PROFILE_IMAGE_MAX_MB} MB.</p>
              )}
            </div>
          </div>
        </div>

        <input
          ref={avatarInputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => pickImage('avatar', event)}
        />
        <input
          ref={coverInputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => pickImage('cover', event)}
        />

        <Input
          label="Display name"
          name="displayName"
          value={displayName}
          onChange={(event) => {
            setDisplayName(event.target.value)
            setFieldErrors((current) => ({ ...current, displayName: undefined }))
          }}
          maxLength={50}
          disabled={saving}
          error={fieldErrors.displayName}
          hint={`${displayName.trim().length}/50`}
        />

        <Input
          label="Username"
          name="username"
          value={username}
          onChange={(event) => {
            setUsername(event.target.value)
            setFieldErrors((current) => ({ ...current, username: undefined }))
          }}
          maxLength={20}
          disabled={saving}
          error={fieldErrors.username}
          hint="Letters, numbers, and underscores. 3–20 characters."
        />

        <div className="space-y-2">
          <label htmlFor="profile-bio" className="block text-sm font-medium text-ink">
            Bio
          </label>
          <textarea
            id="profile-bio"
            name="bio"
            value={bio}
            onChange={(event) => {
              setBio(event.target.value)
              setFieldErrors((current) => ({ ...current, bio: undefined }))
            }}
            disabled={saving}
            maxLength={BIO_MAX_LENGTH}
            rows={4}
            placeholder="A little about you and the music you like"
            className={cx(
              'w-full resize-y rounded-xl border bg-surface-sunken px-4 py-3',
              'text-sm leading-relaxed text-ink outline-none transition-colors duration-150',
              'placeholder:text-subtle hover:border-border-strong',
              'focus:border-accent focus:bg-surface disabled:cursor-not-allowed disabled:opacity-50',
              fieldErrors.bio ? 'border-live/70' : 'border-border',
            )}
          />
          {fieldErrors.bio ? (
            <p role="alert" className="text-sm text-live">
              {fieldErrors.bio}
            </p>
          ) : (
            <p className="flex justify-end text-xs text-muted">
              <span className="font-mono tabular-nums">
                {bio.trim().length}/{BIO_MAX_LENGTH}
              </span>
            </p>
          )}
        </div>

        <Input
          label="Location"
          name="location"
          value={location}
          onChange={(event) => {
            setLocation(event.target.value)
            setFieldErrors((current) => ({ ...current, location: undefined }))
          }}
          maxLength={LOCATION_MAX_LENGTH}
          disabled={saving}
          error={fieldErrors.location}
          hint="Optional"
          placeholder="City, country"
        />

        <Input
          label="Website"
          name="website"
          inputMode="url"
          value={website}
          onChange={(event) => {
            setWebsite(event.target.value)
            setFieldErrors((current) => ({ ...current, website: undefined }))
          }}
          disabled={saving}
          error={fieldErrors.website}
          hint="Optional"
          placeholder="https://your-site.com"
        />

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" disabled={saving} onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
