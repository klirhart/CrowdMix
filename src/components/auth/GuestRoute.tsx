import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/contexts/AuthContext'
import { readAuthRedirect } from '@/lib/auth-validation'

export function GuestRoute() {
  const { user, loading, isConfigured } = useAuth()
  const location = useLocation()

  if (isConfigured && loading) {
    return <LoadingSpinner label="Loading..." />
  }

  if (user) {
    return <Navigate to={readAuthRedirect(location.search, location.state)} replace />
  }

  return <Outlet />
}
