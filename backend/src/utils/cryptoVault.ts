import crypto from 'crypto';
import { env } from '../config/env.js';

export interface EncryptedPayload {
  ciphertext: string; // hex
  iv: string;         // 12-byte hex (96-bit)
  authTag: string;    // 16-byte hex (128-bit)
}

// Master encryption key derived from environment or fallback secure key
function getMasterKey(): Buffer {
  const secret = process.env.EXAM_VAULT_SECRET || env.JWT_ACCESS_SECRET || 'amcec-exam-master-vault-default-key-32b!';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt arbitrary string or JSON payload using AES-256-GCM.
 * Enforces NIST SP 800-38D: 96-bit CSPRNG IV, 128-bit auth tag, and zeroed buffers.
 */
export function encryptPayload(data: string | object, customKey?: Buffer): EncryptedPayload {
  const key = customKey || getMasterKey();
  const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
  const plaintextBuffer = Buffer.from(plaintext, 'utf8');

  // 96-bit (12-byte) Initialization Vector via CSPRNG
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintextBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const result: EncryptedPayload = {
    ciphertext: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };

  // Secure Memory Hygiene: zero out plaintext buffer
  plaintextBuffer.fill(0);

  return result;
}

/**
 * Decrypt AES-256-GCM payload.
 * Throws error if ciphertext, authTag, or IV has been tampered with.
 */
export function decryptPayload<T = any>(payload: EncryptedPayload, customKey?: Buffer): T {
  const key = customKey || getMasterKey();
  const iv = Buffer.from(payload.iv, 'hex');
  const authTag = Buffer.from(payload.authTag, 'hex');
  const ciphertext = Buffer.from(payload.ciphertext, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  const plainText = decrypted.toString('utf8');

  // Secure Memory Hygiene: zero out decrypted buffer
  decrypted.fill(0);

  try {
    return JSON.parse(plainText) as T;
  } catch {
    return plainText as unknown as T;
  }
}

/**
 * Blind Indexing via HMAC-SHA256:
 * Enables high-speed exact match search in PostgreSQL without decrypting the dataset.
 */
export function generateBlindIndex(plainText: string, blindKeySecret?: string): string {
  const secret = blindKeySecret || process.env.BLIND_INDEX_KEY || 'amcec-exam-blind-index-salt-2026';
  return crypto.createHmac('sha256', secret).update(plainText.trim().toLowerCase()).digest('hex');
}

/**
 * RFC 8785 JSON Canonicalization Scheme (JCS):
 * Lexicographically sorts object keys according to UTF-16 code units and standardizes numbers.
 * Eliminates non-deterministic JSON serialization across platforms.
 */
export function canonicalizeJson(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(item => canonicalizeJson(item)).join(',') + ']';
  }

  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map(key => {
    return JSON.stringify(key) + ':' + canonicalizeJson(obj[key]);
  });

  return '{' + pairs.join(',') + '}';
}

/**
 * Cryptographic Tamper-Evident SHA-256 Digest:
 * Generates an immutable hash of canonicalized JSON.
 */
export function computeCanonicalHash(obj: any): string {
  const canonical = canonicalizeJson(obj);
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}
