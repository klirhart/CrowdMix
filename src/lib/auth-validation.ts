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

  if (message.includes('Supabase is not configured')) {
    return 'Authentication is not configured yet. Check your environment variables.'
  }

  return message || 'Something went wrong. Please try again.'
}
