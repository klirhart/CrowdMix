import { Navigate, Route, Routes } from 'react-router-dom'
import { GuestRoute } from '@/components/auth/GuestRoute'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/contexts/AuthContext'
import { CreateRoomPage } from '@/pages/CreateRoomPage'
import { HomePage } from '@/pages/HomePage'
import { JoinRoomPage } from '@/pages/JoinRoomPage'
import { LoginPage } from '@/pages/LoginPage'
import { MusicRoomPage } from '@/pages/MusicRoomPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { SignupPage } from '@/pages/SignupPage'

function RootRedirect() {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner label="Loading..." />
  }

  return <Navigate to={user ? '/home' : '/login'} replace />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<RootRedirect />} />
        <Route path="u/:username" element={<ProfilePage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="home" element={<HomePage />} />
          <Route path="create-room" element={<CreateRoomPage />} />
          <Route path="join-room" element={<JoinRoomPage />} />
          <Route path="r/:roomCode" element={<MusicRoomPage />} />
        </Route>
      </Route>

      <Route element={<GuestRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignupPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
