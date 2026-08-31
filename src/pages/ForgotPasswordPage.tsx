import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getAuthErrorMessage, validateEmail } from '@/lib/auth-validation'
import { getSupabaseClient } from '@/lib/supabase'

export function ForgotPasswordPage() {
  const { isConfigured } = useAuth()
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  usePageTitle('Forgot password')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccessMessage(null)

    const nextEmail = String(new FormData(event.currentTarget).get('email') ?? '')
    setEmail(nextEmail)

    const nextFieldError = validateEmail(nextEmail) ?? undefined
    setFieldError(nextFieldError)

    if (nextFieldError) {
      return
    }

    if (!isConfigured) {
      setError('Authentication is not configured yet. Check your environment variables.')
      return
    }

    setLoading(true)

    try {
      const supabase = getSupabaseClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(nextEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (resetError) {
        throw resetError
      }

      setSuccessMessage(
        'If an account exists for that email, we sent a reset link. Check your inbox and spam folder.',
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
        <h1 className="text-title">Reset your password</h1>
        <p className="text-sm text-muted">
          Enter your email and we will send you a link to choose a new password.
        </p>
      </div>

      {!isConfigured ? (
        <Alert variant="info">
          Add your Supabase credentials to <code>.env</code> before resetting a password.
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
          error={fieldError}
          disabled={loading}
          icon={<Mail size={16} strokeWidth={2.25} />}
        />

        {error ? <Alert variant="error">{error}</Alert> : null}
        {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

        <Button type="submit" formNoValidate fullWidth size="lg" disabled={loading} className="mt-2">
          {loading ? 'Sending link...' : 'Send reset link'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        Remembered your password?{' '}
        <Link
          to="/login"
          className="font-semibold text-accent transition-colors hover:text-accent-hover"
        >
          Log in
        </Link>
      </p>
    </div>
  )
}
