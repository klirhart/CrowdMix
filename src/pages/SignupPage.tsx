import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import {
  getAuthErrorMessage,
  normalizeUsername,
  validateDisplayName,
  validateEmail,
  validatePassword,
  validateUsername,
} from '@/lib/auth-validation'
import { isUsernameAvailable } from '@/lib/profiles'
import { getSupabaseClient } from '@/lib/supabase'

export function SignupPage() {
  const navigate = useNavigate()
  const { isConfigured } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string
    password?: string
    username?: string
    displayName?: string
  }>({})
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccessMessage(null)

    const normalizedUsername = normalizeUsername(username)
    const nextFieldErrors = {
      email: validateEmail(email) ?? undefined,
      password: validatePassword(password) ?? undefined,
      username: validateUsername(username) ?? undefined,
      displayName: validateDisplayName(displayName) ?? undefined,
    }

    setFieldErrors(nextFieldErrors)

    if (
      nextFieldErrors.email ||
      nextFieldErrors.password ||
      nextFieldErrors.username ||
      nextFieldErrors.displayName
    ) {
      return
    }

    if (!isConfigured) {
      setError('Authentication is not configured yet. Check your environment variables.')
      return
    }

    setLoading(true)

    try {
      const usernameTaken = !(await isUsernameAvailable(normalizedUsername))

      if (usernameTaken) {
        setFieldErrors((current) => ({
          ...current,
          username: 'That username is already taken.',
        }))
        return
      }

      const supabase = getSupabaseClient()
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            username: normalizedUsername,
            display_name: displayName.trim(),
          },
        },
      })

      if (signUpError) {
        throw signUpError
      }

      if (data.session) {
        navigate('/home', { replace: true })
        return
      }

      setSuccessMessage(
        'Account created. Check your email to confirm your address, then log in.',
      )
    } catch (caughtError) {
      setError(getAuthErrorMessage(caughtError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="text-sm text-muted">Join CrowdMix and start listening together.</p>
      </div>

      {!isConfigured ? (
        <Alert variant="info">
          Add your Supabase credentials to <code>.env</code> before signing up.
        </Alert>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors.email}
          disabled={loading}
        />

        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
          disabled={loading}
        />

        <Input
          label="Username"
          name="username"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          error={fieldErrors.username}
          disabled={loading}
          placeholder="claire"
        />

        <Input
          label="Display name"
          name="displayName"
          autoComplete="name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          error={fieldErrors.displayName}
          disabled={loading}
          placeholder="Claire"
        />

        {error ? <Alert variant="error">{error}</Alert> : null}
        {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

        <Button type="submit" fullWidth disabled={loading}>
          {loading ? 'Creating account...' : 'Sign up'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-accent hover:text-accent-hover">
          Log in
        </Link>
      </p>
    </div>
  )
}
