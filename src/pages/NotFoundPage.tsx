import { Link } from 'react-router-dom'
import { ArrowLeft, Disc3 } from 'lucide-react'
import { usePageTitle } from '@/hooks/usePageTitle'

export function NotFoundPage() {
  usePageTitle('Not found')
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-5 py-20 text-center">
      <span
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent"
        aria-hidden="true"
      >
        <Disc3 size={30} strokeWidth={1.75} />
      </span>

      <p className="mt-8 font-mono text-meta uppercase text-subtle">Error 404</p>
      <h1 className="mt-2 text-display">Track not found</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        This page doesn&apos;t exist. It may have been moved, or the link might be wrong.
      </p>

      <Link
        to="/"
        className="mt-9 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-raised transition-all duration-150 hover:bg-accent-hover hover:shadow-glow active:scale-[0.98]"
      >
        <ArrowLeft size={16} strokeWidth={2.5} aria-hidden="true" />
        Back to CrowdMix
      </Link>
    </div>
  )
}
