import axios from 'axios';
import type { Investment, CreateInvestmentRequest, DashboardData } from '../types/Investment';

const API_BASE_URL = 'http://localhost:9900/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sessionToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear invalid session and redirect to login
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('user');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export const investmentApi = {
  // Get all investments
  getAll: async (): Promise<Investment[]> => {
    const response = await api.get<Investment[]>('/investments');
    return response.data;
  },

  // Get investment by ID
  getById: async (id: number): Promise<Investment> => {
    const response = await api.get<Investment>(`/investments/${id}`);
    return response.data;
  },

  // Create new investment
  create: async (investment: CreateInvestmentRequest): Promise<Investment> => {
    // Ensure date is in proper UTC format
    const date = investment.date.includes('T')
      ? investment.date
      : `${investment.date}T00:00:00.000Z`;

    const payload = {
      name: investment.name,
      value: Number(investment.value),
      quantity: Number(investment.quantity),
      currency: investment.currency, // Keep as string
      date: date,
      description: investment.description,
      category: investment.category, // Keep as string
      accountId: investment.accountId
    };

    const response = await api.post<Investment>('/investments', payload);
    return response.data;
  },

  // Update investment
  update: async (id: number, investment: Investment): Promise<void> => {
    const date = investment.date.includes('T')
      ? investment.date
      : `${investment.date}T00:00:00.000Z`;

    const payload = {
      id: investment.id,
      name: investment.name,
      value: Number(investment.value),
      quantity: Number(investment.quantity),
      currency: investment.currency, // Keep as string
      date: date,
      description: investment.description,
      category: investment.category, // Keep as string
      accountId: investment.account.id
    };

    await api.put(`/investments/${id}`, payload);
  },

  // Delete investment
  delete: async (id: number): Promise<void> => {
    await api.delete(`/investments/${id}`);
  },

  // Get dashboard data
  getDashboard: async (): Promise<DashboardData> => {
    return withDeduplication('dashboard', async () => {
      const response = await api.get<DashboardData>('/investments/dashboard');
      return response.data;
    });
  },


  // Currency conversion functions
  currency: {
    getRates: async () => {
      const response = await api.get('/currency/rates');
      return response.data;
    },

    getRate: async (fromCurrency: string, toCurrency: string) => {
      const response = await api.get(`/currency/rate/${fromCurrency}/${toCurrency}`);
      return response.data;
    },

    convertAmount: async (amount: number, fromCurrency: string, toCurrency: string) => {
      const response = await api.post('/currency/convert', {
        amount,
        fromCurrency,
        toCurrency
      });
      return response.data;
    },

    getPortfolioInCurrency: async (currency: string) => {
      const response = await api.get(`/currency/portfolio/${currency}`);
      return response.data;
    },

    updateRates: async () => {
      const response = await api.post('/currency/update-rates');
      return response.data;
    }
  }
};
