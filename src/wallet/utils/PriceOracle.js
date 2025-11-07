/**
 * Price Oracle
 * Fetches cryptocurrency prices in USD
 */

export class PriceOracle {
  constructor() {
    this.priceCache = new Map();
    this.cacheExpiry = 60 * 1000; // 1 minute cache
    this.lastFetch = new Map();

    // Coingecko IDs for different tokens
    this.tokenIds = {
      ETH: 'ethereum',
      BTC: 'bitcoin',
      MATIC: 'matic-network',
      BNB: 'binancecoin',
      USDT: 'tether',
      USDC: 'usd-coin',
      DAI: 'dai'
    };
  }

  /**
   * Get price for a token
   * @param {string} symbol - Token symbol (ETH, BTC, etc)
   * @returns {Promise<number>} Price in USD
   */
  async getPrice(symbol) {
    try {
      // Check cache
      const cached = this.getCachedPrice(symbol);
      if (cached !== null) {
        return cached;
      }

      // Get coingecko ID
      const tokenId = this.tokenIds[symbol.toUpperCase()];
      if (!tokenId) {
        console.warn(`Unknown token symbol: ${symbol}`);
        return 0;
      }

      // Fetch from coingecko
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const price = data[tokenId]?.usd || 0;

      // Cache the price
      this.priceCache.set(symbol, price);
      this.lastFetch.set(symbol, Date.now());

      return price;
    } catch (error) {
      console.error(`Failed to fetch price for ${symbol}:`, error.message);
      // Return cached price if available, even if expired
      return this.priceCache.get(symbol) || 0;
    }
  }

  /**
   * Get cached price if not expired
   * @param {string} symbol - Token symbol
   * @returns {number|null} Cached price or null
   */
  getCachedPrice(symbol) {
    const lastFetch = this.lastFetch.get(symbol);
    if (!lastFetch) return null;

    const age = Date.now() - lastFetch;
    if (age > this.cacheExpiry) return null;

    return this.priceCache.get(symbol) || null;
  }

  /**
   * Get prices for multiple tokens
   * @param {Array<string>} symbols - Array of token symbols
   * @returns {Promise<Object>} Map of symbol => price
   */
  async getPrices(symbols) {
    const prices = {};

    // Fetch all prices concurrently
    await Promise.all(
      symbols.map(async (symbol) => {
        prices[symbol] = await this.getPrice(symbol);
      })
    );

    return prices;
  }

  /**
   * Calculate USD value
   * @param {string} symbol - Token symbol
   * @param {number} amount - Token amount
   * @returns {Promise<number>} USD value
   */
  async calculateValue(symbol, amount) {
    const price = await this.getPrice(symbol);
    return price * amount;
  }

  /**
   * Get price with symbol for specific network
   * @param {string} network - Network key
   * @returns {Promise<Object>} { symbol, price, usd }
   */
  async getNetworkPrice(network) {
    // Map network to token symbol
    const symbolMap = {
      'eth-mainnet': 'ETH',
      'base-mainnet': 'ETH',
      'optimism-mainnet': 'ETH',
      'sepolia': 'ETH',
      'mainnet': 'ETH',
      'polygon': 'MATIC',
      'bsc': 'BNB',
      'arbitrum': 'ETH'
    };

    const symbol = symbolMap[network] || 'ETH';
    const price = await this.getPrice(symbol);

    return {
      symbol,
      price,
      formatted: this.formatPrice(price)
    };
  }

  /**
   * Format price for display
   * @param {number} price - Price value
   * @returns {string} Formatted price
   */
  formatPrice(price) {
    if (price >= 1000) {
      return `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
    } else if (price >= 1) {
      return `$${price.toFixed(2)}`;
    } else if (price >= 0.01) {
      return `$${price.toFixed(4)}`;
    } else {
      return `$${price.toFixed(6)}`;
    }
  }

  /**
   * Format balance with USD value
   * @param {string} symbol - Token symbol
   * @param {number} balance - Token balance
   * @returns {Promise<Object>} { balance, symbol, usd, formatted }
   */
  async formatBalanceWithUSD(symbol, balance) {
    const price = await this.getPrice(symbol);
    const usdValue = price * parseFloat(balance);

    return {
      balance,
      symbol,
      usd: usdValue,
      formatted: {
        balance: `${parseFloat(balance).toFixed(4)} ${symbol}`,
        usd: this.formatPrice(usdValue)
      }
    };
  }

  /**
   * Clear cache
   * @returns {void}
   */
  clearCache() {
    this.priceCache.clear();
    this.lastFetch.clear();
  }

  /**
   * Get cache status
   * @returns {Object} Cache information
   */
  getCacheStatus() {
    return {
      cachedTokens: Array.from(this.priceCache.keys()),
      cacheSize: this.priceCache.size,
      cacheExpiry: this.cacheExpiry
    };
  }

  /**
   * Add custom token ID mapping
   * @param {string} symbol - Token symbol
   * @param {string} coingeckoId - Coingecko token ID
   * @returns {void}
   */
  addTokenId(symbol, coingeckoId) {
    this.tokenIds[symbol.toUpperCase()] = coingeckoId;
  }

  /**
   * Get price by CoinGecko ID
   * @param {string} coingeckoId - CoinGecko token ID
   * @returns {Promise<number>} Price in USD
   */
  async getPriceByCoingeckoId(coingeckoId) {
    try {
      // Check cache using coingeckoId as key
      const cached = this.getCachedPrice(coingeckoId);
      if (cached !== null) {
        return cached;
      }

      // Fetch from coingecko
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const price = data[coingeckoId]?.usd || 0;

      // Cache the price
      this.priceCache.set(coingeckoId, price);
      this.lastFetch.set(coingeckoId, Date.now());

      return price;
    } catch (error) {
      console.error(`Failed to fetch price for ${coingeckoId}:`, error.message);
      return this.priceCache.get(coingeckoId) || 0;
    }
  }

  /**
   * Get prices for multiple tokens by CoinGecko IDs
   * @param {Array<string>} coingeckoIds - Array of CoinGecko IDs
   * @returns {Promise<Object>} Map of coingeckoId => price
   */
  async getPricesByCoingeckoIds(coingeckoIds) {
    try {
      // Build comma-separated list
      const ids = coingeckoIds.join(',');
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const prices = {};

      for (const id of coingeckoIds) {
        const price = data[id]?.usd || 0;
        prices[id] = price;

        // Cache the price
        this.priceCache.set(id, price);
        this.lastFetch.set(id, Date.now());
      }

      return prices;
    } catch (error) {
      console.error('Failed to fetch prices:', error.message);
      // Return cached prices
      const prices = {};
      for (const id of coingeckoIds) {
        prices[id] = this.priceCache.get(id) || 0;
      }
      return prices;
    }
  }
}

export default PriceOracle;
