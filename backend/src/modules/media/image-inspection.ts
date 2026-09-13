/**
 * 图片签名与尺寸解析（Phase 4-F.2）。
 *
 * 为什么不用第三方图片库：
 * - `sharp` 会引入原生依赖与构建成本（执行计划明确禁止）
 * - 上传校验只需要「签名 + 头部尺寸」，不需要解码像素
 * 因此这里用纯 Node Buffer 解析 PNG / JPEG / WebP / AVIF 头部。
 *
 * 安全前提：解析只读文件头部，任何越界/异常一律返回 null（由调用方转成稳定错误）。
 */

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const

export type SupportedImageMimeType = (typeof IMAGE_MIME_TYPES)[number]

/** object key 使用的扩展名：由最终确认的 MIME 决定（不是来自客户端 filename） */
export const IMAGE_EXTENSION_BY_MIME: Record<SupportedImageMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

/** 客户端文件名允许的扩展名 → 期望的 MIME（用于一致性校验） */
export const IMAGE_MIME_BY_EXTENSION: Record<string, SupportedImageMimeType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
export const MAX_IMAGE_PIXELS = 40_000_000

export interface ImageDimensions {
  width: number
  height: number
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff])
const ISO_BMFF_BRANDS = ['avif', 'avis']

/** 只识别 V1 允许的四种图片格式；无法识别时返回 null */
export function detectImageMimeType(buffer: Buffer | undefined | null): SupportedImageMimeType | null {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    return null
  }

  if (buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return 'image/png'
  }

  if (buffer.subarray(0, 3).equals(JPEG_SIGNATURE)) {
    return 'image/jpeg'
  }

  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp'
  }

  if (isAvif(buffer)) {
    return 'image/avif'
  }

  return null
}

/**
 * AVIF：ISO-BMFF `ftyp` box，且 major brand 或 compatible brands 中必须出现 avif / avis。
 * 只以 `ftyp` 开头不足以判定为 AVIF（可能是 HEIC / MP4 等）。
 */
function isAvif(buffer: Buffer): boolean {
  if (buffer.length < 16 || buffer.toString('ascii', 4, 8) !== 'ftyp') {
    return false
  }

  const boxSize = buffer.readUInt32BE(0)
  const boxEnd = boxSize >= 16 && boxSize <= buffer.length ? boxSize : buffer.length
  const majorBrand = buffer.toString('ascii', 8, 12)

  if (ISO_BMFF_BRANDS.includes(majorBrand)) {
    return true
  }

  for (let offset = 16; offset + 4 <= boxEnd; offset += 4) {
    if (ISO_BMFF_BRANDS.includes(buffer.toString('ascii', offset, offset + 4))) {
      return true
    }
  }

  return false
}

/** 读取图片尺寸；无法可靠解析时返回 null（绝不猜测） */
export function readImageDimensions(
  buffer: Buffer | undefined | null,
  mimeType: SupportedImageMimeType,
): ImageDimensions | null {
  if (!Buffer.isBuffer(buffer)) {
    return null
  }

  switch (mimeType) {
    case 'image/png':
      return readPngDimensions(buffer)
    case 'image/jpeg':
      return readJpegDimensions(buffer)
    case 'image/webp':
      return readWebpDimensions(buffer)
    case 'image/avif':
      return readAvifDimensions(buffer)
    default:
      return null
  }
}

function isPositive({ width, height }: ImageDimensions): boolean {
  return Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0
}

/** PNG：IHDR 必须是第一个 chunk，宽高为 big-endian u32 */
function readPngDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return null
  }

  if (buffer.toString('ascii', 12, 16) !== 'IHDR') {
    return null
  }

  const dimensions = { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }

  return isPositive(dimensions) ? dimensions : null
}

const JPEG_SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
])

/** JPEG：顺序扫描段，找到 SOFn 后读取 height/width */
function readJpegDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 4 || !buffer.subarray(0, 3).equals(JPEG_SIGNATURE)) {
    return null
  }

  let offset = 2

  while (offset + 3 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      // 段结构损坏：不猜测
      return null
    }

    // 跳过填充字节
    let markerOffset = offset + 1

    while (markerOffset < buffer.length && buffer[markerOffset] === 0xff) {
      markerOffset += 1
    }

    const marker = buffer[markerOffset]

    if (marker === undefined) {
      return null
    }

    // SOI / EOI / RSTn / TEM 没有长度字段
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset = markerOffset + 1
      continue
    }

    if (marker === 0xda) {
      // 进入压缩数据，之前没有 SOFn
      return null
    }

    if (markerOffset + 2 >= buffer.length) {
      return null
    }

    const segmentLength = buffer.readUInt16BE(markerOffset + 1)

    if (segmentLength < 2 || markerOffset + 1 + segmentLength > buffer.length) {
      return null
    }

    if (JPEG_SOF_MARKERS.has(marker)) {
      if (segmentLength < 7) {
        return null
      }

      const dimensions = {
        height: buffer.readUInt16BE(markerOffset + 4),
        width: buffer.readUInt16BE(markerOffset + 6),
      }

      return isPositive(dimensions) ? dimensions : null
    }

    offset = markerOffset + 1 + segmentLength
  }

  return null
}

/** WebP：RIFF 容器，支持 VP8X（扩展）/ VP8（有损）/ VP8L（无损） */
function readWebpDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 30 || buffer.toString('ascii', 0, 4) !== 'RIFF') {
    return null
  }

  if (buffer.toString('ascii', 8, 12) !== 'WEBP') {
    return null
  }

  const chunkType = buffer.toString('ascii', 12, 16)
  const payload = 20

  if (chunkType === 'VP8X') {
    if (buffer.length < payload + 10) {
      return null
    }

    const dimensions = {
      width: 1 + readUInt24LE(buffer, payload + 4),
      height: 1 + readUInt24LE(buffer, payload + 7),
    }

    return isPositive(dimensions) ? dimensions : null
  }

  if (chunkType === 'VP8 ') {
    if (buffer.length < payload + 10) {
      return null
    }

    // VP8 关键帧起始码：0x9d 0x01 0x2a
    if (buffer[payload + 3] !== 0x9d || buffer[payload + 4] !== 0x01 || buffer[payload + 5] !== 0x2a) {
      return null
    }

    const dimensions = {
      width: buffer.readUInt16LE(payload + 6) & 0x3fff,
      height: buffer.readUInt16LE(payload + 8) & 0x3fff,
    }

    return isPositive(dimensions) ? dimensions : null
  }

  if (chunkType === 'VP8L') {
    if (buffer.length < payload + 5 || buffer[payload] !== 0x2f) {
      return null
    }

    const bits = buffer.readUInt32LE(payload + 1)
    const dimensions = { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) }

    return isPositive(dimensions) ? dimensions : null
  }

  return null
}

/** AVIF：ISO-BMFF 盒子 meta → iprp → ipco → ispe（u32 BE 宽高） */
function readAvifDimensions(buffer: Buffer): ImageDimensions | null {
  if (!isAvif(buffer)) {
    return null
  }

  const meta = findBox(buffer, 0, buffer.length, 'meta')

  if (!meta) {
    return null
  }

  // meta 是 full box：跳过 version/flags
  const iprp = findBox(buffer, meta.contentStart + 4, meta.contentEnd, 'iprp')

  if (!iprp) {
    return null
  }

  const ipco = findBox(buffer, iprp.contentStart, iprp.contentEnd, 'ipco')

  if (!ipco) {
    return null
  }

  let offset = ipco.contentStart

  while (offset + 8 <= ipco.contentEnd) {
    const box = readBox(buffer, offset, ipco.contentEnd)

    if (!box) {
      return null
    }

    if (box.type === 'ispe') {
      if (box.contentStart + 12 > box.contentEnd) {
        return null
      }

      const dimensions = {
        width: buffer.readUInt32BE(box.contentStart + 4),
        height: buffer.readUInt32BE(box.contentStart + 8),
      }

      return isPositive(dimensions) ? dimensions : null
    }

    offset = box.end
  }

  return null
}

interface Box {
  type: string
  contentStart: number
  contentEnd: number
  end: number
}

function readBox(buffer: Buffer, start: number, limit: number): Box | null {
  if (start + 8 > limit) {
    return null
  }

  let size = buffer.readUInt32BE(start)
  let contentStart = start + 8
  const type = buffer.toString('ascii', start + 4, start + 8)

  if (size === 1) {
    if (start + 16 > limit) {
      return null
    }

    const largeSize = buffer.readBigUInt64BE(start + 8)

    if (largeSize > BigInt(Number.MAX_SAFE_INTEGER)) {
      return null
    }

    size = Number(largeSize)
    contentStart = start + 16
  }

  if (size === 0) {
    // 盒子延伸到文件末尾
    return { type, contentStart, contentEnd: limit, end: limit }
  }

  const end = start + size

  if (size < contentStart - start || end > limit || end <= start) {
    return null
  }

  return { type, contentStart, contentEnd: end, end }
}

function findBox(buffer: Buffer, start: number, limit: number, type: string): Box | null {
  let offset = start

  while (offset + 8 <= limit) {
    const box = readBox(buffer, offset, limit)

    if (!box) {
      return null
    }

    if (box.type === type) {
      return box
    }

    offset = box.end
  }

  return null
}

function readUInt24LE(buffer: Buffer, offset: number): number {
  return buffer[offset]! | (buffer[offset + 1]! << 8) | (buffer[offset + 2]! << 16)
}

/** 便捷方法：识别类型并读取尺寸；任一环节失败返回 null */
export function inspectImage(
  buffer: Buffer | undefined | null,
): { mimeType: SupportedImageMimeType; width: number; height: number } | null {
  const mimeType = detectImageMimeType(buffer)

  if (!mimeType || !buffer) {
    return null
  }

  const dimensions = readImageDimensions(buffer, mimeType)

  return dimensions ? { mimeType, width: dimensions.width, height: dimensions.height } : null
}
