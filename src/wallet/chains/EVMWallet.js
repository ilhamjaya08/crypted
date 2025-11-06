/**
 * EVM Wallet Implementation
 * Supports Ethereum and EVM-compatible chains
 */

import { ethers } from 'ethers';
import { BaseWallet } from '../BaseWallet.js';

export class EVMWallet extends BaseWallet {
  constructor(config = {}) {
    super({ ...config, chainType: 'EVM' });

    this.provider = null;
    this.wallet = null;
    this.chainId = null;

    // Default RPC URLs for different networks
    this.defaultRPCs = {
      mainnet: 'https://eth.llamarpc.com',
      'eth-mainnet': 'https://eth.llamarpc.com',
      sepolia: 'https://rpc.sepolia.org',
      polygon: 'https://polygon-rpc.com',
      bsc: 'https://bsc-dataseed.binance.org',
      arbitrum: 'https://arb1.arbitrum.io/rpc',
      optimism: 'https://mainnet.optimism.io',
      'optimism-mainnet': 'https://mainnet.optimism.io',
      base: 'https://mainnet.base.org',
      'base-mainnet': 'https://mainnet.base.org'
    };
  }

  /**
   * Generate a new wallet
   * @returns {Promise<Object>} Wallet details
   */
  async generate() {
    try {
      // Generate random wallet with mnemonic
      this.wallet = ethers.Wallet.createRandom();

      this.address = this.wallet.address;
      this.privateKey = this.wallet.privateKey;
      this.publicKey = this.wallet.publicKey;
      this.mnemonic = this.wallet.mnemonic.phrase;

      // Connect to default provider if network is specified
      if (this.network && this.defaultRPCs[this.network]) {
        await this.connect(this.defaultRPCs[this.network]);
      }

      return {
        address: this.address,
        publicKey: this.publicKey,
        mnemonic: this.mnemonic,
        privateKey: this.privateKey
      };
    } catch (error) {
      throw new Error(`Failed to generate wallet: ${error.message}`);
    }
  }

  /**
   * Import wallet from private key
   * @param {string} privateKey - Private key (with or without 0x prefix)
   * @returns {Promise<Object>} Wallet details
   */
  async importFromPrivateKey(privateKey) {
    try {
      // Ensure private key has 0x prefix
      if (!privateKey.startsWith('0x')) {
        privateKey = '0x' + privateKey;
      }

      this.wallet = new ethers.Wallet(privateKey);

      this.address = this.wallet.address;
      this.privateKey = this.wallet.privateKey;
      this.publicKey = this.wallet.publicKey;
      this.mnemonic = null; // No mnemonic when importing from private key

      // Connect to default provider if network is specified
      if (this.network && this.defaultRPCs[this.network]) {
        await this.connect(this.defaultRPCs[this.network]);
      }

      return {
        address: this.address,
        publicKey: this.publicKey
      };
    } catch (error) {
      throw new Error(`Failed to import wallet from private key: ${error.message}`);
    }
  }

  /**
   * Import wallet from mnemonic phrase
   * @param {string} mnemonic - Mnemonic phrase (12 or 24 words)
   * @param {number} index - Derivation path index
   * @returns {Promise<Object>} Wallet details
   */
  async importFromMnemonic(mnemonic, index = 0) {
    try {
      // Validate mnemonic
      if (!ethers.Mnemonic.isValidMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
      }

      // Standard Ethereum derivation path: m/44'/60'/0'/0/{index}
      const path = `m/44'/60'/0'/0/${index}`;
      this.wallet = ethers.Wallet.fromPhrase(mnemonic, path);

      this.address = this.wallet.address;
      this.privateKey = this.wallet.privateKey;
      this.publicKey = this.wallet.publicKey;
      this.mnemonic = mnemonic;

      // Connect to default provider if network is specified
      if (this.network && this.defaultRPCs[this.network]) {
        await this.connect(this.defaultRPCs[this.network]);
      }

      return {
        address: this.address,
        publicKey: this.publicKey,
        mnemonic: this.mnemonic,
        derivationPath: path
      };
    } catch (error) {
      throw new Error(`Failed to import wallet from mnemonic: ${error.message}`);
    }
  }

  /**
   * Connect to network provider
   * @param {string} rpcUrl - RPC URL
   * @returns {Promise<void>}
   */
  async connect(rpcUrl) {
    try {
      this.provider = new ethers.JsonRpcProvider(rpcUrl);

      if (this.wallet) {
        this.wallet = this.wallet.connect(this.provider);
      }

      // Get chain ID
      const network = await this.provider.getNetwork();
      this.chainId = network.chainId;

      return {
        connected: true,
        chainId: this.chainId.toString(),
        rpcUrl
      };
    } catch (error) {
      throw new Error(`Failed to connect to provider: ${error.message}`);
    }
  }

  /**
   * Disconnect from network provider
   * @returns {Promise<void>}
   */
  async disconnect() {
    this.provider = null;
    if (this.wallet) {
      this.wallet = new ethers.Wallet(this.wallet.privateKey);
    }
  }

  /**
   * Get wallet balance
   * @returns {Promise<string>} Balance in ETH
   */
  async getBalance() {
    try {
      if (!this.provider || !this.address) {
        throw new Error('Wallet not connected or address not available');
      }

      const balance = await this.provider.getBalance(this.address);
      return ethers.formatEther(balance);
    } catch (error) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  /**
   * Get token balance (ERC-20)
   * @param {string} tokenAddress - Token contract address
   * @returns {Promise<string>} Token balance
   */
  async getTokenBalance(tokenAddress) {
    try {
      if (!this.provider || !this.address) {
        throw new Error('Wallet not connected or address not available');
      }

      // ERC-20 ABI for balanceOf function
      const erc20Abi = [
        'function balanceOf(address owner) view returns (uint256)',
        'function decimals() view returns (uint8)',
        'function symbol() view returns (string)'
      ];

      const contract = new ethers.Contract(tokenAddress, erc20Abi, this.provider);

      const [balance, decimals, symbol] = await Promise.all([
        contract.balanceOf(this.address),
        contract.decimals(),
        contract.symbol()
      ]);

      return {
        balance: ethers.formatUnits(balance, decimals),
        symbol,
        decimals,
        raw: balance.toString()
      };
    } catch (error) {
      throw new Error(`Failed to get token balance: ${error.message}`);
    }
  }

  /**
   * Send native currency transaction
   * @param {Object} params - { to, amount (in ETH), gasLimit?, gasPrice? }
   * @returns {Promise<Object>} Transaction receipt
   */
  async sendTransaction(params) {
    try {
      if (!this.wallet || !this.provider) {
        throw new Error('Wallet not connected');
      }

      const { to, amount, gasLimit, gasPrice } = params;

      // Validate address
      if (!EVMWallet.isValidAddress(to)) {
        throw new Error('Invalid recipient address');
      }

      // Build transaction
      const tx = {
        to,
        value: ethers.parseEther(amount.toString())
      };

      if (gasLimit) tx.gasLimit = gasLimit;
      if (gasPrice) tx.gasPrice = ethers.parseUnits(gasPrice.toString(), 'gwei');

      // Send transaction
      const txResponse = await this.wallet.sendTransaction(tx);

      // Wait for confirmation
      const receipt = await txResponse.wait();

      return {
        hash: receipt.hash,
        from: receipt.from,
        to: receipt.to,
        value: ethers.formatEther(receipt.value || 0),
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'success' : 'failed'
      };
    } catch (error) {
      throw new Error(`Failed to send transaction: ${error.message}`);
    }
  }

  /**
   * Send ERC-20 token transaction
   * @param {Object} params - { tokenAddress, to, amount, gasLimit? }
   * @returns {Promise<Object>} Transaction receipt
   */
  async sendToken(params) {
    try {
      if (!this.wallet || !this.provider) {
        throw new Error('Wallet not connected');
      }

      const { tokenAddress, to, amount, gasLimit } = params;

      // ERC-20 ABI for transfer function
      const erc20Abi = [
        'function transfer(address to, uint256 amount) returns (bool)',
        'function decimals() view returns (uint8)'
      ];

      const contract = new ethers.Contract(tokenAddress, erc20Abi, this.wallet);

      // Get token decimals
      const decimals = await contract.decimals();

      // Parse amount with proper decimals
      const parsedAmount = ethers.parseUnits(amount.toString(), decimals);

      // Build transaction options
      const txOptions = {};
      if (gasLimit) txOptions.gasLimit = gasLimit;

      // Send transaction
      const txResponse = await contract.transfer(to, parsedAmount, txOptions);

      // Wait for confirmation
      const receipt = await txResponse.wait();

      return {
        hash: receipt.hash,
        from: receipt.from,
        to: tokenAddress,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'success' : 'failed'
      };
    } catch (error) {
      throw new Error(`Failed to send token: ${error.message}`);
    }
  }

  /**
   * Sign message
   * @param {string} message - Message to sign
   * @returns {Promise<string>} Signature
   */
  async signMessage(message) {
    try {
      if (!this.wallet) {
        throw new Error('Wallet not initialized');
      }

      const signature = await this.wallet.signMessage(message);
      return signature;
    } catch (error) {
      throw new Error(`Failed to sign message: ${error.message}`);
    }
  }

  /**
   * Verify signed message
   * @param {string} message - Original message
   * @param {string} signature - Signature to verify
   * @returns {Promise<Object>} Verification result
   */
  async verifyMessage(message, signature) {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);

      return {
        valid: recoveredAddress.toLowerCase() === this.address.toLowerCase(),
        recoveredAddress,
        expectedAddress: this.address
      };
    } catch (error) {
      throw new Error(`Failed to verify message: ${error.message}`);
    }
  }

  /**
   * Get transaction history (limited to recent blocks)
   * Note: For full history, consider using block explorer APIs
   * @param {number} limit - Number of blocks to scan
   * @returns {Promise<Array>} Transaction history
   */
  async getTransactionHistory(limit = 10) {
    try {
      if (!this.provider || !this.address) {
        throw new Error('Wallet not connected');
      }

      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - limit);

      const transactions = [];

      // Scan recent blocks for transactions
      for (let i = currentBlock; i >= fromBlock; i--) {
        const block = await this.provider.getBlock(i, true);

        if (block && block.transactions) {
          for (const tx of block.transactions) {
            if (tx.from?.toLowerCase() === this.address.toLowerCase() ||
                tx.to?.toLowerCase() === this.address.toLowerCase()) {
              transactions.push({
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: ethers.formatEther(tx.value || 0),
                blockNumber: tx.blockNumber,
                timestamp: block.timestamp
              });
            }
          }
        }
      }

      return transactions;
    } catch (error) {
      throw new Error(`Failed to get transaction history: ${error.message}`);
    }
  }

  /**
   * Estimate gas for transaction
   * @param {Object} params - Transaction parameters
   * @returns {Promise<string>} Estimated gas
   */
  async estimateGas(params) {
    try {
      if (!this.provider) {
        throw new Error('Provider not connected');
      }

      const { to, amount } = params;

      const tx = {
        to,
        value: ethers.parseEther(amount.toString()),
        from: this.address
      };

      const gasEstimate = await this.provider.estimateGas(tx);
      return gasEstimate.toString();
    } catch (error) {
      throw new Error(`Failed to estimate gas: ${error.message}`);
    }
  }

  /**
   * Get current gas price
   * @returns {Promise<Object>} Gas price info
   */
  async getGasPrice() {
    try {
      if (!this.provider) {
        throw new Error('Provider not connected');
      }

      const feeData = await this.provider.getFeeData();

      return {
        gasPrice: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : null,
        maxFeePerGas: feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, 'gwei') : null,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei') : null
      };
    } catch (error) {
      throw new Error(`Failed to get gas price: ${error.message}`);
    }
  }

  /**
   * Validate Ethereum address
   * @param {string} address - Address to validate
   * @returns {boolean} Is valid
   */
  static isValidAddress(address) {
    return ethers.isAddress(address);
  }

  /**
   * Get supported networks
   * @returns {Array} List of supported networks
   */
  static getSupportedNetworks() {
    return [
      { name: 'Ethereum Mainnet', key: 'eth-mainnet', chainId: 1, symbol: 'ETH' },
      { name: 'Base Mainnet', key: 'base-mainnet', chainId: 8453, symbol: 'ETH' },
      { name: 'Optimism Mainnet', key: 'optimism-mainnet', chainId: 10, symbol: 'ETH' },
      { name: 'Ethereum Sepolia', key: 'sepolia', chainId: 11155111, symbol: 'ETH' },
      { name: 'Polygon', key: 'polygon', chainId: 137, symbol: 'MATIC' },
      { name: 'BSC', key: 'bsc', chainId: 56, symbol: 'BNB' },
      { name: 'Arbitrum One', key: 'arbitrum', chainId: 42161, symbol: 'ETH' }
    ];
  }
}

export default EVMWallet;
