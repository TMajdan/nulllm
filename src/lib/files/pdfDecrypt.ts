import {
  PDFArray,
  PDFBool,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFRef,
  PDFString,
  type PDFObject,
} from 'pdf-lib'
import { cbcDecryptBlocks, cbcEncrypt, createSchedule, stripPkcs7 } from '@/lib/crypto/aes'

/**
 * Removes the standard-security encryption (AES-256, V5/R5-R6) from a loaded
 * document so it can be patched and saved by pdf-lib. Everything happens in
 * memory; the derived key is never persisted.
 *
 * RC4 and AES-128 documents use per-object keys and are reported as
 * unsupported - the caller falls back to rasterizing those.
 */

const ZERO_IV = new Uint8Array(16)

export class PdfEncryptionError extends Error {
  readonly reason: 'unsupported' | 'password' | 'malformed'

  constructor(reason: 'unsupported' | 'password' | 'malformed') {
    super(reason)
    this.name = 'PdfEncryptionError'
    this.reason = reason
  }
}

export interface PdfDecryptionInfo {
  streams: number
  strings: number
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((total, part) => total + part.length, 0)
  const output = new Uint8Array(length)
  let offset = 0

  for (const part of parts) {
    output.set(part, offset)
    offset += part.length
  }

  return output
}

async function digest(algorithm: 'SHA-256' | 'SHA-384' | 'SHA-512', data: Uint8Array) {
  return new Uint8Array(await crypto.subtle.digest(algorithm, data))
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = ''
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0')
  return hex
}

function getNumber(dict: PDFDict, name: string): number | undefined {
  const value = dict.lookup(PDFName.of(name))
  return value instanceof PDFNumber ? value.asNumber() : undefined
}

function getBytes(dict: PDFDict, name: string): Uint8Array | undefined {
  const value = dict.lookup(PDFName.of(name))
  if (value instanceof PDFHexString || value instanceof PDFString) return value.asBytes()
  return undefined
}

/**
 * ISO 32000-2, Algorithm 2.B - iterative hash used by R6. R5 uses a single
 * SHA-256 and is handled by the caller.
 */
async function hashR6(
  password: Uint8Array,
  salt: Uint8Array,
  keyMaterial: Uint8Array,
): Promise<Uint8Array> {
  let key = await digest('SHA-256', concat(password, salt))

  let encrypted = new Uint8Array(0)
  let round = 0

  while (round < 64 || (encrypted.length > 0 && encrypted[encrypted.length - 1] > round - 32)) {
    const schedule = createSchedule(key.subarray(0, 16))
    const data = concat(password, key, keyMaterial)
    const padded = new Uint8Array(data.length * 64)
    for (let index = 0; index < 64; index += 1) padded.set(data, index * data.length)

    encrypted = cbcEncrypt(key.subarray(0, 16), key.subarray(16, 32), padded, schedule)

    let sum = 0
    for (let index = 0; index < 16; index += 1) sum += encrypted[index]

    const algorithm = sum % 3 === 0 ? 'SHA-256' : sum % 3 === 1 ? 'SHA-384' : 'SHA-512'
    key = await digest(algorithm, encrypted)
    round += 1
  }

  return key.subarray(0, 32)
}

async function hashPassword(
  password: Uint8Array,
  salt: Uint8Array,
  keyMaterial: Uint8Array,
  revision: number,
): Promise<Uint8Array> {
  if (revision >= 6) return hashR6(password, salt, keyMaterial)
  return digest('SHA-256', concat(password, salt))
}

function equals(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let index = 0; index < a.length; index += 1) diff |= a[index] ^ b[index]
  return diff === 0
}

interface EncryptionContext {
  fileKey: Uint8Array
  encryptMetadata: boolean
}

async function resolveFileKey(dict: PDFDict): Promise<EncryptionContext> {
  const version = getNumber(dict, 'V')
  const revision = getNumber(dict, 'R')
  const user = getBytes(dict, 'U')
  const userKey = getBytes(dict, 'UE')

  if (version !== 5 || revision === undefined || !user || !userKey) {
    throw new PdfEncryptionError('unsupported')
  }
  if (user.length < 48) throw new PdfEncryptionError('malformed')

  // Empty user password: most e-signature providers ship documents that open
  // without a prompt.
  const password = new Uint8Array(0)
  const validationSalt = user.subarray(32, 40)
  const keySalt = user.subarray(40, 48)

  const validation = await hashPassword(password, validationSalt, user.subarray(0, 48), revision)
  if (!equals(validation, user.subarray(0, 32))) {
    throw new PdfEncryptionError('password')
  }

  const keyHash = await hashPassword(password, keySalt, user.subarray(0, 48), revision)
  if (keyHash.length < 32) throw new PdfEncryptionError('malformed')

  const fileKey = cbcDecryptBlocks(keyHash, ZERO_IV, userKey)

  const encryptMetadataValue = dict.lookup(PDFName.of('EncryptMetadata'))
  const encryptMetadata =
    encryptMetadataValue instanceof PDFBool ? encryptMetadataValue.asBoolean() : true

  return { fileKey, encryptMetadata }
}

export function isEncryptedDocument(pdf: PDFDocument): boolean {
  return Boolean(pdf.context.trailerInfo.Encrypt)
}

/**
 * Decrypts every stream (and hex string) of the document in place and drops
 * the `/Encrypt` entry, so `pdf.save()` produces a regular, unencrypted file.
 */
export async function decryptPdfInPlace(pdf: PDFDocument): Promise<PdfDecryptionInfo> {
  const encryptEntry = pdf.context.trailerInfo.Encrypt
  if (!encryptEntry) return { streams: 0, strings: 0 }

  const encryptDict = pdf.context.lookup(encryptEntry)
  if (!(encryptDict instanceof PDFDict)) throw new PdfEncryptionError('malformed')

  const filter = encryptDict.lookup(PDFName.of('Filter'))
  if (filter instanceof PDFName && filter.toString() !== '/Standard') {
    throw new PdfEncryptionError('unsupported')
  }

  const { fileKey, encryptMetadata } = await resolveFileKey(encryptDict)
  const schedule = createSchedule(fileKey)

  const decryptBytes = (bytes: Uint8Array): Uint8Array | null => {
    if (bytes.length < 32 || bytes.length % 16 !== 0) return null

    try {
      const plain = cbcDecryptBlocks(fileKey, bytes.subarray(0, 16), bytes.subarray(16), schedule)
      return stripPkcs7(plain)
    } catch {
      return null
    }
  }

  let streams = 0
  let strings = 0
  const seen = new Set<PDFObject>()

  const walk = (value: PDFObject): void => {
    if (seen.has(value)) return
    seen.add(value)

    if (value instanceof PDFDict) {
      const isSignature = value.has(PDFName.of('ByteRange'))

      for (const [key, entry] of value.entries()) {
        if (entry instanceof PDFHexString) {
          // Signature dictionaries keep their raw bytes unencrypted by spec.
          if (isSignature && key.toString() === '/Contents') continue

          const decrypted = decryptBytes(entry.asBytes())
          if (!decrypted) continue

          value.set(key, PDFHexString.of(bytesToHex(decrypted)))
          strings += 1
        } else if (entry instanceof PDFDict || entry instanceof PDFArray) {
          walk(entry)
        }
      }
      return
    }

    if (value instanceof PDFArray) {
      for (let index = 0; index < value.size(); index += 1) {
        const entry = value.get(index)

        if (entry instanceof PDFHexString) {
          const decrypted = decryptBytes(entry.asBytes())
          if (!decrypted) continue

          value.set(index, PDFHexString.of(bytesToHex(decrypted)))
          strings += 1
        } else if (entry instanceof PDFDict || entry instanceof PDFArray) {
          walk(entry)
        }
      }
    }
  }

  for (const [ref, object] of pdf.context.enumerateIndirectObjects()) {
    if (encryptEntry instanceof PDFRef && ref === encryptEntry) continue

    if (object instanceof PDFRawStream) {
      const type = object.dict.lookup(PDFName.of('Type'))
      const isMetadata = type instanceof PDFName && type.toString() === '/Metadata'

      if (!(isMetadata && !encryptMetadata)) {
        const decrypted = decryptBytes(object.contents)
        if (decrypted) {
          ;(object as unknown as { contents: Uint8Array }).contents = decrypted
          streams += 1
        }
      }

      walk(object.dict)
      continue
    }

    walk(object)
  }

  pdf.context.trailerInfo.Encrypt = undefined

  return { streams, strings }
}
