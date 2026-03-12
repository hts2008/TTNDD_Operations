import { FieldEncryption } from './encryption.util';

describe('FieldEncryption', () => {
  const TEST_KEY = 'test-passphrase-at-least-16-chars-long';
  let enc: FieldEncryption;

  beforeAll(() => {
    enc = new FieldEncryption(TEST_KEY);
  });

  it('should encrypt and decrypt a simple string', () => {
    const plain = 'Hello sensitive data';
    const cipher = enc.encrypt(plain);
    expect(cipher).not.toBe(plain);
    expect(cipher.split(':').length).toBe(3);
    expect(enc.decrypt(cipher)).toBe(plain);
  });

  it('should produce different ciphertexts for repeated encryptions (unique IV)', () => {
    const plain = 'same-text';
    const c1 = enc.encrypt(plain);
    const c2 = enc.encrypt(plain);
    expect(c1).not.toBe(c2);
    expect(enc.decrypt(c1)).toBe(plain);
    expect(enc.decrypt(c2)).toBe(plain);
  });

  it('should handle empty/null input gracefully', () => {
    expect(enc.encrypt('')).toBe('');
    expect(enc.decrypt('')).toBe('');
  });

  it('should handle unicode correctly', () => {
    const unicode = '🔐 Mật khẩu bảo mật — Đạo Đức 信仰';
    const cipher = enc.encrypt(unicode);
    expect(enc.decrypt(cipher)).toBe(unicode);
  });

  it('should detect encrypted strings', () => {
    const cipher = enc.encrypt('test');
    expect(enc.isEncrypted(cipher)).toBe(true);
    expect(enc.isEncrypted('not-encrypted')).toBe(false);
    expect(enc.isEncrypted('')).toBe(false);
  });

  it('should fail decryption with wrong key', () => {
    const cipher = enc.encrypt('secret');
    const wrongEnc = new FieldEncryption('different-key-at-least-16-chars');
    expect(() => wrongEnc.decrypt(cipher)).toThrow('Failed to decrypt');
  });

  it('should throw if passphrase is too short', () => {
    expect(() => new FieldEncryption('short')).toThrow(
      'ENCRYPTION_KEY must be set and at least 16 characters',
    );
  });

  it('should return non-encrypted strings as-is during decrypt', () => {
    expect(enc.decrypt('just-plain-text')).toBe('just-plain-text');
  });
});
