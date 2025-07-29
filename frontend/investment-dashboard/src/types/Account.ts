export interface Account {
  id: number;
  name: string;
  goal1?: number;
  goal2?: number;
  goal3?: number;
  goal4?: number;
  goal5?: number;
  sortOrder: number;
}

export interface CreateAccountRequest {
  name: string;
  goal1?: number;
  goal2?: number;
  goal3?: number;
  goal4?: number;
  goal5?: number;
  sortOrder: number;
}