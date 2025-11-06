/**
 * Storage Manager
 * Handles secure storage of wallet data
 */

import fs from 'fs/promises';
import path from 'path';
import { encrypt, decrypt } from '../utils/encryption.js';
import { AuthManager } from '../utils/AuthManager.js';

export class StorageManager {
  constructor(config = {}) {
    // Use AuthManager to determine storage directory
    this.authManager = new AuthManager(config);
    this.storageDir = this.authManager.getStorageDir();
    this.walletsDir = path.join(this.storageDir, 'wallets');
    this.configFile = path.join(this.storageDir, 'config.json');
    this.metadataFile = path.join(this.storageDir, 'wallets.json');
    this.initialized = false;
  }

  /**
   * Initialize storage directory
   * @returns {Promise<void>}
   */
  async init() {
    try {
      // Create storage directories
      await fs.mkdir(this.storageDir, { recursive: true });
      await fs.mkdir(this.walletsDir, { recursive: true });

      // Set proper permissions (owner only)
      await fs.chmod(this.storageDir, 0o700);
      await fs.chmod(this.walletsDir, 0o700);

      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize storage: ${error.message}`);
    }
  }

  /**
   * Ensure storage is initialized
   * @returns {Promise<void>}
   */
  async ensureInit() {
    if (!this.initialized) {
      await this.init();
    }
  }

  /**
   * Save wallet data
   * @param {string} walletId - Wallet ID
   * @param {Object} walletData - Wallet data
   * @param {string} password - Encryption password
   * @returns {Promise<void>}
   */
  async saveWallet(walletId, walletData, password) {
    try {
      await this.ensureInit();

      // Prepare wallet data for storage
      const walletInstance = walletData.wallet;
      const exportedPrivateKey =
        walletData.privateKey ||
        (walletInstance && typeof walletInstance.exportPrivateKey === 'function'
          ? walletInstance.exportPrivateKey()
          : null);
      const mnemonic =
        walletData.mnemonic ??
        (walletInstance && walletInstance.mnemonic ? walletInstance.mnemonic : null);

      const dataToStore = {
        id: walletData.id || walletId,
        name: walletData.name,
        chainType: walletData.chainType,
        network: walletData.network,
        address: walletData.address || (walletInstance ? walletInstance.address : null),
        createdAt: walletData.createdAt,
        type: walletData.type || null,
        // Sensitive data
        privateKey: exportedPrivateKey,
        mnemonic
      };

      // Encrypt sensitive data
      const encryptedData = encrypt(JSON.stringify(dataToStore), password);

      // Save to file
      const filePath = path.join(this.walletsDir, `${walletId}.enc`);
      await fs.writeFile(filePath, encryptedData, 'utf8');

      // Set proper permissions (owner only)
      await fs.chmod(filePath, 0o600);
    } catch (error) {
      throw new Error(`Failed to save wallet: ${error.message}`);
    }
  }

  /**
   * Load wallet data
   * @param {string} walletId - Wallet ID
   * @param {string} password - Decryption password
   * @returns {Promise<Object>} Wallet data
   */
  async loadWallet(walletId, password) {
    try {
      await this.ensureInit();

      const filePath = path.join(this.walletsDir, `${walletId}.enc`);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        throw new Error('Wallet file not found');
      }

      // Read encrypted data
      const encryptedData = await fs.readFile(filePath, 'utf8');

      // Decrypt data
      const decryptedData = decrypt(encryptedData, password);

      // Parse JSON
      const walletData = JSON.parse(decryptedData);

      return walletData;
    } catch (error) {
      throw new Error(`Failed to load wallet: ${error.message}`);
    }
  }

  /**
   * Delete wallet data
   * @param {string} walletId - Wallet ID
   * @returns {Promise<void>}
   */
  async deleteWallet(walletId) {
    try {
      await this.ensureInit();

      const filePath = path.join(this.walletsDir, `${walletId}.enc`);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        throw new Error('Wallet file not found');
      }

      // Delete file
      await fs.unlink(filePath);
    } catch (error) {
      throw new Error(`Failed to delete wallet: ${error.message}`);
    }
  }

  /**
   * List all wallet files
   * @returns {Promise<Array>} List of wallet IDs
   */
  async listWallets() {
    try {
      await this.ensureInit();

      const files = await fs.readdir(this.walletsDir);

      // Filter .enc files and extract wallet IDs
      return files
        .filter(file => file.endsWith('.enc'))
        .map(file => file.replace('.enc', ''));
    } catch (error) {
      throw new Error(`Failed to list wallets: ${error.message}`);
    }
  }

  /**
   * Check if wallet exists
   * @param {string} walletId - Wallet ID
   * @returns {Promise<boolean>} Exists
   */
  async walletExists(walletId) {
    try {
      await this.ensureInit();

      const filePath = path.join(this.walletsDir, `${walletId}.enc`);

      try {
        await fs.access(filePath);
        return true;
      } catch {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Save config
   * @param {Object} config - Configuration data
   * @returns {Promise<void>}
   */
  async saveConfig(config) {
    try {
      await this.ensureInit();

      await fs.writeFile(
        this.configFile,
        JSON.stringify(config, null, 2),
        'utf8'
      );

      await fs.chmod(this.configFile, 0o600);
    } catch (error) {
      throw new Error(`Failed to save config: ${error.message}`);
    }
  }

  /**
   * Load config
   * @returns {Promise<Object>} Configuration data
   */
  async loadConfig() {
    try {
      await this.ensureInit();

      try {
        await fs.access(this.configFile);
      } catch {
        // Return default config if file doesn't exist
        return {
          version: '0.1.0',
          activeWalletId: null,
          theme: 'default'
        };
      }

      const configData = await fs.readFile(this.configFile, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      throw new Error(`Failed to load config: ${error.message}`);
    }
  }

  /**
   * Export wallet to JSON file
   * @param {string} walletId - Wallet ID
   * @param {string} password - Decryption password
   * @param {string} outputPath - Output file path
   * @returns {Promise<void>}
   */
  async exportWallet(walletId, password, outputPath) {
    try {
      const walletData = await this.loadWallet(walletId, password);

      await fs.writeFile(
        outputPath,
        JSON.stringify(walletData, null, 2),
        'utf8'
      );

      await fs.chmod(outputPath, 0o600);
    } catch (error) {
      throw new Error(`Failed to export wallet: ${error.message}`);
    }
  }

  /**
   * Save wallet metadata
   * @param {string} walletId - Wallet ID
   * @param {Object} metadata - Wallet metadata
   * @returns {Promise<void>}
   */
  async saveWalletMetadata(walletId, metadata) {
    try {
      await this.ensureInit();

      // Load existing metadata
      let allMetadata = {};
      try {
        const data = await fs.readFile(this.metadataFile, 'utf8');
        allMetadata = JSON.parse(data);
      } catch {
        // File doesn't exist yet
      }

      // Update metadata for this wallet
      allMetadata[walletId] = {
        ...metadata,
        updatedAt: new Date().toISOString()
      };

      // Save
      await fs.writeFile(this.metadataFile, JSON.stringify(allMetadata, null, 2), 'utf8');
      await fs.chmod(this.metadataFile, 0o600);
    } catch (error) {
      throw new Error(`Failed to save wallet metadata: ${error.message}`);
    }
  }

  /**
   * Get wallet metadata
   * @param {string} walletId - Wallet ID
   * @returns {Promise<Object>}
   */
  async getWalletMetadata(walletId) {
    try {
      await this.ensureInit();

      const data = await fs.readFile(this.metadataFile, 'utf8');
      const allMetadata = JSON.parse(data);

      return allMetadata[walletId] || null;
    } catch {
      return null;
    }
  }

  /**
   * Get all wallet metadata
   * @returns {Promise<Object>}
   */
  async getAllWalletMetadata() {
    try {
      await this.ensureInit();

      const data = await fs.readFile(this.metadataFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  /**
   * Delete wallet metadata
   * @param {string} walletId - Wallet ID
   * @returns {Promise<void>}
   */
  async deleteWalletMetadata(walletId) {
    try {
      await this.ensureInit();

      const allMetadata = await this.getAllWalletMetadata();
      delete allMetadata[walletId];

      await fs.writeFile(this.metadataFile, JSON.stringify(allMetadata, null, 2), 'utf8');
    } catch (error) {
      throw new Error(`Failed to delete wallet metadata: ${error.message}`);
    }
  }

  /**
   * Get storage info
   * @returns {Promise<Object>} Storage information
   */
  async getInfo() {
    try {
      await this.ensureInit();

      const wallets = await this.listWallets();
      const metadata = await this.getAllWalletMetadata();

      return {
        storageDir: this.storageDir,
        walletsDir: this.walletsDir,
        walletCount: wallets.length,
        metadata: Object.keys(metadata).length
      };
    } catch (error) {
      throw new Error(`Failed to get storage info: ${error.message}`);
    }
  }

  /**
   * Clear all data (use with caution!)
   * @returns {Promise<void>}
   */
  async clearAll() {
    try {
      await this.ensureInit();

      // Delete all wallet files
      const wallets = await this.listWallets();

      for (const walletId of wallets) {
        await this.deleteWallet(walletId);
      }

      // Delete config file
      try {
        await fs.unlink(this.configFile);
      } catch {
        // Ignore if config doesn't exist
      }
    } catch (error) {
      throw new Error(`Failed to clear all data: ${error.message}`);
    }
  }
}

export default StorageManager;
