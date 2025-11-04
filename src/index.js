/**
 * Crypted - CLI Crypto Wallet
 * Main application module
 */

export class CryptedWallet {
  constructor() {
    this.wallets = [];
  }

  createWallet() {
    console.log('Creating wallet...');
  }

  listWallets() {
    console.log('Listing wallets...');
  }
}

export default CryptedWallet;
