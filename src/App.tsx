import { BrowserRouter } from 'react-router-dom'
import { PasswordRecoveryRedirect } from '@/components/auth/PasswordRecoveryRedirect'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AppRoutes } from '@/routes/AppRoutes'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <PasswordRecoveryRedirect />
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
