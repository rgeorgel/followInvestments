import type { Account, CreateAccountRequest } from '../types/Account';

const API_BASE_URL = 'http://localhost:9900/api';

const createAuthHeaders = () => {
  const token = localStorage.getItem('sessionToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const accountApi = {
  async getAll(): Promise<Account[]> {
    const response = await fetch(`${API_BASE_URL}/accounts`, {
      headers: createAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch accounts');
    }
    return response.json();
  },

  async getById(id: number): Promise<Account> {
    const response = await fetch(`${API_BASE_URL}/accounts/${id}`, {
      headers: createAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch account');
    }
    return response.json();
  },

  async create(account: CreateAccountRequest): Promise<Account> {
    const response = await fetch(`${API_BASE_URL}/accounts`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify(account),
    });
    if (!response.ok) {
      throw new Error('Failed to create account');
    }
    return response.json();
  },

  async update(id: number, account: Account): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/accounts/${id}`, {
      method: 'PUT',
      headers: createAuthHeaders(),
      body: JSON.stringify(account),
    });
    if (!response.ok) {
      throw new Error('Failed to update account');
    }
  },

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/accounts/${id}`, {
      method: 'DELETE',
      headers: createAuthHeaders(),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to delete account');
    }
  }
};