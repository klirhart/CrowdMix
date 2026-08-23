import { Link, Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link to="/" className="mb-8 flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-xl font-bold">
          C
        </span>
        <span className="text-xl font-semibold tracking-tight">CrowdMix</span>
      </Link>

      <div className="w-full max-w-md rounded-2xl border border-border bg-surface-raised p-6 shadow-xl sm:p-8">
        <Outlet />
      </div>
    </div>
  )
}
