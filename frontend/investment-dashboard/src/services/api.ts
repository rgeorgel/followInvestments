import axios from 'axios';
import type { Investment, CreateInvestmentRequest, DashboardData } from '../types/Investment';

const API_BASE_URL = 'http://localhost:9900/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
      account: investment.account
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
      account: investment.account
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
};
