const MAX_BYTES = 10 * 1024  // 10 KB
const HALF = MAX_BYTES / 2   // 5 KB each side

/**
 * Cap a payload string to MAX_BYTES.
 * Keeps the first HALF bytes and last HALF bytes to preserve context at both ends.
 */
export function capPayload(text: string | undefined | null): string {
  if (!text) return ''
  const buf = Buffer.from(text, 'utf8')
  if (buf.byteLength <= MAX_BYTES) return text
  const first = buf.subarray(0, HALF).toString('utf8')
  const last = buf.subarray(buf.byteLength - HALF).toString('utf8')
  return `${first}\n...[truncated ${buf.byteLength - MAX_BYTES} bytes]...\n${last}`
}
