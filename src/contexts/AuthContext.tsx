import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { fetchProfileById } from '@/lib/profiles'
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import type { Profile } from '@/types/profile'

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  isConfigured: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const isConfigured = isSupabaseConfigured()

  const loadProfile = useCallback(async (nextUser: User | null) => {
    if (!nextUser || !isConfigured) {
      setProfile(null)
      return
    }

    try {
      const nextProfile = await fetchProfileById(nextUser.id)
      setProfile(nextProfile)
    } catch {
      setProfile(null)
    }
  }, [isConfigured])

  const refreshProfile = useCallback(async () => {
    await loadProfile(user)
  }, [loadProfile, user])

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      throw error
    }
  }, [])

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false)
      return
    }

    const supabase = getSupabaseClient()
    let active = true

    const initialize = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (!active) {
        return
      }

      if (error) {
        setSession(null)
        setUser(null)
        setProfile(null)
        setLoading(false)
        return
      }

      setSession(data.session)
      setUser(data.session?.user ?? null)
      await loadProfile(data.session?.user ?? null)

      if (active) {
        setLoading(false)
      }
    }

    void initialize()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      void loadProfile(nextSession?.user ?? null)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [isConfigured, loadProfile])

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      loading,
      isConfigured,
      refreshProfile,
      signOut,
    }),
    [user, session, profile, loading, isConfigured, refreshProfile, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
