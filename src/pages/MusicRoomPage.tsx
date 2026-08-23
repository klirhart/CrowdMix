import { useParams } from 'react-router-dom'

export function MusicRoomPage() {
  const { roomCode } = useParams<{ roomCode: string }>()

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Music Room</h1>
      <p className="mt-3 text-muted">
        Room code: <span className="font-mono text-white">{roomCode ?? '—'}</span>
      </p>
      <p className="mt-3 max-w-2xl text-muted">
        The collaborative music room experience will be built in later phases.
      </p>
    </div>
  )
}
