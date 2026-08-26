import { Outlet } from 'react-router-dom'
import { BrandMark } from '@/components/layout/BrandMark'

export function AuthLayout() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-12">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,_rgba(168,85,247,0.22),_transparent_60%)]"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md animate-enter">
        <div className="mb-8 flex justify-center">
          <BrandMark />
        </div>

        <div className="rounded-panel border border-border bg-surface-raised p-6 shadow-panel sm:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
