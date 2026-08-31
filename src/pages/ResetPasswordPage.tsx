import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getAuthErrorMessage, validatePassword } from '@/lib/auth-validation'
import { getSupabaseClient } from '@/lib/supabase'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const { user, isConfigured } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  usePageTitle('Set a new password')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const formData = new FormData(event.currentTarget)
    const nextPassword = String(formData.get('password') ?? '')
    const nextConfirm = String(formData.get('confirmPassword') ?? '')
    setPassword(nextPassword)
    setConfirmPassword(nextConfirm)

    const nextFieldErrors = {
      password: validatePassword(nextPassword) ?? undefined,
      confirmPassword:
        nextConfirm !== nextPassword ? 'Passwords do not match.' : undefined,
    }

    setFieldErrors(nextFieldErrors)

    if (nextFieldErrors.password || nextFieldErrors.confirmPassword) {
      return
    }

    if (!isConfigured) {
      setError('Authentication is not configured yet. Check your environment variables.')
      return
    }

    if (!user) {
      setError('Open the reset link from your email to choose a new password.')
      return
    }

    setLoading(true)

    try {
      const supabase = getSupabaseClient()
      const { error: updateError } = await supabase.auth.updateUser({
        password: nextPassword,
      })

      if (updateError) {
        throw updateError
      }

      navigate('/home', { replace: true })
    } catch (caughtError) {
      setError(getAuthErrorMessage(caughtError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-title">Choose a new password</h1>
        <p className="text-sm text-muted">
          Enter a new password for your CrowdMix account.
        </p>
      </div>

      {!user ? (
        <Alert variant="info">
          Open the reset link from your email to continue. If the link expired, request a new one.
        </Alert>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <PasswordInput
          label="New password"
          name="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
          disabled={loading || !user}
        />

        <PasswordInput
          label="Confirm password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          error={fieldErrors.confirmPassword}
          disabled={loading || !user}
        />

        {error ? <Alert variant="error">{error}</Alert> : null}

        <Button
          type="submit"
          formNoValidate
          fullWidth
          size="lg"
          disabled={loading || !user}
          className="mt-2"
        >
          {loading ? 'Saving...' : 'Update password'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        <Link
          to="/forgot-password"
          className="font-semibold text-accent transition-colors hover:text-accent-hover"
        >
          Request a new reset link
        </Link>
      </p>
    </div>
  )
}
