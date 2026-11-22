export interface Account {
  id: string;
  name: string;
  description?: string | null;
  initial_amount: number;
  total_spent: number;
  balance: number;
  is_active: boolean;
  created_at: string;
}

export interface Expense {
  id: string;
  account_id: string;
  amount: number;
  paid_to: string;
  reason: string;
  category: string;
  expense_date: string;
  notes?: string | null;
  created_at: string;
  running_balance?: number | null;
}

export interface Dashboard {
  accounts_count: number;
  expenses_count: number;
  total_initial: number;
  total_spent: number;
  total_balance: number;
  recent_expenses: Expense[];
}
