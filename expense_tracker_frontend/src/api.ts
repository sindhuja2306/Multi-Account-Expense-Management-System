import axios from "axios";
import type { Account, Dashboard, Expense } from "./types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api",
  headers: { "Content-Type": "application/json" },
  timeout: 15000
});

export const apiError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    return typeof detail === "string" ? detail : error.message || "Something went wrong.";
  }
  return "Something went wrong. Please try again.";
};

export const apiService = {
  dashboard: async () => (await api.get<Dashboard>("/dashboard")).data,
  accounts: async (activeOnly = false) =>
    (await api.get<Account[]>("/accounts", { params: { active_only: activeOnly } })).data,
  account: async (id: string) => (await api.get<Account>(`/accounts/${id}`)).data,
  createAccount: async (payload: { name: string; initial_amount: number; description?: string }) =>
    (await api.post<Account>("/accounts", payload)).data,
  updateAccount: async (id: string, payload: { name?: string; description?: string }) =>
    (await api.patch<Account>(`/accounts/${id}`, payload)).data,
  archiveAccount: async (id: string) => (await api.delete(`/accounts/${id}`)).data,
  expenses: async (id: string, params?: { start_date?: string; end_date?: string; search?: string }) =>
    (await api.get<Expense[]>(`/accounts/${id}/expenses`, { params })).data,
  addExpense: async (id: string, payload: {
    amount: number; paid_to: string; reason: string; category: string;
    expense_date: string; notes?: string;
  }) => (await api.post<Expense>(`/accounts/${id}/expenses`, payload)).data,
  updateExpense: async (id: string, payload: Partial<{
    amount: number; paid_to: string; reason: string; category: string;
    expense_date: string; notes: string;
  }>) => (await api.put<Expense>(`/expenses/${id}`, payload)).data,
  deleteExpense: async (id: string) => (await api.delete(`/expenses/${id}`)).data
};
