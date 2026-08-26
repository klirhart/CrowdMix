import { House, Radio, SquarePlus, User } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  shortLabel: string
  icon: typeof House
  /** Marks the item active for nested paths too, e.g. /r/:roomCode under Home. */
  matchPrefixes?: string[]
}

/**
 * Primary navigation. Targets match the existing route table exactly; the
 * profile entry is appended separately since it depends on the username.
 */
export const primaryNavItems: NavItem[] = [
  {
    to: '/home',
    label: 'Home',
    shortLabel: 'Home',
    icon: House,
    matchPrefixes: ['/r/'],
  },
  {
    to: '/create-room',
    label: 'Create Room',
    shortLabel: 'Create',
    icon: SquarePlus,
  },
  {
    to: '/join-room',
    label: 'Join Room',
    shortLabel: 'Join',
    icon: Radio,
  },
]

export function buildProfileNavItem(username: string): NavItem {
  return {
    to: `/u/${username}`,
    label: 'Profile',
    shortLabel: 'You',
    icon: User,
  }
}

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (pathname === item.to || pathname.startsWith(`${item.to}/`)) {
    return true
  }

  return (item.matchPrefixes ?? []).some((prefix) => pathname.startsWith(prefix))
}
