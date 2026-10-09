const crypto = require('crypto');

function encryptionKey() {
  const secret = process.env.EIN_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) throw new Error('EIN encryption key is not configured');
  return crypto.createHash('sha256').update(secret).digest();
}

function encryptSensitiveValue(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

function decryptSensitiveValue(payload) {
  if (!payload) return null;
  const [iv, tag, encrypted] = payload.split('.').map((part) => Buffer.from(part, 'base64'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

module.exports = { encryptSensitiveValue, decryptSensitiveValue };
