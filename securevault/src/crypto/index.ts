/**
 * Cryptographic utilities for VaultMaster
 * Uses Web Crypto API for secure encryption/decryption
 * All operations are local - no data sent to external services
 */

export interface EncryptedData {
  ciphertext: string
  iv: string
  salt: string
  algorithm: string
}

export interface KeyDerivationOptions {
  iterations: number
  hash: 'SHA-256' | 'SHA-384' | 'SHA-512'
  salt?: Uint8Array
}

/**
 * Generate a random salt for key derivation
 */
export async function generateSalt(length: number = 16): Promise<Uint8Array> {
  return crypto.getRandomValues(new Uint8Array(length))
}

/**
 * Generate a random initialization vector (IV)
 */
export async function generateIV(length: number = 12): Promise<Uint8Array> {
  return crypto.getRandomValues(new Uint8Array(length))
}

/**
 * Derive a cryptographic key from a master password using PBKDF2
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array,
  options: KeyDerivationOptions = {
    iterations: 100000,
    hash: 'SHA-256',
  },
): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(password)

  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: options.iterations,
      hash: options.hash,
    },
    baseKey,
    256, // 256 bits for AES-256
  )

  return crypto.subtle.importKey(
    'raw',
    derivedBits,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  )
}

/**
 * Encrypt data using AES-256-GCM
 */
export async function encryptData(
  data: string,
  key: CryptoKey,
  iv: Uint8Array,
): Promise<string> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    dataBuffer,
  )

  // Combine IV and ciphertext
  const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encryptedBuffer), iv.length)

  // Return as base64 for storage
  return btoa(String.fromCharCode(...Array.from(combined)))
}

/**
 * Decrypt data using AES-256-GCM
 */
export async function decryptData(
  encryptedDataBase64: string,
  key: CryptoKey,
  ivLength: number = 12,
): Promise<string> {
  try {
    // Decode from base64
    const binaryString = atob(encryptedDataBase64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Extract IV and ciphertext
    const iv = bytes.slice(0, ivLength)
    const ciphertext = bytes.slice(ivLength)

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      ciphertext,
    )

    const decoder = new TextDecoder()
    return decoder.decode(decryptedBuffer)
  } catch (error) {
    throw new Error('Decryption failed: Invalid password or corrupted data')
  }
}

/**
 * Hash a password using SHA-256 (for verification)
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', passwordBuffer)

  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  const passwordHash = await hashPassword(password)
  return passwordHash === hash
}

/**
 * Complete encryption flow: derive key, generate IV, encrypt data
 */
export async function encryptEntry(
  data: string,
  masterPassword: string,
  salt: Uint8Array,
): Promise<EncryptedData> {
  const iv = await generateIV()
  const key = await deriveKeyFromPassword(masterPassword, salt)
  const ciphertext = await encryptData(data, key, iv)

  return {
    ciphertext,
    iv: btoa(String.fromCharCode(...Array.from(iv))),
    salt: btoa(String.fromCharCode(...Array.from(salt))),
    algorithm: 'AES-256-GCM',
  }
}

/**
 * Complete decryption flow: derive key, decrypt data
 */
export async function decryptEntry(
  encrypted: EncryptedData,
  masterPassword: string,
): Promise<string> {
  const salt = new Uint8Array(
    atob(encrypted.salt)
      .split('')
      .map(c => c.charCodeAt(0)),
  )

  const key = await deriveKeyFromPassword(masterPassword, salt)
  return decryptData(encrypted.ciphertext, key)
}

/**
 * Generate a secure random password
 */
export function generateSecurePassword(
  length: number = 16,
  options: {
    uppercase: boolean
    lowercase: boolean
    numbers: boolean
    symbols: boolean
  } = {
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  },
): string {
  let chars = ''
  if (options.uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (options.lowercase) chars += 'abcdefghijklmnopqrstuvwxyz'
  if (options.numbers) chars += '0123456789'
  if (options.symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?'

  if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz'

  let password = ''
  const randomValues = crypto.getRandomValues(new Uint32Array(length))

  for (let i = 0; i < length; i++) {
    password += chars[randomValues[i] % chars.length]
  }

  return password
}

/**
 * Clear sensitive data from memory (best effort)
 */
export function clearSensitiveData(data: Uint8Array | string): void {
  if (data instanceof Uint8Array) {
    data.fill(0)
  }
  // String clearing is not directly possible in JS, rely on GC
}

export default {
  generateSalt,
  generateIV,
  deriveKeyFromPassword,
  encryptData,
  decryptData,
  hashPassword,
  verifyPassword,
  encryptEntry,
  decryptEntry,
  generateSecurePassword,
  clearSensitiveData,
}
