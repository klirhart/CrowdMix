import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AtSign, IdCard, Lock, Mail } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import {
  getAuthErrorMessage,
  normalizeUsername,
  readAuthRedirect,
  validateDisplayName,
  validateEmail,
  validatePassword,
  validateUsername,
  withAuthRedirect,
} from '@/lib/auth-validation'
import { isUsernameAvailable } from '@/lib/profiles'
import { getSupabaseClient } from '@/lib/supabase'

export function SignupPage() {
  const navigate = useNavigate()
  const location = useLocation()
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

  usePageTitle('Sign up')

  const redirectTo = readAuthRedirect(location.search, location.state)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccessMessage(null)

    const formData = new FormData(event.currentTarget)
    const nextEmail = String(formData.get('email') ?? '')
    const nextPassword = String(formData.get('password') ?? '')
    const nextUsername = String(formData.get('username') ?? '')
    const nextDisplayName = String(formData.get('displayName') ?? '')
    setEmail(nextEmail)
    setPassword(nextPassword)
    setUsername(nextUsername)
    setDisplayName(nextDisplayName)

    const normalizedUsername = normalizeUsername(nextUsername)
    const nextFieldErrors = {
      email: validateEmail(nextEmail) ?? undefined,
      password: validatePassword(nextPassword) ?? undefined,
      username: validateUsername(nextUsername) ?? undefined,
      displayName: validateDisplayName(nextDisplayName) ?? undefined,
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
        email: nextEmail.trim(),
        password: nextPassword,
        options: {
          emailRedirectTo: `${window.location.origin}${redirectTo}`,
          data: {
            username: normalizedUsername,
            display_name: nextDisplayName.trim(),
          },
        },
      })

      if (signUpError) {
        throw signUpError
      }

      if (data.session) {
        navigate(redirectTo, { replace: true })
        return
      }

      setSuccessMessage(
        redirectTo.startsWith('/r/')
          ? 'Account created. Check your email to confirm your address. After you confirm, you will join the room from the invite.'
          : 'Account created. Check your email to confirm your address, then log in.',
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
        <h1 className="text-title">Create your account</h1>
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
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors.email}
          disabled={loading}
          icon={<Mail size={16} strokeWidth={2.25} />}
        />

        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
          disabled={loading}
          icon={<Lock size={16} strokeWidth={2.25} />}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Username"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            error={fieldErrors.username}
            disabled={loading}
            placeholder="claire"
            icon={<AtSign size={16} strokeWidth={2.25} />}
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
            icon={<IdCard size={16} strokeWidth={2.25} />}
          />
        </div>

        {error ? <Alert variant="error">{error}</Alert> : null}
        {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

        <Button type="submit" formNoValidate fullWidth size="lg" disabled={loading} className="mt-2">
          {loading ? 'Creating account...' : 'Sign up'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        Already have an account?{' '}
        <Link
          to={withAuthRedirect('/login', redirectTo)}
          className="font-semibold text-accent transition-colors hover:text-accent-hover"
        >
          Log in
        </Link>
      </p>
    </div>
  )
}
