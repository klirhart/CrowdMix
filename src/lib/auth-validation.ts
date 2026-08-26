const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

export function validateEmail(email: string): string | null {
  const trimmed = email.trim()

  if (!trimmed) {
    return 'Email is required.'
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'Enter a valid email address.'
  }

  return null
}

export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Password is required.'
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters.'
  }

  return null
}

export function validateUsername(username: string): string | null {
  const trimmed = username.trim()

  if (!trimmed) {
    return 'Username is required.'
  }

  if (trimmed.length < 3 || trimmed.length > 20) {
    return 'Username must be 3–20 characters.'
  }

  if (!USERNAME_PATTERN.test(trimmed)) {
    return 'Username can only contain letters, numbers, and underscores.'
  }

  return null
}

export const BIO_MAX_LENGTH = 280
export const LOCATION_MAX_LENGTH = 80
export const WEBSITE_MAX_LENGTH = 200

export function validateDisplayName(displayName: string): string | null {
  const trimmed = displayName.trim()

  if (!trimmed) {
    return 'Display name is required.'
  }

  if (trimmed.length > 50) {
    return 'Display name must be 50 characters or fewer.'
  }

  return null
}

export function validateBio(bio: string): string | null {
  if (bio.trim().length > BIO_MAX_LENGTH) {
    return `Bio must be ${BIO_MAX_LENGTH} characters or fewer.`
  }

  return null
}

export function validateLocation(location: string): string | null {
  if (location.trim().length > LOCATION_MAX_LENGTH) {
    return `Location must be ${LOCATION_MAX_LENGTH} characters or fewer.`
  }

  return null
}

export function normalizeWebsite(website: string): string {
  const trimmed = website.trim()
  if (!trimmed) {
    return ''
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  return `https://${trimmed}`
}

export function validateWebsite(website: string): string | null {
  const trimmed = website.trim()
  if (!trimmed) {
    return null
  }

  const normalized = normalizeWebsite(trimmed)

  if (normalized.length > WEBSITE_MAX_LENGTH) {
    return `Website must be ${WEBSITE_MAX_LENGTH} characters or fewer.`
  }

  try {
    const parsed = new URL(normalized)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'Enter a valid website URL.'
    }
    if (!parsed.hostname.includes('.')) {
      return 'Enter a valid website URL.'
    }
  } catch {
    return 'Enter a valid website URL.'
  }

  return null
}

export function getAuthErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Something went wrong. Please try again.'
  }

  const message =
    'message' in error && typeof error.message === 'string' ? error.message : ''

  if (message.includes('Invalid login credentials')) {
    return 'Incorrect email or password.'
  }

  if (message.includes('User already registered')) {
    return 'An account with this email already exists.'
  }

  if (message.includes('Username is already taken')) {
    return 'That username is already taken.'
  }

  if (message.includes('Email not confirmed')) {
    return 'Please confirm your email before logging in.'
  }

  if (message.includes('Password should be at least')) {
    return 'Password must be at least 8 characters.'
  }

  if (message.includes('Unable to validate email address')) {
    return 'Enter a valid email address.'
  }

  if (/email rate limit exceeded/i.test(message)) {
    return 'Too many signup emails were sent. Please wait a few minutes and try again.'
  }

  if (message.includes('Supabase is not configured')) {
    return 'Authentication is not configured yet. Check your environment variables.'
  }

  return message || 'Something went wrong. Please try again.'
}
