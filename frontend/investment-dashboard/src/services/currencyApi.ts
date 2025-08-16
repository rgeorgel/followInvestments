import { getApiBaseUrl } from '../utils/config';

const API_BASE_URL = getApiBaseUrl();

export interface ExchangeRates {
  [key: string]: number;
}

// Request deduplication cache to prevent concurrent duplicate requests
const pendingRequests = new Map<string, Promise<any>>();

const withDeduplication = <T>(key: string, requestFn: () => Promise<T>): Promise<T> => {
  const existing = pendingRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }
  
  const promise = requestFn().finally(() => {
    pendingRequests.delete(key);
  });
  
  pendingRequests.set(key, promise);
  return promise;
};

class CurrencyApi {
  private cachedRates: ExchangeRates = {};
  private lastFetch: Date | null = null;
  private cacheTimeout = 1000 * 60 * 60; // 1 hour cache

  // Fallback rates in case backend is unavailable
  private fallbackRates: ExchangeRates = {
    'BRLUSD': 0.18,
    'BRLCAD': 0.25,
    'CADUSD': 0.73,
    'CADBRL': 4.0,
    'USDBRL': 5.5,
    'USDCAD': 1.37
  };

  constructor() {
    // Initialize with fallback rates immediately
    this.cachedRates = { ...this.fallbackRates };
    
    // Try to load real rates in background
    this.loadRatesInBackground();
  }

  private async loadRatesInBackground(): Promise<void> {
    try {
      const rates = await this.fetchRatesFromBackend();
      if (Object.keys(rates).length > 0) {
        this.cachedRates = { ...this.cachedRates, ...rates };
        this.lastFetch = new Date();
      }
    } catch (error) {
      console.warn('Background rate loading failed, using fallback rates');
    }
  }

  private async fetchRatesFromBackend(): Promise<ExchangeRates> {
    const response = await fetch(`${API_BASE_URL}/currency/rates`);
    if (response.ok) {
      return await response.json();
    }
    throw new Error(`HTTP ${response.status}`);
  }

  async getAllRates(): Promise<ExchangeRates> {
    // Return cached rates if still valid
    if (this.lastFetch && (Date.now() - this.lastFetch.getTime()) < this.cacheTimeout) {
      return this.cachedRates;
    }

    return withDeduplication('currency-rates', async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/currency/rates`);
        if (response.ok) {
          const rates = await response.json();
          this.cachedRates = rates;
          this.lastFetch = new Date();
          
          // If we got some rates, use them, otherwise fall back
          if (Object.keys(rates).length > 0) {
            return rates;
          }
        }
      } catch (error) {
        console.warn('Failed to fetch rates from backend, using fallback rates:', error);
      }

      // Use fallback rates if backend unavailable or returns empty
      this.cachedRates = this.fallbackRates;
      this.lastFetch = new Date();
      return this.fallbackRates;
    });
  }

  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) {
      return 1.0;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/currency/rate/${fromCurrency}/${toCurrency}`);
      if (response.ok) {
        const rate = await response.json();
        return rate;
      }
    } catch (error) {
      console.warn(`Failed to fetch ${fromCurrency}/${toCurrency} rate from backend:`, error);
    }

    // Fallback to cached rates or calculate from available rates
    const rates = await this.getAllRates();
    const directRate = rates[`${fromCurrency}${toCurrency}`];
    if (directRate) {
      return directRate;
    }

    // Try reverse rate
    const reverseRate = rates[`${toCurrency}${fromCurrency}`];
    if (reverseRate) {
      return 1 / reverseRate;
    }

    // Try USD as intermediate currency
    const fromToUSD = rates[`${fromCurrency}USD`];
    const USDToTarget = rates[`USD${toCurrency}`];
    if (fromToUSD && USDToTarget) {
      return fromToUSD * USDToTarget;
    }

    // Try reverse USD conversion
    const USDToFrom = rates[`USD${fromCurrency}`];
    const targetToUSD = rates[`${toCurrency}USD`];
    if (USDToFrom && targetToUSD) {
      return (1 / USDToFrom) * (1 / targetToUSD);
    }

    console.warn(`No conversion path found for ${fromCurrency} to ${toCurrency}`);
    return 1.0; // Fallback to 1:1 if no conversion available
  }

  async convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    return amount * rate;
  }

  // Synchronous version using cached rates
  convertCurrencySync(amount: number, fromCurrency: string, toCurrency: string): number {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    // Use cached rates for immediate conversion
    const rates = this.cachedRates;
    
    // Try direct rate
    const directRate = rates[`${fromCurrency}${toCurrency}`];
    if (directRate) {
      return amount * directRate;
    }

    // Try reverse rate
    const reverseRate = rates[`${toCurrency}${fromCurrency}`];
    if (reverseRate) {
      return amount * (1 / reverseRate);
    }

    // Try USD as intermediate currency
    const fromToUSD = rates[`${fromCurrency}USD`];
    const USDToTarget = rates[`USD${toCurrency}`];
    if (fromToUSD && USDToTarget) {
      return amount * fromToUSD * USDToTarget;
    }

    // Try reverse USD conversion
    const USDToFrom = rates[`USD${fromCurrency}`];
    const targetToUSD = rates[`${toCurrency}USD`];
    if (USDToFrom && targetToUSD) {
      return amount * (1 / USDToFrom) * (1 / targetToUSD);
    }

    console.warn(`No conversion path found for ${fromCurrency} to ${toCurrency}, using 1:1 rate`);
    return amount; // Fallback to 1:1 if no conversion available
  }

  // Force refresh rates from backend
  async refreshRates(): Promise<void> {
    try {
      // Only refresh if rates are stale (older than 1 hour)
      if (this.lastFetch && (Date.now() - this.lastFetch.getTime()) < this.cacheTimeout) {
        return; // Rates are still fresh, no need to refresh
      }
      
      await fetch(`${API_BASE_URL}/currency/update-rates`, { method: 'POST' });
      this.lastFetch = null; // Force re-fetch on next call
    } catch (error) {
      console.warn('Failed to trigger rate update:', error);
    }
  }
}

export const currencyApi = new CurrencyApi();