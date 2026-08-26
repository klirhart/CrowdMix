import { Link, Outlet } from 'react-router-dom'
import { UserMenu } from '@/components/auth/UserMenu'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { BrandMark } from '@/components/layout/BrandMark'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import { useAuth } from '@/contexts/AuthContext'

/** Shell for signed-in users: fixed sidebar on desktop, tab bar on mobile. */
function SignedInShell() {
  return (
    <div className="min-h-screen lg:pl-64">
      <AppSidebar />

      <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur-lg lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <BrandMark size="sm" />
          <UserMenu variant="compact" />
        </div>
      </header>

      {/* The tab bar grows by the home-indicator inset, so reserve it here too. */}
      <main className="pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0">
        <Outlet />
      </main>

      <MobileTabBar />
    </div>
  )
}

/** Shell for visitors: centered marketing header, no app navigation. */
function GuestShell({ showAuthActions }: { showAuthActions: boolean }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <BrandMark />

          <div className="flex items-center gap-1.5">
            {showAuthActions ? (
              <>
                <Link
                  to="/login"
                  className="rounded-xl px-3.5 py-2 text-sm font-semibold text-muted transition-colors hover:text-white"
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-raised transition-all duration-150 hover:bg-accent-hover hover:shadow-glow active:scale-[0.98]"
                >
                  Sign up
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-5 text-center text-sm text-subtle sm:px-8">
          Everyone suggests. Everyone votes. The crowd decides.
        </div>
      </footer>
    </div>
  )
}

export function AppLayout() {
  const { user, loading } = useAuth()

  if (user) {
    return <SignedInShell />
  }

  // While the session resolves, keep the guest chrome but hide the auth CTAs so
  // they don't flash for users who turn out to be signed in.
  return <GuestShell showAuthActions={!loading} />
}
