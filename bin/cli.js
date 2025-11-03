#!/usr/bin/env node

/**
 * Crypted CLI Entry Point
 */

import CryptedWallet from '../src/index.js';

const args = process.argv.slice(2);
const command = args[0];

console.log('🔐 Crypted - CLI Crypto Wallet v0.1.0\n');

if (!command) {
  console.log('Usage: crypted <command>');
  console.log('\nAvailable commands:');
  console.log('  create    - Create a new wallet');
  console.log('  list      - List all wallets');
  console.log('  help      - Show this help message');
  process.exit(0);
}

const wallet = new CryptedWallet();

switch (command) {
  case 'create':
    wallet.createWallet();
    break;
  case 'list':
    wallet.listWallets();
    break;
  case 'help':
    console.log('Help: Coming soon...');
    break;
  default:
    console.log(`Unknown command: ${command}`);
    console.log('Run "crypted" without arguments for help');
    process.exit(1);
}
