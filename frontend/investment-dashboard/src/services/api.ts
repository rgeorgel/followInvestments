import axios from 'axios';
import type { Investment, CreateInvestmentRequest, DashboardData } from '../types/Investment';

const API_BASE_URL = 'http://localhost:9900/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
    const response = await api.get<DashboardData>('/investments/dashboard');
    return response.data;
  },

  // Get timeline data based on real investment dates with current market values
  getTimeline: async () => {
    const allInvestments = await investmentApi.getAll();
    const dashboardData = await investmentApi.getDashboard();
    
    // Create a map of current values by account and currency from dashboard
    const currentValuesByAccount = new Map();
    dashboardData.accountGoals?.forEach((account: any) => {
      currentValuesByAccount.set(`${account.accountName}-${account.currency}`, account.currentValue);
    });
    
    // Get unique dates and sort them
    const investmentDates = [...new Set(allInvestments.map(inv => inv.date.split('T')[0]))]
      .sort()
      .map(dateStr => new Date(dateStr));

    // Calculate cumulative values at each date
    const timelinePoints = investmentDates.map(date => {
      const investmentsUpToDate = allInvestments.filter(inv => 
        new Date(inv.date) <= date
      );
      
      // Group investments by account and currency
      const accountCurrencyTotals = new Map();
      investmentsUpToDate.forEach(inv => {
        const key = `${inv.account.name}-${inv.currency}`;
        const current = accountCurrencyTotals.get(key) || 0;
        accountCurrencyTotals.set(key, current + (inv.total || (inv.value * inv.quantity)));
      });
      
      let brlValue = 0;
      let cadValue = 0;
      
      // For the most recent date, use current market values
      const isLatestDate = date.getTime() === Math.max(...investmentDates.map(d => d.getTime()));
      
      if (isLatestDate) {
        // Use current values from dashboard for the latest date
        dashboardData.accountGoals?.forEach((account: any) => {
          if (accountCurrencyTotals.has(`${account.accountName}-${account.currency}`)) {
            if (account.currency === 'BRL') {
              brlValue += account.currentValue;
            } else if (account.currency === 'CAD') {
              cadValue += account.currentValue;
            }
          }
        });
      } else {
        // For historical dates, use book values (what was invested at that time)
        accountCurrencyTotals.forEach((total, key) => {
          const currency = key.split('-')[1];
          if (currency === 'BRL') {
            brlValue += total;
          } else if (currency === 'CAD') {
            cadValue += total;
          }
        });
      }

      return {
        date: date.toISOString(),
        totalValue: brlValue + cadValue,
        brlValue,
        cadValue
      };
    });

    // Create goal markers grouped by country and total
    const goalMarkers: any[] = [];
    const currentYear = new Date().getFullYear();
    
    // Group goals by currency and calculate totals
    const goalsByCurrency = {
      BRL: { year1: 0, year2: 0, year3: 0, year4: 0, year5: 0 },
      CAD: { year1: 0, year2: 0, year3: 0, year4: 0, year5: 0 }
    };
    
    dashboardData.accountGoals?.forEach((account: any) => {
      const currency = account.currency;
      if (goalsByCurrency[currency as keyof typeof goalsByCurrency] && account.goals) {
        goalsByCurrency[currency as keyof typeof goalsByCurrency].year1 += account.goals.year1 || 0;
        goalsByCurrency[currency as keyof typeof goalsByCurrency].year2 += account.goals.year2 || 0;
        goalsByCurrency[currency as keyof typeof goalsByCurrency].year3 += account.goals.year3 || 0;
        goalsByCurrency[currency as keyof typeof goalsByCurrency].year4 += account.goals.year4 || 0;
        goalsByCurrency[currency as keyof typeof goalsByCurrency].year5 += account.goals.year5 || 0;
      }
    });
    
    // Add currency-specific goals (BRL goals)
    if (goalsByCurrency.BRL.year1 > 0) {
      goalMarkers.push({
        year: currentYear + 1,
        value: goalsByCurrency.BRL.year1,
        currency: 'BRL',
        type: 'currency',
        label: `BRL Goals ${currentYear + 1}`
      });
    }
    if (goalsByCurrency.BRL.year2 > 0) {
      goalMarkers.push({
        year: currentYear + 2,
        value: goalsByCurrency.BRL.year2,
        currency: 'BRL',
        type: 'currency',
        label: `BRL Goals ${currentYear + 2}`
      });
    }
    if (goalsByCurrency.BRL.year3 > 0) {
      goalMarkers.push({
        year: currentYear + 3,
        value: goalsByCurrency.BRL.year3,
        currency: 'BRL',
        type: 'currency',
        label: `BRL Goals ${currentYear + 3}`
      });
    }
    if (goalsByCurrency.BRL.year4 > 0) {
      goalMarkers.push({
        year: currentYear + 4,
        value: goalsByCurrency.BRL.year4,
        currency: 'BRL',
        type: 'currency',
        label: `BRL Goals ${currentYear + 4}`
      });
    }
    if (goalsByCurrency.BRL.year5 > 0) {
      goalMarkers.push({
        year: currentYear + 5,
        value: goalsByCurrency.BRL.year5,
        currency: 'BRL',
        type: 'currency',
        label: `BRL Goals ${currentYear + 5}`
      });
    }
    
    // Add currency-specific goals (CAD goals)
    if (goalsByCurrency.CAD.year1 > 0) {
      goalMarkers.push({
        year: currentYear + 1,
        value: goalsByCurrency.CAD.year1,
        currency: 'CAD',
        type: 'currency',
        label: `CAD Goals ${currentYear + 1}`
      });
    }
    if (goalsByCurrency.CAD.year2 > 0) {
      goalMarkers.push({
        year: currentYear + 2,
        value: goalsByCurrency.CAD.year2,
        currency: 'CAD',
        type: 'currency',
        label: `CAD Goals ${currentYear + 2}`
      });
    }
    if (goalsByCurrency.CAD.year3 > 0) {
      goalMarkers.push({
        year: currentYear + 3,
        value: goalsByCurrency.CAD.year3,
        currency: 'CAD',
        type: 'currency',
        label: `CAD Goals ${currentYear + 3}`
      });
    }
    if (goalsByCurrency.CAD.year4 > 0) {
      goalMarkers.push({
        year: currentYear + 4,
        value: goalsByCurrency.CAD.year4,
        currency: 'CAD',
        type: 'currency',
        label: `CAD Goals ${currentYear + 4}`
      });
    }
    if (goalsByCurrency.CAD.year5 > 0) {
      goalMarkers.push({
        year: currentYear + 5,
        value: goalsByCurrency.CAD.year5,
        currency: 'CAD',
        type: 'currency',
        label: `CAD Goals ${currentYear + 5}`
      });
    }
    
    // Add total goals (BRL + CAD combined)
    const totalYear1 = goalsByCurrency.BRL.year1 + goalsByCurrency.CAD.year1;
    const totalYear2 = goalsByCurrency.BRL.year2 + goalsByCurrency.CAD.year2;
    const totalYear3 = goalsByCurrency.BRL.year3 + goalsByCurrency.CAD.year3;
    const totalYear4 = goalsByCurrency.BRL.year4 + goalsByCurrency.CAD.year4;
    const totalYear5 = goalsByCurrency.BRL.year5 + goalsByCurrency.CAD.year5;
    
    if (totalYear1 > 0) {
      goalMarkers.push({
        year: currentYear + 1,
        value: totalYear1,
        currency: 'TOTAL',
        type: 'total',
        label: `Total Goals ${currentYear + 1}`
      });
    }
    if (totalYear2 > 0) {
      goalMarkers.push({
        year: currentYear + 2,
        value: totalYear2,
        currency: 'TOTAL',
        type: 'total',
        label: `Total Goals ${currentYear + 2}`
      });
    }
    if (totalYear3 > 0) {
      goalMarkers.push({
        year: currentYear + 3,
        value: totalYear3,
        currency: 'TOTAL',
        type: 'total',
        label: `Total Goals ${currentYear + 3}`
      });
    }
    if (totalYear4 > 0) {
      goalMarkers.push({
        year: currentYear + 4,
        value: totalYear4,
        currency: 'TOTAL',
        type: 'total',
        label: `Total Goals ${currentYear + 4}`
      });
    }
    if (totalYear5 > 0) {
      goalMarkers.push({
        year: currentYear + 5,
        value: totalYear5,
        currency: 'TOTAL',
        type: 'total',
        label: `Total Goals ${currentYear + 5}`
      });
    }

    const lastPoint = timelinePoints[timelinePoints.length - 1];
    return {
      timelinePoints,
      goalMarkers,
      currentTotalValue: lastPoint?.totalValue || 0,
      currentBrlValue: lastPoint?.brlValue || 0,
      currentCadValue: lastPoint?.cadValue || 0
    };
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
