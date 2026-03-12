import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { Logger } from '@nestjs/common';

/**
 * T-0205 — Sensitive Field Encryption Utility
 *
 * AES-256-GCM encryption for PII fields stored at rest.
 * Designed for: medical_notes, emergency_contact, guardian_phone, etc.
 *
 * Key management:
 * - ENCRYPTION_KEY env var must be a 32+ char passphrase
 * - Key derivation via scrypt (resistant to brute-force)
 * - Each encryption generates a unique IV (nonce)
 *
 * Ciphertext format: `iv:authTag:ciphertext` (all hex-encoded)
 *
 * Usage:
 * ```ts
 * const enc = new FieldEncryption(process.env.ENCRYPTION_KEY!);
 * const cipher = enc.encrypt('sensitive-value');
 * const plain  = enc.decrypt(cipher);
 * ```
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const SALT = 'ttndd-ops-field-salt'; // Static salt — key uniqueness comes from passphrase

export class FieldEncryption {
  private readonly logger = new Logger(FieldEncryption.name);
  private readonly key: Buffer;

  constructor(passphrase?: string) {
    const secret = passphrase ?? process.env.ENCRYPTION_KEY;
    if (!secret || secret.length < 16) {
      throw new Error(
        'ENCRYPTION_KEY must be set and at least 16 characters long',
      );
    }
    this.key = scryptSync(secret, SALT, KEY_LENGTH);
  }

  /**
   * Encrypt a plaintext string.
   * @returns `iv:authTag:ciphertext` hex-encoded string
   */
  encrypt(plaintext: string): string {
    if (!plaintext) return plaintext;

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypt a ciphertext string.
   * @param ciphertext `iv:authTag:encrypted` format
   * @returns original plaintext
   */
  decrypt(ciphertext: string): string {
    if (!ciphertext || !ciphertext.includes(':')) return ciphertext;

    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      this.logger.warn('Invalid ciphertext format — returning as-is');
      return ciphertext;
    }

    const ivHex = parts[0]!;
    const authTagHex = parts[1]!;
    const encryptedHex = parts[2]!;

    try {
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = createDecipheriv(ALGORITHM, this.key, iv, {
        authTagLength: AUTH_TAG_LENGTH,
      });
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      this.logger.error('Decryption failed — data may be corrupted or key mismatch');
      throw new Error('Failed to decrypt sensitive field');
    }
  }

  /**
   * Check if a string appears to be encrypted (has iv:tag:data format).
   */
  isEncrypted(value: string): boolean {
    if (!value) return false;
    const parts = value.split(':');
    return parts.length === 3 && (parts[0]?.length ?? 0) === IV_LENGTH * 2;
  }
}

/**
 * Singleton instance using process.env.ENCRYPTION_KEY.
 * Lazy-initialised to avoid startup failures when key is not needed.
 */
let _instance: FieldEncryption | null = null;

export function getFieldEncryption(): FieldEncryption {
  if (!_instance) {
    _instance = new FieldEncryption();
  }
  return _instance;
}
