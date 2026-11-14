import { LIMITS } from '../src/journey/case'
import { parseChange } from '../src/product/product-commands'
import type { MultipartChange } from '../src/product/api-contract'
import type { AssetBytes } from './database'
import { ApiError, hash } from './security'

export const MAX_BODY_BYTES = LIMITS.caseBytes + 1024 * 1024
const MAX_JSON_BYTES = 1024 * 1024

async function boundedBody(request: Request, maximum: number): Promise<Uint8Array<ArrayBuffer>> {
  const length = request.headers.get('Content-Length')
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > maximum)) throw new ApiError(413, 'too-large', '첨부할 수 있는 크기를 넘었어요.')
  const reader = request.body?.getReader()
  if (!reader) return new Uint8Array()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maximum) { await reader.cancel(); throw new ApiError(413, 'too-large', '첨부할 수 있는 크기를 넘었어요.') }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return bytes
}

export async function readJson(request: Request): Promise<unknown> {
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new ApiError(415, 'invalid-request', 'JSON 형식으로 요청해 주세요.')
  }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await boundedBody(request, MAX_JSON_BYTES))) as unknown }
  catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(400, 'invalid-request', '요청 내용을 읽을 수 없어요.')
  }
}

export async function readChange(request: Request, caseId: string): Promise<{ change: MultipartChange; assets: AssetBytes[] }> {
  const contentType = request.headers.get('Content-Type') ?? ''
  if (!contentType.toLowerCase().startsWith('multipart/form-data;')) {
    const change = parseChange(await readJson(request))
    if (change.assets.length) throw new ApiError(400, 'invalid-request', '첨부 파일이 함께 전송되지 않았어요.')
    return { change, assets: [] }
  }
  let form: FormData
  try {
    const bytes = await boundedBody(request, MAX_BODY_BYTES)
    form = await new Response(bytes, { headers: { 'Content-Type': contentType } }).formData()
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(400, 'invalid-request', '첨부 요청을 읽을 수 없어요.')
  }
  const manifest = form.get('manifest')
  if (typeof manifest !== 'string' || new TextEncoder().encode(manifest).length > MAX_JSON_BYTES || form.getAll('manifest').length !== 1) {
    throw new ApiError(400, 'invalid-request', '첨부 목록을 확인해 주세요.')
  }
  let parsed: unknown
  try { parsed = JSON.parse(manifest) as unknown } catch { throw new ApiError(400, 'invalid-request', '첨부 목록을 읽을 수 없어요.') }
  const change = parseChange(parsed)
  const names = new Set(['manifest', ...change.assets.map(asset => `asset:${asset.id}`)])
  if ([...form.keys()].some(name => !names.has(name)) || [...form.keys()].length !== names.size) {
    throw new ApiError(400, 'invalid-request', '첨부 목록과 파일이 일치하지 않아요.')
  }
  const assets: AssetBytes[] = []
  let total = 0
  for (const item of change.assets) {
    const file = form.get(`asset:${item.id}`)
    if (!(file instanceof Blob) || file.size !== item.bytes || file.type !== item.mime) throw new ApiError(400, 'invalid-request', '첨부 파일 정보가 일치하지 않아요.')
    total += file.size
    if (total > LIMITS.caseBytes) throw new ApiError(413, 'too-large', '첨부할 수 있는 크기를 넘었어요.')
    const data = new Uint8Array(await file.arrayBuffer())
    if (hash(data) !== item.sha256 || !matchesMediaType(data, item.mime)) throw new ApiError(400, 'invalid-request', '첨부 파일 형식을 확인해 주세요.')
    assets.push({ ...item, caseId, data })
  }
  return { change, assets }
}

function matchesMediaType(data: Uint8Array, mime: string): boolean {
  const type = mime.split(';')[0].toLowerCase()
  const prefix = (...bytes: number[]) => bytes.every((byte, index) => data[index] === byte)
  const ascii = (start: number, end: number) => new TextDecoder('ascii').decode(data.subarray(start, end))
  switch (type) {
    case 'image/jpeg': return data.length >= 4 && prefix(0xff, 0xd8, 0xff) && data[data.length - 2] === 0xff && data[data.length - 1] === 0xd9
    case 'image/png': return data.length >= 33 && prefix(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a) && ascii(12, 16) === 'IHDR'
    case 'image/webp': return data.length >= 20 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP'
    case 'audio/wav': return data.length >= 44 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE'
    case 'audio/ogg': case 'video/ogg': return data.length >= 27 && ascii(0, 4) === 'OggS'
    case 'audio/webm': case 'video/webm': return data.length >= 8 && prefix(0x1a, 0x45, 0xdf, 0xa3) && ascii(0, Math.min(4096, data.length)).includes('webm')
    case 'audio/mp4': case 'video/mp4': return data.length >= 16 && ascii(4, 8) === 'ftyp'
    case 'audio/mpeg': return data.length >= 4 && (ascii(0, 3) === 'ID3' || data[0] === 0xff && (data[1] & 0xe0) === 0xe0)
    default: return false
  }
}
