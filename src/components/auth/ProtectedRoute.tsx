import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/contexts/AuthContext'

export function ProtectedRoute() {
  const { user, loading, isConfigured } = useAuth()
  const location = useLocation()

  if (!isConfigured) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-2xl border border-border bg-surface-raised p-6 text-center">
          <h2 className="text-xl font-semibold">Supabase not configured</h2>
          <p className="mt-3 text-sm text-muted">
            Copy <code className="text-white">.env.example</code> to{' '}
            <code className="text-white">.env</code> and add your Supabase URL and anon key.
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
