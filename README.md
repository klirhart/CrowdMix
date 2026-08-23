# CrowdMix

Collaborative music rooms where everyone suggests, votes, and the crowd decides what plays next.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- React Router
- Supabase (Phases 2+)

## Getting Started

```bash
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Scripts

| Command         | Description              |
| --------------- | ------------------------ |
| `npm run dev`   | Start development server |
| `npm run build` | Production build         |
| `npm run lint`  | Run oxlint               |
| `npm run preview` | Preview production build |

## Environment Variables

Copy `.env.example` to `.env` and fill in values as features are implemented:

- `VITE_SUPABASE_URL` — Supabase project URL (Phase 2)
- `VITE_SUPABASE_ANON_KEY` — Supabase anon key (Phase 2)
- `VITE_YOUTUBE_API_KEY` — YouTube Data API key (Phase 8)
- `VITE_APP_URL` — Public app URL for room links and QR codes

## Project Structure

```
src/
├── components/layout/   # App shell and auth layout
├── pages/               # Route pages
├── routes/              # React Router configuration
├── lib/                 # Utilities (env, etc.)
└── types/               # Shared TypeScript types
```

## Phase 2 — Authentication

Authentication uses Supabase Auth with a `profiles` table.

### Supabase setup

1. Create a free project at [supabase.com](https://supabase.com)
2. Run the migration in `supabase/migrations/20260823000000_create_profiles.sql` via the Supabase SQL Editor
3. Copy your project URL and anon key into `.env`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

4. Restart the dev server

### Auth features

- Email/password signup with username and display name
- Login and logout
- Automatic profile creation on signup
- Protected routes for authenticated pages
- Public profile pages at `/u/:username`

## Development Phases

Phase 2 (current): Authentication with Supabase.

Phase 1: Project setup, routing, and basic layout.
