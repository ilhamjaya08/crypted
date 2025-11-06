/**
 * Wallet Manager
 * Manages multiple wallets and provides unified interface
 */

import { EVMWallet } from './chains/EVMWallet.js';

export class WalletManager {
  constructor() {
    this.wallets = new Map(); // Map<walletId, wallet>
    this.hdWallets = new Map(); // Map<seedId, { mnemonic, derivedWallets: Map<index, wallet> }>
    this.activeWalletId = null;
    this.chainTypes = {
      EVM: EVMWallet
      // Future: Add support for other chains
      // SOLANA: SolanaWallet,
      // COSMOS: CosmosWallet,
      // BITCOIN: BitcoinWallet,
    };
  }

  /**
   * Create a new wallet
   * @param {Object} config - { chainType, network, name }
   * @returns {Promise<Object>} Created wallet info
   */
  async createWallet(config) {
    try {
      const { chainType = 'EVM', network = 'mainnet', name } = config;

      // Validate chain type
      if (!this.chainTypes[chainType]) {
        throw new Error(`Unsupported chain type: ${chainType}`);
      }

      // Create wallet instance
      const WalletClass = this.chainTypes[chainType];
      const wallet = new WalletClass({ network });

      // Generate wallet
      const walletData = await wallet.generate();

      // Generate unique wallet ID
      const walletId = this.generateWalletId(walletData.address, chainType);

      // Store wallet
      this.wallets.set(walletId, {
        id: walletId,
        name: name || `Wallet ${this.wallets.size + 1}`,
        wallet,
        chainType,
        network,
        address: walletData.address,
        createdAt: new Date().toISOString()
      });

      // Set as active if it's the first wallet
      if (this.wallets.size === 1) {
        this.activeWalletId = walletId;
      }

      return {
        id: walletId,
        name: name || `Wallet ${this.wallets.size}`,
        address: walletData.address,
        chainType,
        network,
        mnemonic: walletData.mnemonic,
        privateKey: walletData.privateKey
      };
    } catch (error) {
      throw new Error(`Failed to create wallet: ${error.message}`);
    }
  }

  /**
   * Import wallet from private key
   * @param {Object} config - { chainType, network, privateKey, name }
   * @returns {Promise<Object>} Imported wallet info
   */
  async importWallet(config) {
    try {
      const { chainType = 'EVM', network = 'mainnet', privateKey, name } = config;

      if (!privateKey) {
        throw new Error('Private key is required');
      }

      // Validate chain type
      if (!this.chainTypes[chainType]) {
        throw new Error(`Unsupported chain type: ${chainType}`);
      }

      // Create wallet instance
      const WalletClass = this.chainTypes[chainType];
      const wallet = new WalletClass({ network });

      // Import wallet
      const walletData = await wallet.importFromPrivateKey(privateKey);

      // Generate unique wallet ID
      const walletId = this.generateWalletId(walletData.address, chainType);

      // Check if wallet already exists
      if (this.wallets.has(walletId)) {
        throw new Error('Wallet already exists');
      }

      // Store wallet
      this.wallets.set(walletId, {
        id: walletId,
        name: name || `Imported ${this.wallets.size + 1}`,
        wallet,
        chainType,
        network,
        address: walletData.address,
        createdAt: new Date().toISOString()
      });

      // Set as active if it's the first wallet
      if (this.wallets.size === 1) {
        this.activeWalletId = walletId;
      }

      return {
        id: walletId,
        name: name || `Imported ${this.wallets.size}`,
        address: walletData.address,
        chainType,
        network
      };
    } catch (error) {
      throw new Error(`Failed to import wallet: ${error.message}`);
    }
  }

  /**
   * Import wallet from mnemonic
   * @param {Object} config - { chainType, network, mnemonic, index, name }
   * @returns {Promise<Object>} Imported wallet info
   */
  async importFromMnemonic(config) {
    try {
      const { chainType = 'EVM', network = 'mainnet', mnemonic, index = 0, name } = config;

      if (!mnemonic) {
        throw new Error('Mnemonic is required');
      }

      // Validate chain type
      if (!this.chainTypes[chainType]) {
        throw new Error(`Unsupported chain type: ${chainType}`);
      }

      // Create wallet instance
      const WalletClass = this.chainTypes[chainType];
      const wallet = new WalletClass({ network });

      // Import wallet
      const walletData = await wallet.importFromMnemonic(mnemonic, index);

      // Generate unique wallet ID
      const walletId = this.generateWalletId(walletData.address, chainType);

      // Check if wallet already exists
      if (this.wallets.has(walletId)) {
        throw new Error('Wallet already exists');
      }

      // Store wallet
      this.wallets.set(walletId, {
        id: walletId,
        name: name || `HD Wallet ${this.wallets.size + 1}`,
        wallet,
        chainType,
        network,
        address: walletData.address,
        createdAt: new Date().toISOString()
      });

      // Set as active if it's the first wallet
      if (this.wallets.size === 1) {
        this.activeWalletId = walletId;
      }

      return {
        id: walletId,
        name: name || `HD Wallet ${this.wallets.size}`,
        address: walletData.address,
        chainType,
        network,
        derivationPath: walletData.derivationPath
      };
    } catch (error) {
      throw new Error(`Failed to import from mnemonic: ${error.message}`);
    }
  }

  /**
   * Get wallet by ID
   * @param {string} walletId - Wallet ID
   * @returns {Object} Wallet info
   */
  getWallet(walletId) {
    const walletData = this.wallets.get(walletId);
    if (!walletData) {
      throw new Error('Wallet not found');
    }
    return walletData;
  }

  /**
   * Get active wallet
   * @returns {Object} Active wallet info
   */
  getActiveWallet() {
    if (!this.activeWalletId) {
      throw new Error('No active wallet');
    }
    return this.getWallet(this.activeWalletId);
  }

  /**
   * Set active wallet
   * @param {string} walletId - Wallet ID
   * @returns {void}
   */
  setActiveWallet(walletId) {
    if (!this.wallets.has(walletId)) {
      throw new Error('Wallet not found');
    }
    this.activeWalletId = walletId;
  }

  /**
   * Create HD wallet (seed phrase based)
   * @param {Object} config - { chainType, network, name, mnemonic? }
   * @returns {Promise<Object>} Created HD wallet info
   */
  async createHDWallet(config) {
    try {
      const { chainType = 'EVM', network = 'mainnet', name, mnemonic } = config;

      // Validate chain type
      if (!this.chainTypes[chainType]) {
        throw new Error(`Unsupported chain type: ${chainType}`);
      }

      // Create wallet instance
      const WalletClass = this.chainTypes[chainType];
      const wallet = new WalletClass({ network });

      // Generate or use provided mnemonic
      let walletData;
      if (mnemonic) {
        walletData = await wallet.importFromMnemonic(mnemonic, 0);
      } else {
        walletData = await wallet.generate();
      }

      // Generate seed ID from mnemonic hash
      const seedId = this.generateSeedId(walletData.mnemonic);

      // Check if HD wallet already exists
      if (this.hdWallets.has(seedId)) {
        throw new Error('HD wallet with this mnemonic already exists');
      }

      // Store HD wallet
      this.hdWallets.set(seedId, {
        seedId,
        name: name || `HD Wallet ${this.hdWallets.size + 1}`,
        mnemonic: walletData.mnemonic,
        chainType,
        network,
        derivedWallets: new Map(),
        createdAt: new Date().toISOString()
      });

      // Add first derived wallet (index 0)
      await this.deriveWallet(seedId, 0);

      return {
        seedId,
        name: name || `HD Wallet ${this.hdWallets.size}`,
        mnemonic: walletData.mnemonic,
        chainType,
        network,
        type: 'hd'
      };
    } catch (error) {
      throw new Error(`Failed to create HD wallet: ${error.message}`);
    }
  }

  /**
   * Derive wallet from HD wallet
   * @param {string} seedId - Seed ID
   * @param {number} index - Derivation index
   * @returns {Promise<Object>} Derived wallet info
   */
  async deriveWallet(seedId, index) {
    try {
      const hdWallet = this.hdWallets.get(seedId);
      if (!hdWallet) {
        throw new Error('HD wallet not found');
      }

      // Check if already derived
      if (hdWallet.derivedWallets.has(index)) {
        throw new Error(`Wallet at index ${index} already exists`);
      }

      // Create wallet instance
      const WalletClass = this.chainTypes[hdWallet.chainType];
      const wallet = new WalletClass({ network: hdWallet.network });

      // Derive from mnemonic
      const walletData = await wallet.importFromMnemonic(hdWallet.mnemonic, index);

      // Generate wallet ID
      const walletId = this.generateWalletId(walletData.address, hdWallet.chainType);

      // Store derived wallet
      hdWallet.derivedWallets.set(index, {
        id: walletId,
        index,
        name: `${hdWallet.name} #${index}`,
        wallet,
        chainType: hdWallet.chainType,
        network: hdWallet.network,
        address: walletData.address,
        seedId,
        createdAt: new Date().toISOString()
      });

      // Also add to main wallets map for easy access
      this.wallets.set(walletId, hdWallet.derivedWallets.get(index));

      // Set as active if it's the first wallet overall
      if (this.wallets.size === 1) {
        this.activeWalletId = walletId;
      }

      return {
        id: walletId,
        index,
        address: walletData.address,
        seedId,
        type: 'derived'
      };
    } catch (error) {
      throw new Error(`Failed to derive wallet: ${error.message}`);
    }
  }

  /**
   * Create standalone private key wallet
   * @param {Object} config - { chainType, network, name, privateKey? }
   * @returns {Promise<Object>} Created wallet info
   */
  async createPrivateKeyWallet(config) {
    try {
      const { chainType = 'EVM', network = 'mainnet', name, privateKey } = config;

      // Validate chain type
      if (!this.chainTypes[chainType]) {
        throw new Error(`Unsupported chain type: ${chainType}`);
      }

      // Create wallet instance
      const WalletClass = this.chainTypes[chainType];
      const wallet = new WalletClass({ network });

      // Generate or import
      let walletData;
      if (privateKey) {
        walletData = await wallet.importFromPrivateKey(privateKey);
      } else {
        // Generate without mnemonic (random private key)
        const tempData = await wallet.generate();
        walletData = await wallet.importFromPrivateKey(tempData.privateKey);
        walletData.privateKey = tempData.privateKey;
      }

      // Generate unique wallet ID
      const walletId = this.generateWalletId(walletData.address, chainType);

      // Check if wallet already exists
      if (this.wallets.has(walletId)) {
        throw new Error('Wallet already exists');
      }

      // Store wallet
      this.wallets.set(walletId, {
        id: walletId,
        name: name || `Wallet ${this.wallets.size + 1}`,
        wallet,
        chainType,
        network,
        address: walletData.address,
        type: 'privatekey',
        createdAt: new Date().toISOString()
      });

      // Set as active if it's the first wallet
      if (this.wallets.size === 1) {
        this.activeWalletId = walletId;
      }

      return {
        id: walletId,
        name: name || `Wallet ${this.wallets.size}`,
        address: walletData.address,
        chainType,
        network,
        privateKey: walletData.privateKey,
        type: 'privatekey'
      };
    } catch (error) {
      throw new Error(`Failed to create private key wallet: ${error.message}`);
    }
  }

  /**
   * List all wallets (organized by type)
   * @returns {Object} Organized wallet lists
   */
  listWallets() {
    const hdWallets = [];
    const privateKeyWallets = [];

    // Organize HD wallets
    for (const [seedId, hdWallet] of this.hdWallets.entries()) {
      const derived = [];
      for (const [index, wallet] of hdWallet.derivedWallets.entries()) {
        derived.push({
          id: wallet.id,
          index,
          name: wallet.name,
          address: wallet.address,
          chainType: wallet.chainType,
          network: wallet.network,
          isActive: wallet.id === this.activeWalletId
        });
      }

      hdWallets.push({
        seedId,
        name: hdWallet.name,
        chainType: hdWallet.chainType,
        network: hdWallet.network,
        wallets: derived,
        createdAt: hdWallet.createdAt
      });
    }

    // Organize private key wallets
    for (const [id, wallet] of this.wallets.entries()) {
      if (wallet.type === 'privatekey') {
        privateKeyWallets.push({
          id: wallet.id,
          name: wallet.name,
          address: wallet.address,
          chainType: wallet.chainType,
          network: wallet.network,
          isActive: wallet.id === this.activeWalletId,
          createdAt: wallet.createdAt
        });
      }
    }

    return {
      hdWallets,
      privateKeyWallets,
      total: this.wallets.size
    };
  }

  /**
   * Get all derived wallets from HD wallet
   * @param {string} seedId - Seed ID
   * @returns {Array} List of derived wallets
   */
  getDerivedWallets(seedId) {
    const hdWallet = this.hdWallets.get(seedId);
    if (!hdWallet) {
      throw new Error('HD wallet not found');
    }

    return Array.from(hdWallet.derivedWallets.values()).map(w => ({
      id: w.id,
      index: w.index,
      name: w.name,
      address: w.address,
      isActive: w.id === this.activeWalletId
    }));
  }

  /**
   * Generate seed ID from mnemonic
   * @param {string} mnemonic - Mnemonic phrase
   * @returns {string} Seed ID
   */
  generateSeedId(mnemonic) {
    // Simple hash of mnemonic for seed ID
    const words = mnemonic.split(' ');
    return `seed_${words[0]}_${words[words.length - 1]}`;
  }

  /**
   * Remove wallet
   * @param {string} walletId - Wallet ID
   * @returns {boolean} Success
   */
  removeWallet(walletId) {
    if (!this.wallets.has(walletId)) {
      throw new Error('Wallet not found');
    }

    this.wallets.delete(walletId);

    // If removed wallet was active, set new active wallet
    if (this.activeWalletId === walletId) {
      const wallets = Array.from(this.wallets.keys());
      this.activeWalletId = wallets.length > 0 ? wallets[0] : null;
    }

    return true;
  }

  /**
   * Rename wallet
   * @param {string} walletId - Wallet ID
   * @param {string} newName - New name
   * @returns {Object} Updated wallet info
   */
  renameWallet(walletId, newName) {
    const walletData = this.getWallet(walletId);
    walletData.name = newName;
    return {
      id: walletData.id,
      name: walletData.name,
      address: walletData.address
    };
  }

  /**
   * Get wallet balance
   * @param {string} walletId - Wallet ID (optional, uses active wallet if not provided)
   * @returns {Promise<string>} Balance
   */
  async getBalance(walletId) {
    const walletData = walletId ? this.getWallet(walletId) : this.getActiveWallet();
    return await walletData.wallet.getBalance();
  }

  /**
   * Send transaction from wallet
   * @param {string} walletId - Wallet ID (optional, uses active wallet if not provided)
   * @param {Object} params - Transaction parameters
   * @returns {Promise<Object>} Transaction receipt
   */
  async sendTransaction(walletId, params) {
    const walletData = walletId ? this.getWallet(walletId) : this.getActiveWallet();
    return await walletData.wallet.sendTransaction(params);
  }

  /**
   * Get supported chain types
   * @returns {Array} Supported chain types
   */
  getSupportedChains() {
    return Object.keys(this.chainTypes).map(chainType => ({
      chainType,
      networks: this.getNetworksForChain(chainType)
    }));
  }

  /**
   * Get networks for specific chain type
   * @param {string} chainType - Chain type
   * @returns {Array} Networks
   */
  getNetworksForChain(chainType) {
    if (chainType === 'EVM') {
      return EVMWallet.getSupportedNetworks();
    }
    return [];
  }

  /**
   * Generate unique wallet ID
   * @param {string} address - Wallet address
   * @param {string} chainType - Chain type
   * @returns {string} Wallet ID
   */
  generateWalletId(address, chainType) {
    return `${chainType.toLowerCase()}_${address.toLowerCase()}`;
  }

  /**
   * Export wallet (without sensitive data)
   * @param {string} walletId - Wallet ID
   * @returns {Object} Wallet export
   */
  exportWallet(walletId) {
    const walletData = this.getWallet(walletId);
    return {
      id: walletData.id,
      name: walletData.name,
      chainType: walletData.chainType,
      network: walletData.network,
      address: walletData.address,
      createdAt: walletData.createdAt
    };
  }

  /**
   * Get wallet count
   * @returns {number} Number of wallets
   */
  getWalletCount() {
    return this.wallets.size;
  }

  /**
   * Clear all wallets
   * @returns {void}
   */
  clearAll() {
    this.wallets.clear();
    this.activeWalletId = null;
  }
}

export default WalletManager;
