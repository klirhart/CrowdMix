import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

let supabaseClient: SupabaseClient | null = null

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey)
}

export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.',
    )
  }

  if (!supabaseClient) {
    supabaseClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }

  return supabaseClient
}

export function removeAllRealtimeChannels(): void {
  if (!supabaseClient) {
    return
  }

  void supabaseClient.removeAllChannels()
}
