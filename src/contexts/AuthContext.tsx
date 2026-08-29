import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { fetchProfileById } from '@/lib/profiles'
import { resetClientSessionState } from '@/lib/session-reset'
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import type { Profile } from '@/types/profile'

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  isConfigured: boolean
  applyProfile: (nextProfile: Profile) => void
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
  const userIdRef = useRef<string | null>(null)
  const userRef = useRef<User | null>(null)
  const profileRequestId = useRef(0)
  const activeRef = useRef(true)

  const loadProfile = useCallback(async (nextUser: User | null) => {
    const requestId = ++profileRequestId.current

    if (!nextUser || !isConfigured) {
      if (requestId === profileRequestId.current) {
        setProfile(null)
      }
      return
    }

    try {
      const nextProfile = await fetchProfileById(nextUser.id)
      if (requestId !== profileRequestId.current || !activeRef.current) {
        return
      }
      setProfile(nextProfile)
    } catch {
      if (requestId !== profileRequestId.current || !activeRef.current) {
        return
      }
      setProfile(null)
    }
  }, [isConfigured])

  const applyProfile = useCallback((nextProfile: Profile) => {
    if (userIdRef.current && nextProfile.id !== userIdRef.current) {
      return
    }
    setProfile(nextProfile)
  }, [])

  const refreshProfile = useCallback(async () => {
    await loadProfile(userRef.current)
  }, [loadProfile])

  const signOut = useCallback(async () => {
    resetClientSessionState()
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
    activeRef.current = true

    const applyAuthState = async (
      event: AuthChangeEvent | 'BOOTSTRAP',
      nextSession: Session | null,
    ) => {
      if (!activeRef.current) {
        return
      }

      const nextUser = nextSession?.user ?? null
      const nextId = nextUser?.id ?? null
      const previousId = userIdRef.current
      const identityChanged = previousId !== nextId

      setSession(nextSession)

      if (!identityChanged) {
        userRef.current = nextUser
        if (event === 'USER_UPDATED' && nextUser) {
          setUser(nextUser)
          await loadProfile(nextUser)
        }
        if (!nextUser) {
          setLoading(false)
        }
        return
      }

      profileRequestId.current += 1
      setProfile(null)
      if (previousId) {
        resetClientSessionState()
      }

      userIdRef.current = nextId
      userRef.current = nextUser
      setUser(nextUser)

      if (!nextUser) {
        setLoading(false)
        return
      }

      setLoading(true)
      await loadProfile(nextUser)
      if (activeRef.current && userIdRef.current === nextUser.id) {
        setLoading(false)
      }
    }

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!activeRef.current) {
        return
      }

      if (error) {
        userIdRef.current = null
        userRef.current = null
        setSession(null)
        setUser(null)
        setProfile(null)
        setLoading(false)
        return
      }

      void applyAuthState('BOOTSTRAP', data.session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      void applyAuthState(event, nextSession)
    })

    return () => {
      activeRef.current = false
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
      applyProfile,
      refreshProfile,
      signOut,
    }),
    [user, session, profile, loading, isConfigured, applyProfile, refreshProfile, signOut],
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
