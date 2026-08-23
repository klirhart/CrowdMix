import { Link } from 'react-router-dom'

export function LandingPage() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.18),_transparent_55%)]" />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28">
        <p className="mb-4 rounded-full border border-border bg-surface-raised px-4 py-1 text-sm text-muted">
          No host. No DJ. Just the crowd.
        </p>

        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Everyone chooses the music.
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-muted">
          Create or join shared music rooms, suggest songs, vote together, and
          let the highest-voted track play next.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/create-room"
            className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Create Room
          </Link>
          <Link
            to="/join-room"
            className="rounded-xl border border-border bg-surface-raised px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-surface-overlay"
          >
            Join Room
          </Link>
          <Link
            to="/home"
            className="rounded-xl border border-border bg-surface-raised px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-surface-overlay"
          >
            Explore Rooms
          </Link>
        </div>
      </div>
    </section>
  )
}
