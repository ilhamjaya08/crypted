/**
 * Base Wallet Class
 * Abstract class that defines the interface for all wallet implementations
 */

export class BaseWallet {
  constructor(config = {}) {
    if (new.target === BaseWallet) {
      throw new TypeError('Cannot construct BaseWallet instances directly');
    }

    this.chainType = config.chainType || 'unknown';
    this.network = config.network || 'mainnet';
    this.address = null;
    this.privateKey = null;
    this.publicKey = null;
    this.mnemonic = null;
  }

  /**
   * Generate a new wallet
   * @returns {Promise<Object>} Wallet details
   */
  async generate() {
    throw new Error('Method generate() must be implemented');
  }

  /**
   * Import wallet from private key
   * @param {string} privateKey - Private key
   * @returns {Promise<Object>} Wallet details
   */
  async importFromPrivateKey(privateKey) {
    throw new Error('Method importFromPrivateKey() must be implemented');
  }

  /**
   * Import wallet from mnemonic phrase
   * @param {string} mnemonic - Mnemonic phrase
   * @param {number} index - Derivation path index
   * @returns {Promise<Object>} Wallet details
   */
  async importFromMnemonic(mnemonic, index = 0) {
    throw new Error('Method importFromMnemonic() must be implemented');
  }

  /**
   * Get wallet balance
   * @returns {Promise<string>} Balance in native currency
   */
  async getBalance() {
    throw new Error('Method getBalance() must be implemented');
  }

  /**
   * Get token balance
   * @param {string} tokenAddress - Token contract address
   * @returns {Promise<string>} Token balance
   */
  async getTokenBalance(tokenAddress) {
    throw new Error('Method getTokenBalance() must be implemented');
  }

  /**
   * Send transaction
   * @param {Object} params - Transaction parameters
   * @returns {Promise<Object>} Transaction receipt
   */
  async sendTransaction(params) {
    throw new Error('Method sendTransaction() must be implemented');
  }

  /**
   * Sign message
   * @param {string} message - Message to sign
   * @returns {Promise<string>} Signature
   */
  async signMessage(message) {
    throw new Error('Method signMessage() must be implemented');
  }

  /**
   * Get transaction history
   * @param {number} limit - Number of transactions to fetch
   * @returns {Promise<Array>} Transaction history
   */
  async getTransactionHistory(limit = 10) {
    throw new Error('Method getTransactionHistory() must be implemented');
  }

  /**
   * Connect to network provider
   * @param {string} rpcUrl - RPC URL
   * @returns {Promise<void>}
   */
  async connect(rpcUrl) {
    throw new Error('Method connect() must be implemented');
  }

  /**
   * Disconnect from network provider
   * @returns {Promise<void>}
   */
  async disconnect() {
    throw new Error('Method disconnect() must be implemented');
  }

  /**
   * Export wallet data (excluding sensitive data)
   * @returns {Object} Wallet information
   */
  export() {
    return {
      chainType: this.chainType,
      network: this.network,
      address: this.address,
      publicKey: this.publicKey
    };
  }

  /**
   * Export private key (use with caution!)
   * @returns {string} Private key
   */
  exportPrivateKey() {
    if (!this.privateKey) {
      throw new Error('No private key available');
    }
    return this.privateKey;
  }

  /**
   * Export mnemonic (use with caution!)
   * @returns {string} Mnemonic phrase
   */
  exportMnemonic() {
    if (!this.mnemonic) {
      throw new Error('No mnemonic available');
    }
    return this.mnemonic;
  }

  /**
   * Validate address format
   * @param {string} address - Address to validate
   * @returns {boolean} Is valid
   */
  static isValidAddress(address) {
    throw new Error('Static method isValidAddress() must be implemented');
  }

  /**
   * Get chain information
   * @returns {Object} Chain info
   */
  getChainInfo() {
    return {
      chainType: this.chainType,
      network: this.network
    };
  }
}

export default BaseWallet;
