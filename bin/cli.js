#!/usr/bin/env node

/**
 * Crypted CLI Entry Point
 */

import CryptedUI from '../src/ui.js';
import CryptedWallet from '../src/index.js';

const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  const ui = new CryptedUI();
  ui.start();
} else {
  console.log('🔐 Crypted - CLI Crypto Wallet v0.1.0\n');

  const wallet = new CryptedWallet();

  switch (command) {
    case 'create':
      wallet.createWallet();
      break;
    case 'list':
      wallet.listWallets();
      break;
    case 'help':
      console.log('Usage: crypted [command]');
      console.log('\nRun "crypted" without arguments to launch interactive mode.');
      console.log('\nDirect commands:');
      console.log('  create    - Create a new wallet');
      console.log('  list      - List all wallets');
      console.log('  help      - Show this help message');
      break;
    default:
      console.log(`Unknown command: ${command}`);
      console.log('Run "crypted" without arguments for interactive mode');
      console.log('Run "crypted help" for more information');
      process.exit(1);
  }
}
