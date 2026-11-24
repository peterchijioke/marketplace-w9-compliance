import * as crypto from 'crypto';
import { EncryptedTinPayload, TinType } from './types';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit GCM auth tag

/**
 * Derives a consistent 32-byte key from a secret string.
 */
function deriveKey(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Formats a 9-digit TIN with standard IRS masking.
 * SSN: ***-**-1234
 * EIN: **-***1234
 */
export function maskTin(rawTin: string, type: TinType = 'SSN'): string {
  const digits = rawTin.replace(/\D/g, '');
  if (digits.length !== 9) return '***-**-****';
  const last4 = digits.slice(-4);
  return type === 'EIN' ? `**-***${last4}` : `***-**-${last4}`;
}

/**
 * Encrypts a TIN using AES-256-GCM authenticated encryption.
 * Format output: ciphertext_hex:iv_hex:auth_tag_hex
 */
export function encryptTin(rawTin: string, secretKey: string, type: TinType = 'SSN'): EncryptedTinPayload {
  if (!secretKey) {
    throw new Error('Encryption secretKey is required');
  }
  const cleanTin = rawTin.replace(/\D/g, '');
  if (cleanTin.length !== 9) {
    throw new Error('TIN must contain exactly 9 numeric digits');
  }

  const key = deriveKey(secretKey);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(cleanTin, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  const encryptedString = `${encrypted}:${iv.toString('hex')}:${tag}`;
  const last4 = cleanTin.slice(-4);
  const masked = maskTin(cleanTin, type);

  return {
    encrypted: encryptedString,
    last4,
    masked,
    tinType: type,
  };
}

/**
 * Decrypts a TIN encrypted with encryptTin.
 */
export function decryptTin(encryptedString: string, secretKey: string): string {
  if (!secretKey) {
    throw new Error('Decryption secretKey is required');
  }
  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format (expected ciphertext:iv:tag)');
  }
  const [ciphertext, ivHex, tagHex] = parts;
  const key = deriveKey(secretKey);
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  if (iv.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length: expected ${IV_LENGTH} bytes`);
  }
  if (tag.length !== AUTH_TAG_LENGTH) {
    throw new Error(`Invalid auth tag length: expected ${AUTH_TAG_LENGTH} bytes`);
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
