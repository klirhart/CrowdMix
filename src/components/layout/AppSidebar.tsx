import { Link, useLocation } from 'react-router-dom'
import { BrandMark } from '@/components/layout/BrandMark'
import { SidebarRoomList } from '@/components/layout/SidebarRoomList'
import {
  buildProfileNavItem,
  isNavItemActive,
  primaryNavItems,
  type NavItem,
} from '@/components/layout/nav-items'
import { UserMenu } from '@/components/auth/UserMenu'
import { cx } from '@/components/ui/cx'
import { useAuth } from '@/contexts/AuthContext'

function isSidebarNavActive(item: NavItem, pathname: string): boolean {
  if (item.to === '/home') {
    return pathname === '/home'
  }

  return isNavItemActive(item, pathname)
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon

  return (
    <Link
      to={item.to}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5',
        'text-sm font-semibold transition-all duration-150',
        active
          ? 'bg-accent-soft text-white'
          : 'text-muted hover:bg-surface-overlay hover:text-white',
      )}
    >
      <span
        className={cx(
          'absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full transition-all duration-200',
          active ? 'bg-accent opacity-100' : 'opacity-0',
        )}
        aria-hidden="true"
      />
      <Icon
        size={18}
        strokeWidth={2.25}
        className={cx(
          'shrink-0 transition-colors',
          active ? 'text-accent' : 'text-subtle group-hover:text-white',
        )}
        aria-hidden="true"
      />
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

export function AppSidebar() {
  const { profile } = useAuth()
  const { pathname } = useLocation()

  const items = profile
    ? [...primaryNavItems, buildProfileNavItem(profile.username)]
    : primaryNavItems

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-border lg:bg-surface-sunken">
      <div className="flex h-16 items-center px-5">
        <BrandMark />
      </div>

      <nav className="flex min-h-0 flex-1 flex-col px-3 py-4" aria-label="Main">
        <div className="shrink-0 space-y-1">
          {items.map((item) => (
            <SidebarLink key={item.to} item={item} active={isSidebarNavActive(item, pathname)} />
          ))}
        </div>
        {profile ? <SidebarRoomList userId={profile.id} /> : null}
      </nav>

      <div className="border-t border-border p-3">
        <UserMenu />
        <p className="mt-3 px-2 text-xs leading-relaxed text-subtle">
          Everyone suggests. Everyone votes. The crowd decides.
        </p>
      </div>
    </aside>
  )
}
