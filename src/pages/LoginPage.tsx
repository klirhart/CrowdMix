import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Lock, Mail } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import {
  getAuthErrorMessage,
  safeInternalPath,
  validateEmail,
  validatePassword,
} from '@/lib/auth-validation'
import { getSupabaseClient } from '@/lib/supabase'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isConfigured } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  usePageTitle('Log in')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const formData = new FormData(event.currentTarget)
    const nextEmail = String(formData.get('email') ?? '')
    const nextPassword = String(formData.get('password') ?? '')
    setEmail(nextEmail)
    setPassword(nextPassword)

    const nextFieldErrors = {
      email: validateEmail(nextEmail) ?? undefined,
      password: validatePassword(nextPassword) ?? undefined,
    }

    setFieldErrors(nextFieldErrors)

    if (nextFieldErrors.email || nextFieldErrors.password) {
      return
    }

    if (!isConfigured) {
      setError('Authentication is not configured yet. Check your environment variables.')
      return
    }

    setLoading(true)

    try {
      const supabase = getSupabaseClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: nextEmail.trim(),
        password: nextPassword,
      })

      if (signInError) {
        throw signInError
      }

      const redirectTo = safeInternalPath(
        typeof location.state === 'object' &&
          location.state !== null &&
          'from' in location.state
          ? location.state.from
          : undefined,
      )

      navigate(redirectTo, { replace: true })
    } catch (caughtError) {
      setError(getAuthErrorMessage(caughtError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-title">Welcome back</h1>
        <p className="text-sm text-muted">Log in to join the crowd.</p>
      </div>

      {!isConfigured ? (
        <Alert variant="info">
          Add your Supabase credentials to <code>.env</code> before logging in.
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
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
          disabled={loading}
          icon={<Lock size={16} strokeWidth={2.25} />}
        />

        {error ? <Alert variant="error">{error}</Alert> : null}

        <Button type="submit" formNoValidate fullWidth size="lg" disabled={loading} className="mt-2">
          {loading ? 'Logging in...' : 'Log in'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        Don&apos;t have an account?{' '}
        <Link
          to="/signup"
          className="font-semibold text-accent transition-colors hover:text-accent-hover"
        >
          Sign up
        </Link>
      </p>
    </div>
  )
}
