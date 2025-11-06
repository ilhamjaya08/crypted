/**
 * Authentication Manager
 * Handles master password authentication and session management
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { hashPassword, verifyPassword } from './encryption.js';

export class AuthManager {
  constructor(config = {}) {
    // Determine storage directory based on environment
    this.storageDir = this.getStorageDirectory(config);
    this.authFile = path.join(this.storageDir, 'auth.json');
    this.sessionFile = path.join(this.storageDir, '.session');
    this.isAuthenticated = false;
    this.sessionTimeout = config.sessionTimeout || 30 * 60 * 1000; // 30 minutes default
  }

  /**
   * Get storage directory based on environment
   * @param {Object} config - Configuration
   * @returns {string} Storage directory path
   */
  getStorageDirectory(config) {
    // Check if custom storage directory is provided
    if (config.storageDir) {
      return config.storageDir;
    }

    // Check environment
    const isDevelopment = process.env.NODE_ENV === 'development' ||
                         process.cwd().includes('/data/');

    if (isDevelopment) {
      // Development: use /data/crypted or ./data/crypted
      const devPath = process.cwd().includes('/data/')
        ? path.join(process.cwd(), '.crypted')
        : path.join(process.cwd(), 'data', '.crypted');
      return devPath;
    } else {
      // Production: use ~/.crypted
      return path.join(os.homedir(), '.crypted');
    }
  }

  /**
   * Initialize auth directory
   * @returns {Promise<void>}
   */
  async init() {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      await fs.chmod(this.storageDir, 0o700);
    } catch (error) {
      throw new Error(`Failed to initialize auth: ${error.message}`);
    }
  }

  /**
   * Validate password requirements
   * @param {string} password - Password to validate
   * @returns {Object} Validation result
   */
  validatePassword(password) {
    const errors = [];

    // Minimum 8 characters
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    // At least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // At least one lowercase letter
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // At least one number
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // At least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if master password is set
   * @returns {Promise<boolean>}
   */
  async hasPassword() {
    try {
      await fs.access(this.authFile);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Set master password (first time setup)
   * @param {string} password - Master password
   * @returns {Promise<void>}
   */
  async setPassword(password) {
    try {
      await this.init();

      // Validate password
      const validation = this.validatePassword(password);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      // Check if password already exists
      if (await this.hasPassword()) {
        throw new Error('Master password already set. Use changePassword to update.');
      }

      // Hash password
      const hashedPassword = hashPassword(password);

      // Store auth data
      const authData = {
        passwordHash: hashedPassword,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await fs.writeFile(this.authFile, JSON.stringify(authData, null, 2), 'utf8');
      await fs.chmod(this.authFile, 0o600);

      this.isAuthenticated = true;
      await this.createSession();
    } catch (error) {
      throw new Error(`Failed to set password: ${error.message}`);
    }
  }

  /**
   * Verify master password
   * @param {string} password - Password to verify
   * @returns {Promise<boolean>}
   */
  async verifyMasterPassword(password) {
    try {
      // Check if password is set
      if (!await this.hasPassword()) {
        throw new Error('Master password not set');
      }

      // Read auth data
      const authData = JSON.parse(await fs.readFile(this.authFile, 'utf8'));

      // Verify password
      const isValid = verifyPassword(password, authData.passwordHash);

      if (isValid) {
        this.isAuthenticated = true;
        await this.createSession();
      }

      return isValid;
    } catch (error) {
      throw new Error(`Failed to verify password: ${error.message}`);
    }
  }

  /**
   * Change master password
   * @param {string} oldPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<void>}
   */
  async changePassword(oldPassword, newPassword) {
    try {
      // Verify old password
      if (!await this.verifyMasterPassword(oldPassword)) {
        throw new Error('Invalid current password');
      }

      // Validate new password
      const validation = this.validatePassword(newPassword);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      // Hash new password
      const hashedPassword = hashPassword(newPassword);

      // Update auth data
      const authData = {
        passwordHash: hashedPassword,
        createdAt: (await this.getAuthData()).createdAt,
        updatedAt: new Date().toISOString()
      };

      await fs.writeFile(this.authFile, JSON.stringify(authData, null, 2), 'utf8');
      await fs.chmod(this.authFile, 0o600);

      await this.createSession();
    } catch (error) {
      throw new Error(`Failed to change password: ${error.message}`);
    }
  }

  /**
   * Create session
   * @returns {Promise<void>}
   */
  async createSession() {
    try {
      const sessionData = {
        authenticated: true,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.sessionTimeout
      };

      await fs.writeFile(this.sessionFile, JSON.stringify(sessionData), 'utf8');
      await fs.chmod(this.sessionFile, 0o600);
    } catch (error) {
      // Session creation failure is not critical
      console.error('Failed to create session:', error.message);
    }
  }

  /**
   * Check if session is valid
   * @returns {Promise<boolean>}
   */
  async hasValidSession() {
    try {
      const sessionData = JSON.parse(await fs.readFile(this.sessionFile, 'utf8'));

      // Check if session has expired
      if (Date.now() > sessionData.expiresAt) {
        await this.destroySession();
        return false;
      }

      // Extend session
      await this.createSession();
      this.isAuthenticated = true;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Destroy session (logout)
   * @returns {Promise<void>}
   */
  async destroySession() {
    try {
      await fs.unlink(this.sessionFile);
      this.isAuthenticated = false;
    } catch {
      // Session file might not exist
      this.isAuthenticated = false;
    }
  }

  /**
   * Lock (logout)
   * @returns {Promise<void>}
   */
  async lock() {
    await this.destroySession();
  }

  /**
   * Unlock (login)
   * @param {string} password - Master password
   * @returns {Promise<boolean>}
   */
  async unlock(password) {
    return await this.verifyMasterPassword(password);
  }

  /**
   * Get auth data
   * @returns {Promise<Object>}
   */
  async getAuthData() {
    try {
      return JSON.parse(await fs.readFile(this.authFile, 'utf8'));
    } catch (error) {
      throw new Error('Failed to read auth data');
    }
  }

  /**
   * Get password requirements for display
   * @returns {Array<string>}
   */
  static getPasswordRequirements() {
    return [
      'At least 8 characters long',
      'Contains at least one uppercase letter (A-Z)',
      'Contains at least one lowercase letter (a-z)',
      'Contains at least one number (0-9)',
      'Contains at least one special character (!@#$%^&*...)'
    ];
  }

  /**
   * Check authentication status
   * @returns {boolean}
   */
  isLocked() {
    return !this.isAuthenticated;
  }

  /**
   * Get storage directory
   * @returns {string}
   */
  getStorageDir() {
    return this.storageDir;
  }
}

export default AuthManager;
