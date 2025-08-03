// lib/types.ts

export interface Expense {
  id: string;
  category: string;
  amount: number;
  type: 'Individual' | 'Compartido';
  created_at: string;
  observation?: string;
  user_email?: string;
}

export interface Budget {
  id: string;
  category: string;
  amount: number;
  user_email: string;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: string;
  email: string;
  // Agregar más campos según tu esquema de usuario
}

// Tipos para formularios
export interface ExpenseFormData {
  category: string;
  amount: number;
  type: 'Individual' | 'Compartido';
  observation?: string;
}

export interface BudgetFormData {
  category: string;
  amount: number;
}

// Tipos para filtros
export interface ExpenseFilters {
  category?: string;
  type?: 'Individual' | 'Compartido';
  dateFrom?: string;
  dateTo?: string;
}

// Tipos de utilidad
export type ExpenseType = 'Individual' | 'Compartido';
export type CategoryName = string;

// Para estadísticas
export interface ExpenseStats {
  totalAmount: number;
  categoryBreakdown: Record<string, number>;
  typeBreakdown: Record<ExpenseType, number>;
  monthlyTrend: Array<{
    month: string;
    amount: number;
  }>;
}