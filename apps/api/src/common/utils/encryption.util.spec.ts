import { encrypt, decrypt, isEncrypted } from './encryption.util';

describe('EncryptionUtil', () => {
  const password = 'test-encryption-key-2026';

  it('should encrypt and decrypt roundtrip', () => {
    const plaintext = 'Nguyễn Văn A - COPPA protected data';
    const encrypted = encrypt(plaintext, password);
    const decrypted = decrypt(encrypted, password);
    expect(decrypted).toBe(plaintext);
  });

  it('should produce different ciphertext each time (random salt/IV)', () => {
    const plaintext = 'same data';
    const enc1 = encrypt(plaintext, password);
    const enc2 = encrypt(plaintext, password);
    expect(enc1).not.toBe(enc2);
  });

  it('should prefix encrypted values with enc:', () => {
    const encrypted = encrypt('test', password);
    expect(encrypted.startsWith('enc:')).toBe(true);
  });

  it('should detect encrypted values', () => {
    expect(isEncrypted('enc:abc123')).toBe(true);
    expect(isEncrypted('plain text')).toBe(false);
    expect(isEncrypted('')).toBe(false);
  });

  it('should fail decryption with wrong password', () => {
    const encrypted = encrypt('secret', password);
    expect(() => decrypt(encrypted, 'wrong-password')).toThrow();
  });

  it('should fail decryption of non-encrypted value', () => {
    expect(() => decrypt('not encrypted', password)).toThrow('not encrypted');
  });

  it('should handle empty string', () => {
    const encrypted = encrypt('', password);
    const decrypted = decrypt(encrypted, password);
    expect(decrypted).toBe('');
  });

  it('should handle unicode/Vietnamese text', () => {
    const text = 'Cao Đài - Hướng Đạo Sinh - Đoàn Thanh Niên';
    const encrypted = encrypt(text, password);
    expect(decrypt(encrypted, password)).toBe(text);
  });
});
