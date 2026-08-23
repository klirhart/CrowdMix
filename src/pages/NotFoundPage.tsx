import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-3 text-muted">This page doesn&apos;t exist.</p>
      <Link
        to="/"
        className="mt-8 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
      >
        Back to CrowdMix
      </Link>
    </div>
  )
}
