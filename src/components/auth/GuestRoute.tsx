import { Navigate, Outlet } from 'react-router-dom'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/contexts/AuthContext'

export function GuestRoute() {
  const { user, loading, isConfigured } = useAuth()

  if (isConfigured && loading) {
    return <LoadingSpinner label="Loading..." />
  }

  if (user) {
    return <Navigate to="/home" replace />
  }

  return <Outlet />
}
