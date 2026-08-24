const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
] as const

type EnvVar = (typeof requiredEnvVars)[number]

function getEnvVar(name: EnvVar): string | undefined {
  return import.meta.env[name]
}

/** Returns configured env values. Required vars are validated in later phases. */
export const env = {
  supabaseUrl: (getEnvVar('VITE_SUPABASE_URL') ?? '').trim(),
  supabaseAnonKey: (getEnvVar('VITE_SUPABASE_ANON_KEY') ?? '').trim(),
  youtubeApiKey: (import.meta.env.VITE_YOUTUBE_API_KEY ?? '').trim(),
  appUrl: import.meta.env.VITE_APP_URL ?? 'http://localhost:5173',
  isDev: import.meta.env.DEV,
} as const

export function getMissingEnvVars(): EnvVar[] {
  return requiredEnvVars.filter((name) => !getEnvVar(name))
}
