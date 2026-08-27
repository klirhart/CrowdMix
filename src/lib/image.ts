export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const PROFILE_IMAGE_MAX_MB = PROFILE_IMAGE_MAX_BYTES / (1024 * 1024)
export const PROFILE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

const typeSet = new Set<string>(PROFILE_IMAGE_TYPES)

const presets = {
  avatar: { maxWidth: 512, maxHeight: 512, quality: 0.86 },
  cover: { maxWidth: 1920, maxHeight: 640, quality: 0.82 },
} as const

export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImageValidationError'
  }
}

export type ProfileImageKind = keyof typeof presets

export function validateImageFile(file: File): void {
  if (!typeSet.has(file.type)) {
    throw new ImageValidationError('Use a JPG, PNG, or WebP image.')
  }

  if (file.size > PROFILE_IMAGE_MAX_BYTES) {
    throw new ImageValidationError(`Keep images under ${PROFILE_IMAGE_MAX_MB} MB.`)
  }
}

function fitWithin(width: number, height: number, maxWidth: number, maxHeight: number) {
  const scale = Math.min(1, maxWidth / width, maxHeight / height)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality)
  })
}

export async function processProfileImage(
  file: File,
  kind: ProfileImageKind,
): Promise<{ blob: Blob; contentType: 'image/webp' | 'image/jpeg' }> {
  validateImageFile(file)

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new ImageValidationError('That image could not be read. Try a different file.')
  }

  try {
    const preset = presets[kind]
    const size = fitWithin(bitmap.width, bitmap.height, preset.maxWidth, preset.maxHeight)
    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height

    const context = canvas.getContext('2d')
    if (!context) {
      throw new ImageValidationError('Unable to process that image right now.')
    }

    context.drawImage(bitmap, 0, 0, size.width, size.height)

    const webp = await canvasToBlob(canvas, 'image/webp', preset.quality)
    if (webp && webp.size > 0) {
      return { blob: webp, contentType: 'image/webp' }
    }

    const jpeg = await canvasToBlob(canvas, 'image/jpeg', preset.quality)
    if (!jpeg || jpeg.size === 0) {
      throw new ImageValidationError('Unable to process that image right now.')
    }

    return { blob: jpeg, contentType: 'image/jpeg' }
  } finally {
    bitmap.close()
  }
}
