import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getSupabaseClient } from '@/lib/supabase'

/** After a reset-email link creates a recovery session, send the user to set a new password. */
export function PasswordRecoveryRedirect() {
  const navigate = useNavigate()
  const { isConfigured } = useAuth()

  useEffect(() => {
    if (!isConfigured) {
      return
    }

    const supabase = getSupabaseClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password', { replace: true })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [isConfigured, navigate])

  return null
}
