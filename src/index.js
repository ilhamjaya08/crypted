/**
 * Crypted - CLI Crypto Wallet
 * Main application module with authentication
 */

import { WalletManager } from './wallet/WalletManager.js';
import { StorageManager } from './wallet/storage/StorageManager.js';
import { AuthManager } from './wallet/utils/AuthManager.js';
import { PriceOracle } from './wallet/utils/PriceOracle.js';
import { EVMWallet } from './wallet/chains/EVMWallet.js';

export class CryptedWallet {
  constructor() {
    this.walletManager = new WalletManager();
    this.storageManager = new StorageManager();
    this.authManager = new AuthManager();
    this.priceOracle = new PriceOracle();
    this.initialized = false;
    this.masterPassword = null;
  }

  /**
   * Initialize the wallet application
   * @returns {Promise<void>}
   */
  async init() {
    try {
      await this.storageManager.init();
      await this.authManager.init();
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize Crypted: ${error.message}`);
    }
  }

  /**
   * Check if master password is set
   * @returns {Promise<boolean>}
   */
  async hasPassword() {
    return await this.authManager.hasPassword();
  }

  /**
   * Set master password (first time setup)
   * @param {string} password - Master password
   * @returns {Promise<void>}
   */
  async setPassword(password) {
    try {
      await this.authManager.setPassword(password);
      this.masterPassword = password;
    } catch (error) {
      throw new Error(`Failed to set password: ${error.message}`);
    }
  }

  /**
   * Unlock wallet with password
   * @param {string} password - Master password
   * @returns {Promise<boolean>}
   */
  async unlock(password) {
    try {
      const success = await this.authManager.unlock(password);
      if (success) {
        this.masterPassword = password;
        // Load wallets from storage
        await this.loadAllWallets();
      }
      return success;
    } catch (error) {
      throw new Error(`Failed to unlock: ${error.message}`);
    }
  }

  /**
   * Lock wallet (clear sensitive data)
   * @returns {Promise<void>}
   */
  async lock() {
    await this.authManager.lock();
    this.masterPassword = null;
    this.walletManager.clearAll();
  }

  /**
   * Check if wallet is locked
   * @returns {boolean}
   */
  isLocked() {
    return this.authManager.isLocked();
  }

  /**
   * Validate password requirements
   * @param {string} password - Password to validate
   * @returns {Object} Validation result
   */
  validatePassword(password) {
    return this.authManager.validatePassword(password);
  }

  /**
   * Get password requirements
   * @returns {Array<string>}
   */
  static getPasswordRequirements() {
    return AuthManager.getPasswordRequirements();
  }

  /**
   * Create HD wallet (seed phrase based)
   * @param {Object} options - { chainType, network, name }
   * @returns {Promise<Object>} Created HD wallet info
   */
  async createHDWallet(options = {}) {
    try {
      if (!this.initialized) await this.init();
      if (this.isLocked()) throw new Error('Wallet is locked');

      // Create HD wallet
      const walletInfo = await this.walletManager.createHDWallet(options);

      // Save to storage
      if (this.masterPassword) {
        const hdWallet = this.walletManager.hdWallets.get(walletInfo.seedId);
        const saveData = {
          seedId: walletInfo.seedId,
          name: walletInfo.name,
          mnemonic: walletInfo.mnemonic,
          chainType: walletInfo.chainType,
          network: walletInfo.network,
          type: 'hd',
          createdAt: hdWallet.createdAt
        };

        await this.storageManager.saveWallet(
          walletInfo.seedId,
          saveData,
          this.masterPassword
        );

        // Save metadata
        await this.storageManager.saveWalletMetadata(walletInfo.seedId, {
          type: 'hd',
          name: walletInfo.name,
          chainType: walletInfo.chainType,
          network: walletInfo.network
        });
      }

      return walletInfo;
    } catch (error) {
      throw new Error(`Failed to create HD wallet: ${error.message}`);
    }
  }

  /**
   * Create private key wallet
   * @param {Object} options - { chainType, network, name }
   * @returns {Promise<Object>} Created wallet info
   */
  async createPrivateKeyWallet(options = {}) {
    try {
      if (!this.initialized) await this.init();
      if (this.isLocked()) throw new Error('Wallet is locked');

      // Create private key wallet
      const walletInfo = await this.walletManager.createPrivateKeyWallet(options);

      // Save to storage
      if (this.masterPassword) {
        const wallet = this.walletManager.getWallet(walletInfo.id);
        const saveData = {
          id: walletInfo.id,
          name: walletInfo.name,
          privateKey: walletInfo.privateKey,
          address: walletInfo.address,
          chainType: walletInfo.chainType,
          network: walletInfo.network,
          type: 'privatekey',
          createdAt: wallet.createdAt
        };

        await this.storageManager.saveWallet(
          walletInfo.id,
          saveData,
          this.masterPassword
        );

        // Save metadata
        await this.storageManager.saveWalletMetadata(walletInfo.id, {
          type: 'privatekey',
          name: walletInfo.name,
          chainType: walletInfo.chainType,
          network: walletInfo.network
        });
      }

      return walletInfo;
    } catch (error) {
      throw new Error(`Failed to create private key wallet: ${error.message}`);
    }
  }

  /**
   * Derive new wallet from HD wallet
   * @param {string} seedId - Seed ID
   * @param {number} index - Derivation index
   * @returns {Promise<Object>} Derived wallet info
   */
  async deriveWallet(seedId, index) {
    try {
      if (this.isLocked()) throw new Error('Wallet is locked');

      const derivedInfo = await this.walletManager.deriveWallet(seedId, index);

      // Update HD wallet in storage with new derived wallet
      if (this.masterPassword) {
        const hdWallet = this.walletManager.hdWallets.get(seedId);
        const saveData = {
          seedId,
          name: hdWallet.name,
          mnemonic: hdWallet.mnemonic,
          chainType: hdWallet.chainType,
          network: hdWallet.network,
          type: 'hd',
          derivedCount: hdWallet.derivedWallets.size,
          createdAt: hdWallet.createdAt
        };

        await this.storageManager.saveWallet(
          seedId,
          saveData,
          this.masterPassword
        );
      }

      return derivedInfo;
    } catch (error) {
      throw new Error(`Failed to derive wallet: ${error.message}`);
    }
  }

  /**
   * Import HD wallet from mnemonic
   * @param {Object} options - { chainType, network, mnemonic, name, derivePaths? }
   * @returns {Promise<Object>} Imported HD wallet info
   */
  async importHDWallet(options = {}) {
    try {
      if (!this.initialized) await this.init();
      if (this.isLocked()) throw new Error('Wallet is locked');

      const { derivePaths = [0], ...config } = options;

      // Create HD wallet from mnemonic
      const walletInfo = await this.createHDWallet(config);

      // Derive additional paths if requested
      if (derivePaths.length > 1) {
        for (let i = 1; i < derivePaths.length; i++) {
          await this.deriveWallet(walletInfo.seedId, derivePaths[i]);
        }
      }

      return walletInfo;
    } catch (error) {
      throw new Error(`Failed to import HD wallet: ${error.message}`);
    }
  }

  /**
   * Import private key wallet
   * @param {Object} options - { chainType, network, privateKey, name }
   * @returns {Promise<Object>} Imported wallet info
   */
  async importPrivateKeyWallet(options = {}) {
    try {
      if (!this.initialized) await this.init();
      if (this.isLocked()) throw new Error('Wallet is locked');

      const walletInfo = await this.walletManager.importWallet(options);

      // Save to storage
      if (this.masterPassword) {
        const wallet = this.walletManager.getWallet(walletInfo.id);
        await this.storageManager.saveWallet(
          walletInfo.id,
          wallet,
          this.masterPassword
        );
      }

      return walletInfo;
    } catch (error) {
      throw new Error(`Failed to import private key wallet: ${error.message}`);
    }
  }

  /**
   * Load all wallets from storage
   * @returns {Promise<void>}
   */
  async loadAllWallets() {
    try {
      if (!this.masterPassword) {
        throw new Error('Master password not available');
      }

      const walletIds = await this.storageManager.listWallets();

      for (const walletId of walletIds) {
        try {
          const walletData = await this.storageManager.loadWallet(
            walletId,
            this.masterPassword
          );

          if (walletData.type === 'hd') {
            // Load HD wallet
            await this.walletManager.createHDWallet({
              chainType: walletData.chainType,
              network: walletData.network,
              name: walletData.name,
              mnemonic: walletData.mnemonic
            });

            // Load derived wallets if any
            if (walletData.derivedCount > 1) {
              for (let i = 1; i < walletData.derivedCount; i++) {
                await this.walletManager.deriveWallet(walletId, i);
              }
            }
          } else {
            // Load private key wallet
            await this.walletManager.importWallet({
              chainType: walletData.chainType,
              network: walletData.network,
              privateKey: walletData.privateKey,
              name: walletData.name
            });
          }
        } catch (error) {
          console.error(`Failed to load wallet ${walletId}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Failed to load wallets:', error.message);
    }
  }

  /**
   * Get all wallets (organized by type)
   * @returns {Object} Organized wallet lists
   */
  listWallets() {
    return this.walletManager.listWallets();
  }

  /**
   * Get wallet balance with USD value
   * @param {string} walletId - Wallet ID
   * @returns {Promise<Object>} Balance info
   */
  async getBalanceWithUSD(walletId) {
    try {
      const wallet = this.walletManager.getWallet(walletId);
      const balance = await this.walletManager.getBalance(walletId);

      // Get network symbol
      const networks = EVMWallet.getSupportedNetworks();
      const network = networks.find(n => n.key === wallet.network);
      const symbol = network?.symbol || 'ETH';

      // Get USD value
      const priceData = await this.priceOracle.formatBalanceWithUSD(symbol, balance);

      return {
        balance,
        symbol,
        usd: priceData.usd,
        formatted: priceData.formatted
      };
    } catch (error) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  /**
   * Get total portfolio value in USD
   * @returns {Promise<Object>} Portfolio info
   */
  async getPortfolioValue() {
    try {
      const walletList = this.listWallets();
      let totalUSD = 0;
      const details = [];

      // Process all wallets
      const allWallets = [
        ...walletList.privateKeyWallets,
        ...walletList.hdWallets.flatMap(hd => hd.wallets)
      ];

      for (const wallet of allWallets) {
        try {
          const balanceInfo = await this.getBalanceWithUSD(wallet.id);
          totalUSD += balanceInfo.usd;
          details.push({
            ...wallet,
            balance: balanceInfo
          });
        } catch (error) {
          console.error(`Failed to get balance for ${wallet.id}:`, error.message);
        }
      }

      return {
        totalUSD,
        formatted: this.priceOracle.formatPrice(totalUSD),
        walletCount: allWallets.length,
        details
      };
    } catch (error) {
      throw new Error(`Failed to get portfolio value: ${error.message}`);
    }
  }

  /**
   * Send transaction
   * @param {Object} options - { walletId, to, amount, ...params }
   * @returns {Promise<Object>} Transaction receipt
   */
  async sendTransaction(options) {
    try {
      if (this.isLocked()) throw new Error('Wallet is locked');

      const { walletId, ...params } = options;
      return await this.walletManager.sendTransaction(walletId, params);
    } catch (error) {
      throw new Error(`Failed to send transaction: ${error.message}`);
    }
  }

  /**
   * Get active wallet
   * @returns {Object} Active wallet info
   */
  getActiveWallet() {
    try {
      return this.walletManager.getActiveWallet();
    } catch (error) {
      return null;
    }
  }

  /**
   * Set active wallet
   * @param {string} walletId - Wallet ID
   * @returns {void}
   */
  setActiveWallet(walletId) {
    this.walletManager.setActiveWallet(walletId);
  }

  /**
   * Delete wallet
   * @param {string} walletId - Wallet ID or seedId
   * @returns {Promise<boolean>} Success
   */
  async deleteWallet(walletId) {
    try {
      if (this.isLocked()) throw new Error('Wallet is locked');

      // Check if it's a seed ID (HD wallet)
      if (walletId.startsWith('seed_')) {
        const hdWallet = this.walletManager.hdWallets.get(walletId);
        if (hdWallet) {
          // Remove all derived wallets
          for (const [index, wallet] of hdWallet.derivedWallets.entries()) {
            this.walletManager.removeWallet(wallet.id);
          }
          // Remove HD wallet
          this.walletManager.hdWallets.delete(walletId);
          // Remove from storage
          if (this.masterPassword) {
            await this.storageManager.deleteWallet(walletId);
          }
          return true;
        }
      }

      // Regular wallet removal
      this.walletManager.removeWallet(walletId);

      // Remove from storage
      if (this.masterPassword) {
        await this.storageManager.deleteWallet(walletId);
      }

      return true;
    } catch (error) {
      throw new Error(`Failed to delete wallet: ${error.message}`);
    }
  }

  /**
   * Get supported networks
   * @returns {Array} Supported networks
   */
  getSupportedNetworks() {
    return EVMWallet.getSupportedNetworks();
  }

  /**
   * Get application info
   * @returns {Promise<Object>} Application information
   */
  async getInfo() {
    try {
      if (!this.initialized) await this.init();

      const storageInfo = await this.storageManager.getInfo();
      const walletList = this.walletManager.listWallets();
      const hasPassword = await this.hasPassword();
      const isLocked = this.isLocked();

      return {
        version: '0.1.0',
        initialized: this.initialized,
        hasPassword,
        isLocked,
        wallets: {
          total: walletList.total,
          hd: walletList.hdWallets.length,
          privateKey: walletList.privateKeyWallets.length
        },
        storage: storageInfo,
        supportedNetworks: this.getSupportedNetworks()
      };
    } catch (error) {
      throw new Error(`Failed to get info: ${error.message}`);
    }
  }
}

export default CryptedWallet;
