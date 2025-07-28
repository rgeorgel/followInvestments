export interface Investment {
  id: number;
  name: string;
  value: number;
  quantity: number;
  currency: string;
  date: string;
  description: string;
  category: string;
  accountId: number;
  account: {
    id: number;
    name: string;
    goal1?: number;
    goal2?: number;
    goal3?: number;
    goal4?: number;
    goal5?: number;
  };
  country: string;
  total: number;
}

export const Currency = {
  BRL: 'BRL',
  CAD: 'CAD'
} as const;

export const Category = {
  RendaFixa: 'RendaFixa',
  Stocks: 'Stocks',
  FIIs: 'FIIs',
  ETF: 'ETF',
  Bonds: 'Bonds',
  ManagedPortfolio: 'ManagedPortfolio'
} as const;

export type Currency = typeof Currency[keyof typeof Currency];
export type Category = typeof Category[keyof typeof Category];

// Helper functions to convert string values to display strings
export const getCurrencyLabel = (currency: string): string => {
  switch (currency) {
    case 'BRL': return 'BRL (Brazil)';
    case 'CAD': return 'CAD (Canada)';
    default: return 'Unknown';
  }
};

export const getCategoryLabel = (category: string): string => {
  switch (category) {
    case 'RendaFixa': return 'Renda Fixa';
    case 'Stocks': return 'Stocks';
    case 'FIIs': return 'FIIs';
    case 'ETF': return 'ETF';
    case 'Bonds': return 'Bonds';
    case 'ManagedPortfolio': return 'Managed Portfolio';
    default: return 'Unknown';
  }
};

export interface CreateInvestmentRequest {
  name: string;
  value: number;
  quantity: number;
  currency: string;
  date: string;
  description: string;
  category: string;
  accountId: number;
}

export interface GroupedInvestment {
  category: string;
  account: string;
  name: string;
  totalQuantity: number;
  averageValue: number;
  total: number;
  currency: string;
  country: string;
}

export interface AssetByCategory {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

export interface AccountGoalProgress {
  accountId: number;
  accountName: string;
  currentValue: number;
  currency: string;
  goals: {
    year1?: number;
    year2?: number;
    year3?: number;
    year4?: number;
    year5?: number;
  };
}

export interface DashboardData {
  allInvestments: Investment[];
  groupedInvestments: GroupedInvestment[];
  assetsByAccount: { account: string; total: number }[];
  assetsByCountry: { country: string; total: number }[];
  assetsByCategory: AssetByCategory[];
  accountGoals: AccountGoalProgress[];
}
