import { Link } from 'react-router-dom'
import { ArrowRight, Compass, ListMusic, Radio, ThumbsUp, Users } from 'lucide-react'
import { cx } from '@/components/ui/cx'
import { usePageTitle } from '@/hooks/usePageTitle'

const features = [
  {
    icon: ListMusic,
    title: 'Shared queue',
    description: 'Everyone adds tracks from YouTube to one collaborative queue.',
  },
  {
    icon: ThumbsUp,
    title: 'Equal votes',
    description: 'Everyone votes equally. The highest-voted song plays next. The creator starts playback.',
  },
  {
    icon: Users,
    title: 'Live rooms',
    description: 'See who is listening and stay in sync as the queue moves.',
  },
]

export function LandingPage() {
  usePageTitle()

  return (
    <>
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-5%,_rgba(168,85,247,0.22),_transparent_58%)]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent"
          aria-hidden="true"
        />

        <div className="relative mx-auto flex max-w-5xl flex-col items-center px-5 py-20 text-center sm:px-8 sm:py-28">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-4 py-1.5 text-xs font-semibold text-muted">
            <Radio size={13} strokeWidth={2.5} className="text-accent" aria-hidden="true" />
            Crowd-voted queues. Shared playback.
          </p>

          <h1 className="max-w-3xl text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Everyone chooses <span className="text-gradient-brand">the music.</span>
          </h1>

          <p className="mt-6 max-w-xl text-balance text-lg leading-relaxed text-muted">
            Create or join shared music rooms, suggest songs, and vote together. The
            highest-voted track plays next once the creator starts playback.
          </p>

          <div className="mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              to="/create-room"
              className={cx(
                'inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3',
                'text-sm font-semibold text-white shadow-raised transition-all duration-150',
                'hover:bg-accent-hover hover:shadow-glow active:scale-[0.98]',
              )}
            >
              Create Room
              <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" />
            </Link>
            <Link
              to="/join-room"
              className={cx(
                'inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-raised px-6 py-3',
                'text-sm font-semibold text-white transition-all duration-150',
                'hover:border-border-strong hover:bg-surface-overlay active:scale-[0.98]',
              )}
            >
              <Radio size={16} strokeWidth={2.25} aria-hidden="true" />
              Join Room
            </Link>
            <Link
              to="/home"
              className={cx(
                'inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-raised px-6 py-3',
                'text-sm font-semibold text-white transition-all duration-150',
                'hover:border-border-strong hover:bg-surface-overlay active:scale-[0.98]',
              )}
            >
              <Compass size={16} strokeWidth={2.25} aria-hidden="true" />
              Explore Rooms
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-24 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon

            return (
              <div
                key={feature.title}
                className={cx(
                  'rounded-card border border-border bg-surface-raised p-5',
                  'transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-raised',
                )}
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent"
                  aria-hidden="true"
                >
                  <Icon size={18} strokeWidth={2.25} />
                </span>
                <h2 className="mt-4 text-section">{feature.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </section>
    </>
  )
}
