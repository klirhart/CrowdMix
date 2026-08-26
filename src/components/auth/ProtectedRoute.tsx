import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { PlugZap } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/contexts/AuthContext'

export function ProtectedRoute() {
  const { user, loading, isConfigured } = useAuth()
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
            <code className="rounded bg-surface-overlay px-1.5 py-0.5 font-mono text-xs text-white">
              .env.example
            </code>{' '}
            to{' '}
            <code className="rounded bg-surface-overlay px-1.5 py-0.5 font-mono text-xs text-white">
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
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
