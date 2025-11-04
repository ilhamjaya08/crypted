# Crypted

A beautiful TUI (Text User Interface) cryptocurrency wallet built with Node.js.

## Features

- 🎨 Interactive TUI with elegant rounded borders
- ⌨️  Keyboard-driven navigation (like Neovim)
- 🔐 Secure wallet management (coming soon)

## Planned Features

- Create and manage crypto wallets
- Support for multiple cryptocurrencies
- Secure key storage
- Transaction management
- Balance checking

## Installation

```bash
pnpm install
```

## Usage

### Interactive Mode (TUI)

Simply run without arguments to launch the interactive interface:

```bash
# Launch interactive TUI
pnpm start
# or
crypted
```

**Keyboard Shortcuts:**
- `q` or `Ctrl+C` - Quit
- `c` - Create wallet
- `l` - List wallets
- `i` - Import wallet
- `s` - Settings
- `h` - Help

### Direct Commands

For quick operations without TUI:

```bash
crypted create    # Create a new wallet
crypted list      # List all wallets
crypted help      # Show help message
```

## Development

This project is in early development stage.

## License

MIT
