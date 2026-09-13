import type { Media, Prisma } from '@prisma/client'

/** Admin 展示用 media 视图：绝不包含 storageKey / 磁盘路径 / 任何凭证 */
export interface AdminMediaView {
  id: string
  url: string
  filename: string
  originalFilename: string | null
  mimeType: string
  size: number | null
  width: number | null
  height: number | null
  alt: string | null
  /** 来自 metadata.provider（仅驱动名，不含配置） */
  provider: string | null
  createdAt: string
  updatedAt: string
}

export function toAdminMediaView(media: Media): AdminMediaView {
  return {
    id: media.id,
    url: media.url,
    filename: media.filename,
    originalFilename: media.originalFilename,
    mimeType: media.mimeType,
    size: media.size,
    width: media.width,
    height: media.height,
    alt: media.alt,
    provider: readProvider(media.metadata),
    createdAt: media.createdAt.toISOString(),
    updatedAt: media.updatedAt.toISOString(),
  }
}

function readProvider(metadata: Prisma.JsonValue | null): string | null {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    const provider = (metadata as Record<string, unknown>).provider

    return typeof provider === 'string' ? provider : null
  }

  return null
}
