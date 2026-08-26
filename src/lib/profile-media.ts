import { processProfileImage, type ProfileImageKind } from '@/lib/image'
import { env } from '@/lib/env'
import { getSupabaseClient } from '@/lib/supabase'

export const PROFILE_MEDIA_BUCKET = 'profile-media'

function publicObjectPrefix(): string {
  return `${env.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${PROFILE_MEDIA_BUCKET}/`
}

export function storagePathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null
  }

  const prefix = publicObjectPrefix()
  if (!url.startsWith(prefix)) {
    return null
  }

  try {
    const path = decodeURIComponent(url.slice(prefix.length).split('?')[0] ?? '')
    return path || null
  } catch {
    return null
  }
}

export async function uploadProfileMedia(
  userId: string,
  kind: ProfileImageKind,
  file: File,
): Promise<string> {
  const { blob, contentType } = await processProfileImage(file, kind)
  const extension = contentType === 'image/webp' ? 'webp' : 'jpg'
  const path = `${userId}/${kind}-${Date.now()}.${extension}`
  const supabase = getSupabaseClient()

  const { error } = await supabase.storage.from(PROFILE_MEDIA_BUCKET).upload(path, blob, {
    contentType,
    upsert: false,
    cacheControl: '3600',
  })

  if (error) {
    throw error
  }

  const { data } = supabase.storage.from(PROFILE_MEDIA_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function deleteProfileMedia(
  userId: string,
  url: string | null | undefined,
): Promise<void> {
  const path = storagePathFromPublicUrl(url)
  if (!path || !path.startsWith(`${userId}/`)) {
    return
  }

  const supabase = getSupabaseClient()
  const { error } = await supabase.storage.from(PROFILE_MEDIA_BUCKET).remove([path])
  if (error) {
    throw error
  }
}
