// Intake gate. Decides whether an uploaded file may enter the pipeline at all. No React imports.
// The assistant explains only lab-issued digital reports. It never reads a photo: OCR can misread a digit,
// and a misread critical value would be explained as if it were normal.
export interface UploadMeta {
  name: string
  mime: string
  size: number
}

export type IntakeVerdict =
  | { ok: true }
  | { ok: false; code: 'IMAGE' | 'UNSUPPORTED_TYPE' | 'TOO_LARGE' | 'EMPTY'; reason: string }

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export function validateUpload(f: UploadMeta): IntakeVerdict {
  if (f.size <= 0) return { ok: false, code: 'EMPTY', reason: 'Empty file' }
  if (f.size > MAX_UPLOAD_BYTES) return { ok: false, code: 'TOO_LARGE', reason: 'File larger than 10 MB' }
  if (f.mime.toLowerCase().startsWith('image/')) {
    return { ok: false, code: 'IMAGE', reason: `Photo (${f.mime}): not read, values cannot be verified` }
  }
  const isPdf = f.mime.toLowerCase() === 'application/pdf' && /\.pdf$/i.test(f.name)
  if (!isPdf) return { ok: false, code: 'UNSUPPORTED_TYPE', reason: `Unsupported file type (${f.mime || 'unknown'})` }
  return { ok: true }
}
