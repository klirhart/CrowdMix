import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { PlugZap } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/contexts/AuthContext'
import { withAuthRedirect } from '@/lib/auth-validation'

export function ProtectedRoute() {
  const { user, profile, loading, isConfigured } = useAuth()
  const location = useLocation()

  if (!isConfigured) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
        <div className="rounded-panel border border-border bg-surface-raised p-6 text-center shadow-panel sm:p-8">
          <span
            className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent"
            aria-hidden="true"
          >
            <PlugZap size={22} strokeWidth={2} />
          </span>
          <h2 className="text-title">Supabase not configured</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Copy{' '}
            <code className="rounded bg-surface-overlay px-1.5 py-0.5 font-mono text-xs text-ink">
              .env.example
            </code>{' '}
            to{' '}
            <code className="rounded bg-surface-overlay px-1.5 py-0.5 font-mono text-xs text-ink">
              .env
            </code>{' '}
            and add your Supabase URL and anon key.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return <LoadingSpinner label="Checking your session..." />
  }

  if (!user) {
    const from = `${location.pathname}${location.search}`
    return (
      <Navigate
        to={withAuthRedirect('/login', from)}
        replace
        state={{ from }}
      />
    )
  }

  if (profile && profile.id !== user.id) {
    return <LoadingSpinner label="Checking your session..." />
  }

  return <Outlet />
}
