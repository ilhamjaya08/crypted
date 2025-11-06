/**
 * Encryption utilities for wallet storage
 * Uses built-in crypto module for encryption
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;

/**
 * Derive encryption key from password
 * @param {string} password - User password
 * @param {Buffer} salt - Salt for key derivation
 * @returns {Buffer} Derived key
 */
function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt data with password
 * @param {string} data - Data to encrypt
 * @param {string} password - Encryption password
 * @returns {string} Encrypted data (base64)
 */
export function encrypt(data, password) {
  try {
    // Generate salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    // Derive key from password
    const key = deriveKey(password, salt);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt data
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get auth tag
    const tag = cipher.getAuthTag();

    // Combine: salt + iv + tag + encrypted data
    const combined = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, 'hex')
    ]);

    // Return as base64
    return combined.toString('base64');
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt data with password
 * @param {string} encryptedData - Encrypted data (base64)
 * @param {string} password - Decryption password
 * @returns {string} Decrypted data
 */
export function decrypt(encryptedData, password) {
  try {
    // Convert from base64
    const combined = Buffer.from(encryptedData, 'base64');

    // Extract salt, iv, tag, and encrypted data
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    // Derive key from password
    const key = deriveKey(password, salt);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    // Decrypt data
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Generate random password
 * @param {number} length - Password length
 * @returns {string} Random password
 */
export function generatePassword(length = 32) {
  return crypto.randomBytes(length).toString('base64').slice(0, length);
}

/**
 * Hash password for verification
 * @param {string} password - Password to hash
 * @returns {string} Hashed password
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const hash = deriveKey(password, salt);
  const combined = Buffer.concat([salt, hash]);
  return combined.toString('base64');
}

/**
 * Verify password against hash
 * @param {string} password - Password to verify
 * @param {string} hashedPassword - Hashed password
 * @returns {boolean} Is valid
 */
export function verifyPassword(password, hashedPassword) {
  try {
    const combined = Buffer.from(hashedPassword, 'base64');
    const salt = combined.subarray(0, SALT_LENGTH);
    const hash = combined.subarray(SALT_LENGTH);

    const derivedHash = deriveKey(password, salt);

    return crypto.timingSafeEqual(hash, derivedHash);
  } catch (error) {
    return false;
  }
}

export default {
  encrypt,
  decrypt,
  generatePassword,
  hashPassword,
  verifyPassword
};
