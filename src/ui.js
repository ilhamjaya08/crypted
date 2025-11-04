/**
 * Crypted TUI Interface using blessed
 */

import blessed from 'blessed';

export class CryptedUI {
  constructor() {
    this.screen = null;
    this.boxes = {};
    this.init();
  }

  init() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Crypted Wallet',
      fullUnicode: true,
      dockBorders: true,
    });

    this.boxes.main = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '90%',
      height: '90%',
      border: {
        type: 'line',
        fg: 'cyan'
      },
      style: {
        border: {
          fg: 'cyan'
        }
      },
      tags: true
    });

    this.boxes.header = blessed.box({
      parent: this.boxes.main,
      top: 0,
      left: 0,
      width: '100%',
      height: 5,
      content: this.getHeaderContent(),
      tags: true,
      style: {
        fg: 'cyan',
        bold: true
      }
    });

    this.boxes.info = blessed.box({
      parent: this.boxes.main,
      top: 5,
      left: 1,
      width: '50%-2',
      height: '60%',
      border: {
        type: 'line',
        fg: 'green'
      },
      label: ' Wallet Info ',
      tags: true,
      style: {
        border: {
          fg: 'green'
        }
      },
      padding: {
        left: 1,
        right: 1
      }
    });

    this.boxes.menu = blessed.box({
      parent: this.boxes.main,
      top: 5,
      left: '50%',
      width: '50%-1',
      height: '60%',
      border: {
        type: 'line',
        fg: 'yellow'
      },
      label: ' Menu ',
      tags: true,
      style: {
        border: {
          fg: 'yellow'
        }
      },
      padding: {
        left: 1,
        right: 1
      }
    });

    this.boxes.status = blessed.box({
      parent: this.boxes.main,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 3,
      content: this.getStatusContent(),
      tags: true,
      style: {
        fg: 'white',
        bg: 'blue'
      }
    });

    this.setupContent();
    this.setupKeybindings();
  }

  getHeaderContent() {
    return `{center}
  ╔═══════════════════════════════════════╗
  ║     🔐  {bold}CRYPTED WALLET{/bold}  v0.1.0     ║
  ╚═══════════════════════════════════════╝
{/center}`;
  }

  getStatusContent() {
    return ' {bold}Keys:{/bold} [q] Quit | [c] Create Wallet | [l] List Wallets | [h] Help ';
  }

  setupContent() {
    this.boxes.info.setContent(`
{bold}Welcome to Crypted!{/bold}

A secure CLI cryptocurrency wallet manager.

{cyan}Status:{/cyan} Ready
{cyan}Wallets:{/cyan} 0
{cyan}Networks:{/cyan} Not connected

Get started by creating a new wallet
or loading an existing one.
    `);

    this.boxes.menu.setContent(`
{bold}Available Actions:{/bold}

{yellow}[C]{/yellow} Create New Wallet
     Generate a new crypto wallet

{yellow}[L]{/yellow} List Wallets
     View all your wallets

{yellow}[I]{/yellow} Import Wallet
     Import existing wallet

{yellow}[S]{/yellow} Settings
     Configure wallet settings

{yellow}[H]{/yellow} Help
     Show help documentation

{yellow}[Q]{/yellow} Quit
     Exit application
    `);
  }

  setupKeybindings() {
    this.screen.key(['q', 'C-c'], () => {
      return this.exit();
    });

    this.screen.key(['c', 'C'], () => {
      this.showMessage('Create Wallet feature coming soon!', 'cyan');
    });

    this.screen.key(['l', 'L'], () => {
      this.showMessage('List Wallets feature coming soon!', 'cyan');
    });

    this.screen.key(['i', 'I'], () => {
      this.showMessage('Import Wallet feature coming soon!', 'cyan');
    });

    this.screen.key(['s', 'S'], () => {
      this.showMessage('Settings feature coming soon!', 'cyan');
    });

    this.screen.key(['h', 'H'], () => {
      this.showHelp();
    });
  }

  showMessage(message, color = 'yellow') {
    const msg = blessed.message({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '50%',
      height: 'shrink',
      border: {
        type: 'line',
        fg: color
      },
      style: {
        border: {
          fg: color
        }
      },
      tags: true
    });

    msg.display(`{center}${message}{/center}`, 2, () => {
      this.screen.render();
    });
  }

  showHelp() {
    const helpBox = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '70%',
      height: '70%',
      border: {
        type: 'line',
        fg: 'cyan'
      },
      label: ' Help ',
      scrollable: true,
      keys: true,
      vi: true,
      style: {
        border: {
          fg: 'cyan'
        }
      },
      content: `
{center}{bold}Crypted Wallet - Help{/bold}{/center}

{bold}Keyboard Shortcuts:{/bold}
  {cyan}q{/cyan} or {cyan}ESC{/cyan}    - Quit application
  {cyan}c{/cyan}           - Create new wallet
  {cyan}l{/cyan}           - List all wallets
  {cyan}i{/cyan}           - Import existing wallet
  {cyan}s{/cyan}           - Open settings
  {cyan}h{/cyan}           - Show this help

{bold}About:{/bold}
Crypted is a secure CLI-based cryptocurrency
wallet manager built with Node.js.

{bold}Version:{/bold} 0.1.0
{bold}License:{/bold} MIT

Press any key to close this help...
      `,
      tags: true
    });

    helpBox.key(['escape', 'q', 'enter', 'space'], () => {
      helpBox.destroy();
      this.screen.render();
    });

    helpBox.focus();
    this.screen.render();
  }

  render() {
    this.screen.render();
  }

  exit() {
    this.screen.destroy();
    process.exit(0);
  }

  start() {
    this.render();
  }
}

export default CryptedUI;
