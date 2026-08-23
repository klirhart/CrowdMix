import { Link, NavLink, Outlet } from 'react-router-dom'
import { UserMenu } from '@/components/auth/UserMenu'
import { useAuth } from '@/contexts/AuthContext'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-surface-overlay text-white'
      : 'text-muted hover:bg-surface-overlay hover:text-white',
  ].join(' ')

export function AppLayout() {
  const { user, loading } = useAuth()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-lg font-bold">
              C
            </span>
            <span className="text-lg font-semibold tracking-tight">CrowdMix</span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {user ? (
              <>
                <NavLink to="/home" className={navLinkClass}>
                  Home
                </NavLink>
                <NavLink to="/create-room" className={navLinkClass}>
                  Create Room
                </NavLink>
                <NavLink to="/join-room" className={navLinkClass}>
                  Join Room
                </NavLink>
              </>
            ) : null}
          </nav>

          <div className="flex items-center gap-2">
            {loading ? (
              <span className="text-sm text-muted">...</span>
            ) : user ? (
              <UserMenu />
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-white"
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border py-6">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted sm:px-6">
          Everyone suggests. Everyone votes. The crowd decides.
        </div>
      </footer>
    </div>
  )
}
