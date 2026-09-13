/**
 * Phase 4-F.2 测试 fixture（全部在内存中生成，不提交二进制文件）。
 *
 * - PNG 使用真实的 1×1 PNG（含正确 CRC），需要其它尺寸时只 patch IHDR 并重算 CRC
 * - JPEG / WebP / AVIF 构造「头部完整」的最小容器：上传校验只解析头部（不解码像素）
 */
import { Buffer } from 'node:buffer'

/** 标准 1×1 PNG（含正确 IHDR/IDAT/IEND CRC） */
export const REAL_PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
  'base64',
)

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)

  for (let index = 0; index < 256; index += 1) {
    let value = index

    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }

    table[index] = value >>> 0
  }

  return table
})()

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff

  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8)
  }

  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)

  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData), 0)

  return Buffer.concat([length, typeAndData, crc])
}

/** 构造一个结构有效（CRC 正确）的 PNG，尺寸可指定 */
export function pngImage(width: number, height: number): Buffer {
  const ihdr = Buffer.alloc(13)

  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  // 空 zlib 流，足以让容器结构自洽（不用于像素解码）
  const idat = Buffer.from([0x78, 0x9c, 0x03, 0x00, 0x00, 0x00, 0x00, 0x01])

  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

/** 把真实 1×1 PNG 的 IHDR 改成指定尺寸，并重算 CRC */
export function pngWithDimensions(width: number, height: number): Buffer {
  const buffer = Buffer.from(REAL_PNG_1X1)

  buffer.writeUInt32BE(width, 16)
  buffer.writeUInt32BE(height, 20)
  buffer.writeUInt32BE(crc32(buffer.subarray(12, 29)), 29)

  return buffer
}

/** 头部完整的 JPEG（SOI + APP0/JFIF + SOF0 + EOI）；尺寸由 SOF0 决定 */
export function jpegImage(width: number, height: number): Buffer {
  const app0 = Buffer.concat([
    Buffer.from([0xff, 0xe0, 0x00, 0x10]),
    Buffer.from('JFIF\0', 'ascii'),
    Buffer.from([0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00]),
  ])

  const sof0Payload = Buffer.alloc(15)

  sof0Payload[0] = 8 // precision
  sof0Payload.writeUInt16BE(height, 1)
  sof0Payload.writeUInt16BE(width, 3)
  sof0Payload[5] = 3 // components
  sof0Payload.set([1, 0x11, 0x00, 2, 0x11, 0x01, 3, 0x11, 0x01], 6)

  const sof0 = Buffer.concat([Buffer.from([0xff, 0xc0, 0x00, 0x11]), sof0Payload])

  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, sof0, Buffer.from([0xff, 0xd9])])
}

/** 合法 JPEG 容器（SOI + APP0/JFIF + EOI）但没有 SOFn：签名可识别、尺寸不可读 */
export function jpegWithoutDimensions(): Buffer {
  const app0 = Buffer.concat([
    Buffer.from([0xff, 0xe0, 0x00, 0x10]),
    Buffer.from('JFIF\0', 'ascii'),
    Buffer.from([0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00]),
  ])

  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, Buffer.from([0xff, 0xd9])])
}

function riffFile(chunkType: string, payload: Buffer): Buffer {
  const padding = payload.length % 2 === 1 ? Buffer.from([0x00]) : Buffer.alloc(0)
  const chunkHeader = Buffer.alloc(8)

  chunkHeader.write(chunkType, 0, 'ascii')
  chunkHeader.writeUInt32LE(payload.length, 4)

  const body = Buffer.concat([Buffer.from('WEBP', 'ascii'), chunkHeader, payload, padding])
  const riffHeader = Buffer.alloc(8)

  riffHeader.write('RIFF', 0, 'ascii')
  riffHeader.writeUInt32LE(body.length, 4)

  return Buffer.concat([riffHeader, body])
}

/** 有损 WebP（VP8 关键帧头） */
export function webpImage(width: number, height: number): Buffer {
  const payload = Buffer.alloc(10)

  payload.set([0x00, 0x00, 0x00, 0x9d, 0x01, 0x2a], 0)
  payload.writeUInt16LE(width & 0x3fff, 6)
  payload.writeUInt16LE(height & 0x3fff, 8)

  return riffFile('VP8 ', payload)
}

/** 扩展 WebP（VP8X canvas 尺寸） */
export function webpExtendedImage(width: number, height: number): Buffer {
  const payload = Buffer.alloc(10)
  const widthMinusOne = width - 1
  const heightMinusOne = height - 1

  payload[4] = widthMinusOne & 0xff
  payload[5] = (widthMinusOne >> 8) & 0xff
  payload[6] = (widthMinusOne >> 16) & 0xff
  payload[7] = heightMinusOne & 0xff
  payload[8] = (heightMinusOne >> 8) & 0xff
  payload[9] = (heightMinusOne >> 16) & 0xff

  return riffFile('VP8X', payload)
}

function isoBox(type: string, payload: Buffer): Buffer {
  const header = Buffer.alloc(8)

  header.writeUInt32BE(8 + payload.length, 0)
  header.write(type, 4, 'ascii')

  return Buffer.concat([header, payload])
}

/** AVIF：ftyp(brands...) + meta > iprp > ipco > ispe(width,height) */
export function avifImage(
  width: number,
  height: number,
  brands: readonly string[] = ['avif', 'mif1'],
): Buffer {
  const ftypPayload = Buffer.concat([
    Buffer.from(brands[0] ?? 'avif', 'ascii'),
    Buffer.from([0x00, 0x00, 0x00, 0x00]),
    ...brands.slice(1).map((brand) => Buffer.from(brand, 'ascii')),
  ])

  const ispePayload = Buffer.alloc(12)

  ispePayload.writeUInt32BE(width, 4)
  ispePayload.writeUInt32BE(height, 8)

  const ipco = isoBox('ipco', isoBox('ispe', ispePayload))
  const iprp = isoBox('iprp', ipco)
  const meta = isoBox('meta', Buffer.concat([Buffer.from([0, 0, 0, 0]), iprp]))

  return Buffer.concat([isoBox('ftyp', ftypPayload), meta])
}

/** AVIF 容器但缺少 ispe（尺寸不可解析） */
export function avifWithoutDimensions(): Buffer {
  const ftypPayload = Buffer.concat([
    Buffer.from('avif', 'ascii'),
    Buffer.from([0x00, 0x00, 0x00, 0x00]),
    Buffer.from('mif1', 'ascii'),
  ])

  return isoBox('ftyp', ftypPayload)
}

/** 把任意 buffer 补齐到指定字节数（用于文件大小边界测试） */
export function padTo(buffer: Buffer, size: number): Buffer {
  if (buffer.length >= size) {
    return buffer
  }

  return Buffer.concat([buffer, Buffer.alloc(size - buffer.length, 0)])
}

export function randomBytes(size: number): Buffer {
  const buffer = Buffer.alloc(size)

  for (let index = 0; index < size; index += 1) {
    buffer[index] = (index * 31 + 7) % 256
  }

  return buffer
}

export const SVG_TEXT = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>',
  'utf8',
)

export const GIF_BYTES = Buffer.from('GIF89a' + '\u0001\u0000\u0001\u0000', 'binary')
export const TIFF_BYTES = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00])
export const BMP_BYTES = Buffer.from('BM' + '\u0036\u0000\u0000\u0000', 'binary')
export const PDF_BYTES = Buffer.from('%PDF-1.7\n%\u00e2\u00e3\u00cf\u00d3\n', 'binary')
