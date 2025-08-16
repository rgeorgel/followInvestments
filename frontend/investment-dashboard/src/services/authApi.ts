import axios from 'axios';
import { getApiBaseUrl } from '../utils/config';

const API_BASE_URL = getApiBaseUrl();

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  sessionToken: string;
}

export interface RegisterResponse {
  message: string;
  user: User;
}

// Create axios instance with interceptors
const authAxios = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add token to requests
authAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('sessionToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
authAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear invalid session
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('user');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await authAxios.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData: RegisterRequest): Promise<RegisterResponse> => {
    const response = await authAxios.post('/auth/register', userData);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('user');
    window.location.reload();
  },

  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('sessionToken');
    const user = localStorage.getItem('user');
    return !!(token && user);
  }
};