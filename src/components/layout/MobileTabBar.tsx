import { Link, useLocation } from 'react-router-dom'
import {
  buildProfileNavItem,
  isNavItemActive,
  primaryNavItems,
} from '@/components/layout/nav-items'
import { cx } from '@/components/ui/cx'
import { useAuth } from '@/contexts/AuthContext'

export function MobileTabBar() {
  const { profile } = useAuth()
  const { pathname } = useLocation()

  const items = profile
    ? [...primaryNavItems, buildProfileNavItem(profile.username)]
    : primaryNavItems

  return (
    <nav
      aria-label="Main"
      className={cx(
        'fixed inset-x-0 bottom-0 z-40 border-t border-border',
        'bg-surface/95 backdrop-blur-lg lg:hidden',
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <div className="mx-auto flex max-w-md items-stretch">
        {items.map((item) => {
          const active = isNavItemActive(item, pathname)
          const Icon = item.icon

          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'relative flex flex-1 flex-col items-center gap-1 px-1 pb-2 pt-2.5',
                'text-[11px] font-semibold transition-colors duration-150',
                active ? 'text-accent' : 'text-subtle hover:text-white',
              )}
            >
              <span
                className={cx(
                  'absolute inset-x-4 top-0 h-0.5 rounded-full transition-opacity duration-200',
                  active ? 'bg-accent opacity-100' : 'opacity-0',
                )}
                aria-hidden="true"
              />
              <Icon size={20} strokeWidth={2.25} aria-hidden="true" />
              <span>{item.shortLabel}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
