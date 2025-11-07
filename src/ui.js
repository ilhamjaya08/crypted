/**
 * Crypted TUI Interface - Fixed & Responsive
 * Modern UI with proper blessed interaction
 */

import blessed from 'blessed';
import contrib from 'blessed-contrib';
import figlet from 'figlet';
import CryptedWallet from './index.js';

export class CryptedUI {
  constructor() {
    this.screen = null;
    this.grid = null;
    this.widgets = {};
    this.wallet = new CryptedWallet();
    this.selectedWalletId = null;
    this.walletTree = [];
    this.theme = {
      primary: '#61afef',
      secondary: '#c678dd',
      success: '#98c379',
      warning: '#e5c07b',
      danger: '#e06c75',
      info: '#56b6c2',
    };
    this.init();
  }

  async init() {
    this.createScreen();
    await this.checkAuthStatus();
  }

  createScreen() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Crypted Wallet',
      fullUnicode: true,
      dockBorders: true,
      autoPadding: true
    });

    this.screen.key(['C-c'], () => {
      process.exit(0);
    });
  }

  async checkAuthStatus() {
    try {
      await this.wallet.init();
      const hasPassword = await this.wallet.hasPassword();

      if (!hasPassword) {
        this.showPasswordSetup();
      } else if (this.wallet.isLocked()) {
        this.showUnlockScreen();
      } else {
        await this.showDashboard();
      }
    } catch (error) {
      this.showErrorBox('Init Error', error.message);
      setTimeout(() => process.exit(1), 2000);
    }
  }

  /**
   * PASSWORD SETUP SCREEN - FIXED
   */
  showPasswordSetup() {
    this.screen.destroy();
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Crypted - Setup',
      fullUnicode: true
    });

    const container = blessed.box({
      parent: this.screen,
      width: '100%',
      height: '100%',
      style: { bg: 'black' }
    });

    // Title
    blessed.box({
      parent: container,
      top: 2,
      left: 'center',
      width: 'shrink',
      height: 3,
      content: '{center}{bold}{cyan-fg}CRYPTED WALLET{/cyan-fg}{/bold}{/center}',
      tags: true
    });

    blessed.box({
      parent: container,
      top: 6,
      left: 'center',
      width: 60,
      height: 3,
      content: '{center}Welcome! Create a master password to secure your wallets.{/center}',
      tags: true
    });

    // Requirements
    const reqBox = blessed.box({
      parent: container,
      top: 10,
      left: 'center',
      width: 60,
      height: 8,
      border: { type: 'line', fg: 'cyan' },
      label: ' Password Requirements ',
      content: CryptedWallet.getPasswordRequirements().map(r => `  • ${r}`).join('\n'),
      tags: true,
      style: { border: { fg: 'cyan' } }
    });

    // Password input
    const passInput = blessed.textbox({
      parent: container,
      top: 19,
      left: 'center',
      width: 60,
      height: 3,
      inputOnFocus: true,
      border: { type: 'line', fg: 'white' },
      label: ' Master Password ',
      secret: true,
      style: {
        border: { fg: 'white' },
        focus: { border: { fg: 'green' } }
      }
    });

    // Confirm input
    const confirmInput = blessed.textbox({
      parent: container,
      top: 23,
      left: 'center',
      width: 60,
      height: 3,
      inputOnFocus: true,
      border: { type: 'line', fg: 'white' },
      label: ' Confirm Password ',
      secret: true,
      style: {
        border: { fg: 'white' },
        focus: { border: { fg: 'green' } }
      }
    });

    // Status
    const status = blessed.box({
      parent: container,
      top: 27,
      left: 'center',
      width: 60,
      height: 2,
      content: '',
      tags: true,
      align: 'center'
    });

    // Instructions
    blessed.box({
      parent: container,
      bottom: 1,
      left: 'center',
      width: 'shrink',
      height: 1,
      content: '{black-fg}Tab: Next | Enter: Submit | Ctrl+C: Exit{/black-fg}',
      tags: true
    });

    const submitPassword = async () => {
      const pass = passInput.getValue();
      const conf = confirmInput.getValue();

      if (!pass) {
        status.setContent('{red-fg}Please enter a password{/red-fg}');
        this.screen.render();
        return;
      }

      if (pass !== conf) {
        status.setContent('{red-fg}Passwords do not match!{/red-fg}');
        this.screen.render();
        return;
      }

      const validation = this.wallet.validatePassword(pass);
      if (!validation.valid) {
        status.setContent(`{red-fg}${validation.errors[0]}{/red-fg}`);
        this.screen.render();
        return;
      }

      try {
        status.setContent('{cyan-fg}Creating password...{/cyan-fg}');
        this.screen.render();

        await this.wallet.setPassword(pass);

        status.setContent('{green-fg}Success! Loading...{/green-fg}');
        this.screen.render();

        setTimeout(() => this.showDashboard(), 1000);
      } catch (error) {
        status.setContent(`{red-fg}Error: ${error.message}{/red-fg}`);
        this.screen.render();
      }
    };

    passInput.key(['tab'], () => confirmInput.focus());
    confirmInput.key(['tab'], () => passInput.focus());
    passInput.key(['enter'], () => {
      if (passInput.getValue()) confirmInput.focus();
    });
    confirmInput.key(['enter'], submitPassword);

    passInput.focus();
    this.screen.render();
  }

  /**
   * UNLOCK SCREEN - FIXED
   */
  showUnlockScreen() {
    this.screen.destroy();
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Crypted - Unlock',
      fullUnicode: true
    });

    const container = blessed.box({
      parent: this.screen,
      width: '100%',
      height: '100%',
      style: { bg: 'black' }
    });

    blessed.box({
      parent: container,
      top: 'center',
      left: 'center',
      width: 'shrink',
      height: 5,
      content: '{center}{bold}{cyan-fg}CRYPTED WALLET{/cyan-fg}{/bold}\n{black-fg}Secure CLI Crypto Wallet{/black-fg}{/center}',
      tags: true
    });

    const passInput = blessed.textbox({
      parent: container,
      top: '50%',
      left: 'center',
      width: 50,
      height: 3,
      inputOnFocus: true,
      border: { type: 'line', fg: 'cyan' },
      label: ' Master Password ',
      secret: true,
      style: {
        border: { fg: 'cyan' },
        focus: { border: { fg: 'green' } }
      }
    });

    const status = blessed.box({
      parent: container,
      top: '55%',
      left: 'center',
      width: 50,
      height: 2,
      content: '{center}{black-fg}Press Enter to unlock{/black-fg}{/center}',
      tags: true
    });

    blessed.box({
      parent: container,
      bottom: 1,
      left: 'center',
      width: 'shrink',
      height: 1,
      content: '{black-fg}Ctrl+C: Exit{/black-fg}',
      tags: true
    });

    const attemptUnlock = async () => {
      const pass = passInput.getValue();

      if (!pass) {
        status.setContent('{center}{red-fg}Please enter password{/red-fg}{/center}');
        this.screen.render();
        return;
      }

      try {
        status.setContent('{center}{cyan-fg}Unlocking...{/cyan-fg}{/center}');
        this.screen.render();

        const success = await this.wallet.unlock(pass);

        if (success) {
          status.setContent('{center}{green-fg}Success! Loading wallets...{/green-fg}{/center}');
          this.screen.render();
          setTimeout(() => this.showDashboard(), 500);
        } else {
          status.setContent('{center}{red-fg}Incorrect password!{/red-fg}{/center}');
          passInput.clearValue();
          passInput.focus();
          this.screen.render();
        }
      } catch (error) {
        status.setContent(`{center}{red-fg}Error: ${error.message}{/red-fg}{/center}`);
        this.screen.render();
      }
    };

    passInput.key(['enter'], attemptUnlock);
    passInput.focus();
    this.screen.render();
  }

  /**
   * MAIN DASHBOARD - FIXED
   */
  async showDashboard() {
    this.screen.destroy();
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Crypted Wallet',
      fullUnicode: true,
      dockBorders: true
    });

    this.grid = new contrib.grid({
      rows: 12,
      cols: 12,
      screen: this.screen
    });

    this.createDashboard();
    await this.loadWalletData();
    this.setupDashboardKeys();
    this.screen.render();
  }

  createDashboard() {
    // Header
    this.widgets.header = this.grid.set(0, 0, 2, 12, blessed.box, {
      content: '{center}{bold}{cyan-fg}CRYPTED{/cyan-fg}{/bold} {black-fg}v0.1.0{/black-fg}{/center}',
      tags: true,
      style: { border: { fg: 'cyan' } },
      border: { type: 'line' }
    });

    // Wallet List
    this.widgets.walletList = this.grid.set(2, 0, 8, 5, blessed.list, {
      label: ' 💼 Wallets ',
      tags: true,
      keys: true,
      vi: true,
      mouse: true,
      interactive: true,
      scrollable: true,
      scrollbar: {
        ch: '█',
        style: { fg: 'cyan' }
      },
      style: {
        border: { fg: 'green' },
        selected: {
          bg: 'blue',
          fg: 'white',
          bold: true
        },
        item: { fg: 'white' }
      },
      border: { type: 'line' }
    });

    // Details
    this.widgets.details = this.grid.set(2, 5, 5, 7, blessed.box, {
      label: ' 📊 Wallet Details ',
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      scrollbar: { ch: '█' },
      style: { border: { fg: 'blue' } },
      border: { type: 'line' },
      padding: { left: 1, right: 1 }
    });

    // Portfolio
    this.widgets.portfolio = this.grid.set(7, 5, 3, 7, blessed.box, {
      label: ' 💰 Portfolio ',
      tags: true,
      style: { border: { fg: 'yellow' } },
      border: { type: 'line' },
      padding: { left: 1, right: 1 }
    });

    // Status Bar
    this.widgets.statusBar = this.grid.set(10, 0, 2, 12, blessed.box, {
      tags: true,
      content: ' {bold}Keys:{/bold} [c]reate [i]mport [d]elete [l]ock [r]efresh [q]uit',
      style: { fg: 'black', bg: 'cyan' }
    });
  }

  async loadWalletData() {
    try {
      const wallets = this.wallet.listWallets();
      this.updateWalletList(wallets);
      await this.updatePortfolio();

      // Auto-select first wallet if exists
      const firstWallet = this.walletTree.find(w => w.type === 'derived' || w.type === 'privatekey');
      if (firstWallet) {
        this.widgets.walletList.select(this.walletTree.indexOf(firstWallet));
        await this.showWalletDetails(firstWallet.id);
      } else {
        this.widgets.details.setContent('\n{center}No wallets yet{/center}\n\n{center}Press {bold}c{/bold} to create or {bold}i{/bold} to import{/center}');
      }
    } catch (error) {
      console.error('Load error:', error);
    }
  }

  updateWalletList(wallets) {
    const items = [];
    this.walletTree = [];

    if (wallets.hdWallets.length > 0) {
      items.push('{bold}{magenta-fg}📁 HD Wallets{/magenta-fg}{/bold}');
      this.walletTree.push({ type: 'header' });

      for (const hd of wallets.hdWallets) {
        items.push(`  {green-fg}🌱{/green-fg} ${hd.name}`);
        this.walletTree.push({ type: 'hd-parent', seedId: hd.seedId });

        for (const w of hd.wallets) {
          const star = w.isActive ? '{yellow-fg}★{/yellow-fg} ' : '  ';
          const addr = w.address.slice(0, 6) + '...' + w.address.slice(-4);
          items.push(`    ${star}{blue-fg}💼{/blue-fg} #${w.index} {black-fg}${addr}{/black-fg}`);
          this.walletTree.push({ type: 'derived', id: w.id, seedId: hd.seedId, ...w });
        }

        items.push(`    {black-fg}➕ Derive New{/black-fg}`);
        this.walletTree.push({ type: 'derive-action', seedId: hd.seedId, nextIndex: hd.wallets.length });
      }
    }

    if (wallets.privateKeyWallets.length > 0) {
      if (items.length > 0) items.push('');
      items.push('{bold}{yellow-fg}📁 Private Key Wallets{/yellow-fg}{/bold}');
      this.walletTree.push({ type: 'separator' });
      this.walletTree.push({ type: 'header' });

      for (const w of wallets.privateKeyWallets) {
        const star = w.isActive ? '{yellow-fg}★{/yellow-fg} ' : '  ';
        const addr = w.address.slice(0, 6) + '...' + w.address.slice(-4);
        items.push(`${star}{red-fg}🔑{/red-fg} ${w.name} {black-fg}${addr}{/black-fg}`);
        this.walletTree.push({ type: 'privatekey', id: w.id, ...w });
      }
    }

    this.widgets.walletList.setItems(items);
  }

  async showWalletDetails(walletId) {
    if (!walletId) return;

    try {
      this.selectedWalletId = walletId;
      this.widgets.details.setContent('{center}{cyan-fg}Loading balances...{/cyan-fg}{/center}');
      this.screen.render();

      const wallet = this.wallet.walletManager.getWallet(walletId);

      // Fetch balances from multiple networks in parallel
      const networks = [
        { key: 'eth-mainnet', name: 'ETH Mainnet', symbol: 'ETH' },
        { key: 'base-mainnet', name: 'Base Mainnet', symbol: 'ETH' },
        { key: 'optimism-mainnet', name: 'OP Mainnet', symbol: 'ETH' }
      ];

      const balancePromises = networks.map(async (network) => {
        try {
          // Create temporary wallet instance for this network
          const tempWallet = await this.getBalanceForNetwork(wallet.address, network.key, network.symbol);
          return {
            network: network.name,
            ...tempWallet,
            error: null
          };
        } catch (error) {
          return {
            network: network.name,
            balance: '0',
            usd: 0,
            formatted: { balance: '0 ' + network.symbol, usd: '$0.00' },
            error: error.message
          };
        }
      });

      const balances = await Promise.all(balancePromises);

      // Build content with all network balances
      let content = `
{bold}Name:{/bold} ${wallet.name}

{bold}Address:{/bold}
{cyan-fg}${wallet.address}{/cyan-fg}

{bold}Type:{/bold} ${wallet.type === 'privatekey' ? 'Private Key' : `HD Path #${wallet.index}`}

{bold}Network Balances:{/bold}
`;

      for (const bal of balances) {
        if (bal.error) {
          content += `\n{yellow-fg}${bal.network}:{/yellow-fg} {red-fg}Error{/red-fg}`;
        } else {
          content += `\n{yellow-fg}━ ${bal.network}{/yellow-fg}`;
          content += `\n  {green-fg}${bal.formatted.balance}{/green-fg} {gray-fg}(${bal.formatted.usd}){/gray-fg}`;

          // Add ERC20 tokens if any
          if (bal.tokens && bal.tokens.length > 0) {
            for (const token of bal.tokens) {
              content += `\n  {cyan-fg}${token.formatted.balance}{/cyan-fg} {gray-fg}(${token.formatted.usd}){/gray-fg}`;
            }
            content += `\n  {bold}Total: ${bal.totalFormatted}{/bold}`;
          }
        }
      }

      this.widgets.details.setContent(content);
      this.screen.render();
    } catch (error) {
      this.widgets.details.setContent(`\n{center}{red-fg}Error\n${error.message}{/red-fg}{/center}`);
      this.screen.render();
    }
  }

  /**
   * Get balance for specific network (native + ERC20 tokens)
   * @param {string} address - Wallet address
   * @param {string} network - Network key
   * @param {string} symbol - Token symbol
   * @returns {Promise<Object>} Balance info including tokens
   */
  async getBalanceForNetwork(address, network, symbol) {
    try {
      const { EVMWallet } = await import('./wallet/chains/EVMWallet.js');
      const { COMMON_TOKENS } = await import('./wallet/config/tokens.js');
      const { ethers } = await import('ethers');

      const tempWallet = new EVMWallet({ network });

      // Get provider
      const provider = new ethers.JsonRpcProvider(tempWallet.defaultRPCs[network]);

      // Fetch native token balance
      const nativeBalance = await provider.getBalance(address);
      const nativeBalanceInEth = ethers.formatEther(nativeBalance);

      // Get USD value for native token
      const nativePriceData = await this.wallet.priceOracle.formatBalanceWithUSD(symbol, nativeBalanceInEth);

      // Fetch ERC20 token balances
      const tokens = COMMON_TOKENS[network] || [];
      const tokenBalances = [];

      // Get all token balances in parallel
      const tokenPromises = tokens.map(async (token) => {
        try {
          // ERC-20 ABI for balanceOf
          const erc20Abi = ['function balanceOf(address owner) view returns (uint256)'];
          const contract = new ethers.Contract(token.address, erc20Abi, provider);

          const balance = await contract.balanceOf(address);
          const balanceFormatted = ethers.formatUnits(balance, token.decimals);
          const balanceNum = parseFloat(balanceFormatted);

          // Only include if balance > 0
          if (balanceNum > 0.000001) {
            // Get price from oracle
            const price = await this.wallet.priceOracle.getPriceByCoingeckoId(token.coingeckoId);
            const usdValue = price * balanceNum;

            return {
              symbol: token.symbol,
              name: token.name,
              balance: balanceFormatted,
              balanceNum,
              usd: usdValue,
              formatted: {
                balance: `${balanceNum.toFixed(4)} ${token.symbol}`,
                usd: this.wallet.priceOracle.formatPrice(usdValue)
              }
            };
          }
          return null;
        } catch (error) {
          console.error(`Error fetching ${token.symbol} balance:`, error.message);
          return null;
        }
      });

      const tokenResults = await Promise.all(tokenPromises);
      const validTokens = tokenResults.filter(t => t !== null);

      // Calculate total USD value
      const totalUSD = nativePriceData.usd + validTokens.reduce((sum, t) => sum + t.usd, 0);

      return {
        balance: nativeBalanceInEth,
        symbol,
        usd: nativePriceData.usd,
        formatted: nativePriceData.formatted,
        tokens: validTokens,
        totalUSD,
        totalFormatted: this.wallet.priceOracle.formatPrice(totalUSD)
      };
    } catch (error) {
      throw new Error(`Failed to get balance for ${network}: ${error.message}`);
    }
  }

  async updatePortfolio() {
    try {
      this.widgets.portfolio.setContent('{center}{cyan-fg}Calculating...{/cyan-fg}{/center}');
      this.screen.render();

      const portfolio = await this.wallet.getPortfolioValue();

      const content = `
{bold}Total Value:{/bold}
{green-fg}{bold}${portfolio.formatted}{/bold}{/green-fg}

{bold}Wallets:{/bold} ${portfolio.walletCount}
`;

      this.widgets.portfolio.setContent(content);
      this.screen.render();
    } catch (error) {
      this.widgets.portfolio.setContent(`{red-fg}Error{/red-fg}`);
      this.screen.render();
    }
  }

  setupDashboardKeys() {
    this.widgets.walletList.on('select', async (item, index) => {
      const selected = this.walletTree[index];

      if (selected?.type === 'derived' || selected?.type === 'privatekey') {
        await this.showWalletDetails(selected.id);
      } else if (selected?.type === 'derive-action') {
        this.showDeriveDialog(selected.seedId, selected.nextIndex);
      }
    });

    this.screen.key(['c'], () => this.showCreateChoice());
    this.screen.key(['i'], () => this.showImportChoice());
    this.screen.key(['d'], () => this.showDeleteDialog());
    this.screen.key(['l'], async () => {
      await this.wallet.lock();
      this.showUnlockScreen();
    });
    this.screen.key(['r'], async () => await this.loadWalletData());
    this.screen.key(['q'], () => this.showQuitDialog());

    this.widgets.walletList.focus();
  }

  /**
   * CREATE WALLET CHOICE - SIMPLE DIALOG
   */
  showCreateChoice() {
    const dialog = blessed.list({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 60,
      height: 10,
      label: ' Create Wallet ',
      tags: true,
      keys: true,
      mouse: true,
      border: { type: 'line', fg: 'green' },
      style: {
        border: { fg: 'green' },
        selected: { bg: 'blue', fg: 'white' }
      },
      items: [
        '{green-fg}🌱 HD Wallet{/green-fg} (Seed Phrase) - Recommended',
        '{red-fg}🔑 Private Key Wallet{/red-fg}'
      ]
    });

    dialog.on('select', (item, index) => {
      dialog.detach();
      this.screen.render();
      if (index === 0) this.showCreateHD();
      else this.showCreatePrivKey();
    });

    dialog.key(['escape', 'q'], () => {
      dialog.detach();
      this.screen.render();
      this.widgets.walletList.focus();
    });

    dialog.focus();
    this.screen.render();
  }

  /**
   * CREATE HD WALLET - SIMPLE FORM
   */
  showCreateHD() {
    const modal = this.createModal(' Create HD Wallet ', 70, 20);

    const nameInput = blessed.textbox({
      parent: modal,
      top: 2,
      left: 2,
      width: '90%',
      height: 3,
      border: { type: 'line' },
      label: ' Wallet Name ',
      inputOnFocus: true,
      style: { focus: { border: { fg: 'green' } } }
    });

    blessed.box({
      parent: modal,
      top: 6,
      left: 2,
      width: '90%',
      height: 3,
      label: ' Network ',
      border: { type: 'line' },
      content: '{center}EVM (Ethereum Mainnet){/center}',
      tags: true
    });

    const status = blessed.box({
      parent: modal,
      bottom: 2,
      left: 2,
      width: '90%',
      height: 1,
      content: '{center}{black-fg}Enter: Create | Esc: Cancel{/black-fg}{/center}',
      tags: true
    });

    const defaultNetwork = 'eth-mainnet';

    const doCreate = async () => {
      const name = nameInput.getValue() || 'My HD Wallet';
      const network = defaultNetwork;

      modal.detach();
      this.screen.render();

      const loading = this.showLoading('Creating HD wallet...');

      try {
        const result = await this.wallet.createHDWallet({
          chainType: 'EVM',
          network,
          name
        });

        loading.detach();
        this.showMnemonicBackup(result.mnemonic);
      } catch (error) {
        loading.detach();
        this.showErrorBox('Error', error.message);
      }
    };

    nameInput.key(['enter'], doCreate);

    modal.key(['escape'], () => {
      modal.detach();
      this.screen.render();
      this.widgets.walletList.focus();
    });

    nameInput.focus();
    this.screen.render();
  }

  /**
   * SHOW MNEMONIC - SIMPLE MODAL
   */
  showMnemonicBackup(mnemonic) {
    const modal = this.createModal(' ⚠️  BACKUP SEED PHRASE ', 80, 18);

    blessed.box({
      parent: modal,
      top: 1,
      left: 2,
      width: '95%',
      height: 4,
      content: '{center}{red-fg}{bold}WARNING!{/bold} Write these words down!{/red-fg}\n{yellow-fg}Anyone with these words controls your funds.{/yellow-fg}{/center}',
      tags: true
    });

    blessed.box({
      parent: modal,
      top: 6,
      left: 'center',
      width: '90%',
      height: 5,
      border: { type: 'line', fg: 'yellow' },
      content: `{center}{bold}{green-fg}${mnemonic}{/green-fg}{/bold}{/center}`,
      tags: true
    });

    blessed.box({
      parent: modal,
      bottom: 2,
      left: 'center',
      width: 'shrink',
      height: 1,
      content: '{center}{black-fg}Press Enter to continue{/black-fg}{/center}',
      tags: true
    });

    modal.key(['enter', 'escape'], async () => {
      modal.detach();
      this.screen.render();
      await this.loadWalletData();
      this.widgets.walletList.focus();
    });

    modal.focus();
    this.screen.render();
  }

  /**
   * CREATE PRIVATE KEY - SIMPLE
   */
  showCreatePrivKey() {
    const modal = this.createModal(' Create Private Key Wallet ', 70, 18);

    const nameInput = blessed.textbox({
      parent: modal,
      top: 2,
      left: 2,
      width: '90%',
      height: 3,
      border: { type: 'line' },
      label: ' Wallet Name ',
      inputOnFocus: true,
      style: { focus: { border: { fg: 'green' } } }
    });

    blessed.box({
      parent: modal,
      top: 6,
      left: 2,
      width: '90%',
      height: 3,
      label: ' Network ',
      border: { type: 'line' },
      content: '{center}EVM (Ethereum Mainnet){/center}',
      tags: true
    });

    blessed.box({
      parent: modal,
      bottom: 2,
      left: 2,
      width: '90%',
      height: 1,
      content: '{center}{black-fg}Enter: Create | Esc: Cancel{/black-fg}{/center}',
      tags: true
    });

    const defaultNetwork = 'eth-mainnet';

    const doCreate = async () => {
      const name = nameInput.getValue() || 'My Wallet';
      const network = defaultNetwork;

      modal.detach();
      this.screen.render();

      const loading = this.showLoading('Creating wallet...');

      try {
        await this.wallet.createPrivateKeyWallet({ chainType: 'EVM', network, name });
        loading.detach();
        this.showSuccessBox('Success', 'Wallet created!');
      } catch (error) {
        loading.detach();
        this.showErrorBox('Error', error.message);
      }
    };

    nameInput.key(['enter'], doCreate);

    modal.key(['escape'], () => {
      modal.detach();
      this.screen.render();
      this.widgets.walletList.focus();
    });

    nameInput.focus();
    this.screen.render();
  }

  /**
   * IMPORT CHOICE
   */
  showImportChoice() {
    const dialog = blessed.list({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 60,
      height: 8,
      label: ' Import Wallet ',
      tags: true,
      keys: true,
      mouse: true,
      border: { type: 'line', fg: 'blue' },
      style: {
        border: { fg: 'blue' },
        selected: { bg: 'blue', fg: 'white' }
      },
      items: [
        '{green-fg}🌱 Import Seed Phrase{/green-fg}',
        '{red-fg}🔑 Import Private Key{/red-fg}'
      ]
    });

    dialog.on('select', (item, index) => {
      dialog.detach();
      this.screen.render();
      if (index === 0) this.showImportSeed();
      else this.showImportPrivKey();
    });

    dialog.key(['escape', 'q'], () => {
      dialog.detach();
      this.screen.render();
      this.widgets.walletList.focus();
    });

    dialog.focus();
    this.screen.render();
  }

  /**
   * IMPORT SEED - SIMPLE
   */
  showImportSeed() {
    const modal = this.createModal(' Import Seed Phrase ', 70, 20);

    const mnemonicInput = blessed.textbox({
      parent: modal,
      top: 2,
      left: 2,
      width: '90%',
      height: 5,
      border: { type: 'line' },
      label: ' 12-Word Seed Phrase (space-separated) ',
      inputOnFocus: true,
      style: { focus: { border: { fg: 'green' } } }
    });

    const nameInput = blessed.textbox({
      parent: modal,
      top: 8,
      left: 2,
      width: '90%',
      height: 3,
      border: { type: 'line' },
      label: ' Wallet Name ',
      inputOnFocus: true
    });

    blessed.box({
      parent: modal,
      top: 12,
      left: 2,
      width: '90%',
      height: 3,
      label: ' Network ',
      border: { type: 'line' },
      content: '{center}EVM (Ethereum Mainnet){/center}',
      tags: true
    });

    blessed.box({
      parent: modal,
      bottom: 1,
      left: 2,
      width: '90%',
      height: 1,
      content: '{center}{black-fg}Tab: Next | Enter: Import | Esc: Cancel{/black-fg}{/center}',
      tags: true
    });

    const defaultNetwork = 'eth-mainnet';

    const doImport = async () => {
      const mnemonic = mnemonicInput.getValue().trim();
      const name = nameInput.getValue() || 'Imported HD Wallet';
      const network = defaultNetwork;

      if (!mnemonic) {
        this.showErrorBox('Error', 'Please enter seed phrase');
        return;
      }

      modal.detach();
      this.screen.render();

      const loading = this.showLoading('Importing...');

      try {
        await this.wallet.importHDWallet({ chainType: 'EVM', network, mnemonic, name });
        loading.detach();
        this.showSuccessBox('Success', 'Wallet imported!');
      } catch (error) {
        loading.detach();
        this.showErrorBox('Error', error.message);
      }
    };

    mnemonicInput.key(['tab'], () => nameInput.focus());
    mnemonicInput.key(['enter'], () => {
      if (mnemonicInput.getValue().trim()) {
        nameInput.focus();
      }
    });
    nameInput.key(['tab'], () => mnemonicInput.focus());
    nameInput.key(['enter'], doImport);

    modal.key(['escape'], () => {
      modal.detach();
      this.screen.render();
      this.widgets.walletList.focus();
    });

    mnemonicInput.focus();
    this.screen.render();
  }

  /**
   * IMPORT PRIVATE KEY
   */
  showImportPrivKey() {
    const modal = this.createModal(' Import Private Key ', 70, 18);

    const pkInput = blessed.textbox({
      parent: modal,
      top: 2,
      left: 2,
      width: '90%',
      height: 3,
      border: { type: 'line' },
      label: ' Private Key ',
      inputOnFocus: true,
      secret: true,
      style: { focus: { border: { fg: 'green' } } }
    });

    const nameInput = blessed.textbox({
      parent: modal,
      top: 6,
      left: 2,
      width: '90%',
      height: 3,
      border: { type: 'line' },
      label: ' Wallet Name ',
      inputOnFocus: true
    });

    blessed.box({
      parent: modal,
      top: 10,
      left: 2,
      width: '90%',
      height: 3,
      label: ' Network ',
      border: { type: 'line' },
      content: '{center}EVM (Ethereum Mainnet){/center}',
      tags: true
    });

    const defaultNetwork = 'eth-mainnet';

    const doImport = async () => {
      const privateKey = pkInput.getValue().trim();
      const name = nameInput.getValue() || 'Imported Wallet';
      const network = defaultNetwork;

      if (!privateKey) {
        this.showErrorBox('Error', 'Please enter private key');
        return;
      }

      modal.detach();
      this.screen.render();

      const loading = this.showLoading('Importing...');

      try {
        await this.wallet.importPrivateKeyWallet({ chainType: 'EVM', network, privateKey, name });
        loading.detach();
        this.showSuccessBox('Success', 'Wallet imported!');
      } catch (error) {
        loading.detach();
        this.showErrorBox('Error', error.message);
      }
    };

    pkInput.key(['tab'], () => nameInput.focus());
    nameInput.key(['tab'], () => pkInput.focus());
    nameInput.key(['enter'], doImport);

    modal.key(['escape'], () => {
      modal.detach();
      this.screen.render();
      this.widgets.walletList.focus();
    });

    pkInput.focus();
    this.screen.render();
  }

  /**
   * DERIVE WALLET DIALOG
   */
  showDeriveDialog(seedId, nextIndex) {
    const modal = this.createModal(' Derive New Wallet ', 50, 10);

    blessed.box({
      parent: modal,
      top: 2,
      left: 2,
      width: '90%',
      height: 3,
      content: `{center}Derive wallet at path #{bold}${nextIndex}{/bold}?{/center}`,
      tags: true
    });

    blessed.box({
      parent: modal,
      bottom: 2,
      left: 'center',
      width: 'shrink',
      height: 1,
      content: '{black-fg}[Y]es | [N]o{/black-fg}',
      tags: true
    });

    modal.key(['y', 'Y', 'enter'], async () => {
      modal.detach();
      this.screen.render();

      const loading = this.showLoading(`Deriving wallet #${nextIndex}...`);

      try {
        await this.wallet.deriveWallet(seedId, nextIndex);
        loading.detach();
        this.showSuccessBox('Success', `Wallet #${nextIndex} derived!`);
      } catch (error) {
        loading.detach();
        this.showErrorBox('Error', error.message);
      }
    });

    modal.key(['n', 'N', 'escape'], () => {
      modal.detach();
      this.screen.render();
      this.widgets.walletList.focus();
    });

    modal.focus();
    this.screen.render();
  }

  /**
   * UTILITY FUNCTIONS
   */
  createModal(title, width, height) {
    const modal = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width,
      height,
      label: title,
      border: { type: 'line', fg: 'cyan' },
      style: { border: { fg: 'cyan' } },
      tags: true,
      keys: true
    });
    return modal;
  }

  showLoading(message) {
    const box = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 40,
      height: 5,
      content: `{center}{cyan-fg}${message}{/cyan-fg}{/center}`,
      tags: true,
      border: { type: 'line', fg: 'cyan' }
    });
    this.screen.render();
    return box;
  }

  showSuccessBox(title, message) {
    const box = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 50,
      height: 7,
      label: ` ✓ ${title} `,
      content: `{center}{green-fg}${message}{/green-fg}{/center}`,
      tags: true,
      border: { type: 'line', fg: 'green' }
    });

    box.key(['enter', 'escape'], async () => {
      box.detach();
      await this.loadWalletData();
      this.widgets.walletList.focus();
      this.screen.render();
    });

    setTimeout(() => {
      box.detach();
      this.loadWalletData();
      this.widgets.walletList.focus();
      this.screen.render();
    }, 2000);

    box.focus();
    this.screen.render();
  }

  showErrorBox(title, message) {
    const box = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 50,
      height: 7,
      label: ` ✗ ${title} `,
      content: `{center}{red-fg}${message}{/red-fg}{/center}`,
      tags: true,
      border: { type: 'line', fg: 'red' }
    });

    box.key(['enter', 'escape'], () => {
      box.detach();
      this.widgets.walletList.focus();
      this.screen.render();
    });

    setTimeout(() => {
      box.detach();
      this.widgets.walletList.focus();
      this.screen.render();
    }, 3000);

    box.focus();
    this.screen.render();
  }

  showQuitDialog() {
    const modal = this.createModal(' Confirm Exit ', 40, 8);

    blessed.box({
      parent: modal,
      top: 2,
      left: 2,
      width: '90%',
      height: 2,
      content: '{center}Exit Crypted?{/center}',
      tags: true
    });

    blessed.box({
      parent: modal,
      bottom: 1,
      left: 'center',
      width: 'shrink',
      height: 1,
      content: '{black-fg}[Y]es | [N]o{/black-fg}',
      tags: true
    });

    modal.key(['y', 'Y', 'enter'], () => process.exit(0));
    modal.key(['n', 'N', 'escape'], () => {
      modal.detach();
      this.screen.render();
      this.widgets.walletList.focus();
    });

    modal.focus();
    this.screen.render();
  }

  showDeleteDialog() {
    const selectedIndex = this.widgets.walletList.selected;
    const selected = this.walletTree[selectedIndex];

    if (!selected || selected.type === 'header' || selected.type === 'separator') {
      this.showErrorBox('Error', 'Please select a wallet to delete');
      return;
    }

    const modal = this.createModal(' Delete Wallet ', 60, 12);

    let walletInfo = '';
    let deleteId = null;

    if (selected.type === 'hd-parent') {
      walletInfo = 'Delete entire HD wallet and all derived wallets?';
      deleteId = selected.seedId;
    } else if (selected.type === 'derived') {
      const wallet = this.wallet.walletManager.getWallet(selected.id);
      walletInfo = `Delete wallet:\n${wallet.name}\n${wallet.address.slice(0, 10)}...${wallet.address.slice(-8)}`;
      deleteId = selected.id;
    } else if (selected.type === 'privatekey') {
      const wallet = this.wallet.walletManager.getWallet(selected.id);
      walletInfo = `Delete wallet:\n${wallet.name}\n${wallet.address.slice(0, 10)}...${wallet.address.slice(-8)}`;
      deleteId = selected.id;
    }

    blessed.box({
      parent: modal,
      top: 2,
      left: 2,
      width: '90%',
      height: 5,
      content: `{center}{red-fg}{bold}WARNING!{/bold}{/red-fg}\n${walletInfo}\n\nThis action cannot be undone!{/center}`,
      tags: true
    });

    blessed.box({
      parent: modal,
      bottom: 1,
      left: 'center',
      width: 'shrink',
      height: 1,
      content: '{black-fg}[Y]es | [N]o{/black-fg}',
      tags: true
    });

    modal.key(['y', 'Y', 'enter'], async () => {
      modal.detach();
      this.screen.render();

      const loading = this.showLoading('Deleting wallet...');

      try {
        await this.wallet.deleteWallet(deleteId);
        loading.detach();
        this.showSuccessBox('Success', 'Wallet deleted!');
      } catch (error) {
        loading.detach();
        this.showErrorBox('Error', error.message);
      }
    });

    modal.key(['n', 'N', 'escape'], () => {
      modal.detach();
      this.screen.render();
      this.widgets.walletList.focus();
    });

    modal.focus();
    this.screen.render();
  }

  start() {
    this.screen.render();
  }
}

export default CryptedUI;
