import { Link } from 'react-router-dom'
import { cx } from '@/components/ui/cx'
import { useAuth } from '@/contexts/AuthContext'

export const CROWDMIX_LOGO_SRC = '/assets/crowdmix-logo.png?v=2'

interface BrandMarkProps {
  /** Hides the wordmark, for collapsed or compact contexts. */
  iconOnly?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function BrandMark({ iconOnly = false, size = 'md', className = '' }: BrandMarkProps) {
  const { user } = useAuth()

  return (
    <Link
      to={user ? '/home' : '/login'}
      className={cx('group flex items-center gap-2.5', className)}
      aria-label="CrowdMix home"
    >
      <img
        src={CROWDMIX_LOGO_SRC}
        alt=""
        width={206}
        height={181}
        className={cx(
          'w-auto shrink-0 object-contain object-center',
          'transition-transform duration-200 group-hover:scale-105',
          size === 'sm' ? 'h-8' : 'h-10',
        )}
      />
      {iconOnly ? null : (
        <span
          className={cx(
            'font-extrabold tracking-tight',
            size === 'sm' ? 'text-base' : 'text-lg',
          )}
        >
          CrowdMix
        </span>
      )}
    </Link>
  )
}
