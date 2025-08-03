// lib/statsCalculations.ts
import type { Expense, Budget } from '@/lib/types';

export interface KPIData {
  totalThisMonth: number;
  totalLastMonth: number;
  avgDailySpending: number;
  budgetUsage: number;
  topCategory: string;
  daysUntilMonthEnd: number;
  projectedMonthlyTotal: number;
  budgetRemaining: number;
}

/**
 * Calcula todos los KPIs necesarios para el dashboard
 */
export const calculateKPIs = (
  expenses: Expense[], 
  budgets: Budget[],
  selectedMonth?: string
): KPIData => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  // Usar el mes seleccionado o el actual
  const targetMonth = selectedMonth 
    ? selectedMonth 
    : `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;
  
  const [year, month] = targetMonth.split('-').map(Number);
  
  // Calcular mes anterior
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const previousMonth = `${prevYear}-${prevMonth.toString().padStart(2, '0')}`;
  
  // Filtrar gastos del mes actual
  const thisMonthExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.created_at);
    const expenseMonth = `${expenseDate.getFullYear()}-${(expenseDate.getMonth() + 1).toString().padStart(2, '0')}`;
    return expenseMonth === targetMonth;
  });
  
  // Filtrar gastos del mes anterior
  const lastMonthExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.created_at);
    const expenseMonth = `${expenseDate.getFullYear()}-${(expenseDate.getMonth() + 1).toString().padStart(2, '0')}`;
    return expenseMonth === previousMonth;
  });
  
  // Total del mes actual
  const totalThisMonth = thisMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  // Total del mes anterior
  const totalLastMonth = lastMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  // Promedio diario (basado en días transcurridos del mes)
  const isCurrentMonth = targetMonth === `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;
  const daysIntoMonth = isCurrentMonth ? now.getDate() : new Date(year, month, 0).getDate();
  const avgDailySpending = daysIntoMonth > 0 ? totalThisMonth / daysIntoMonth : 0;
  
  // Categoría con mayor gasto
  const categoryTotals = new Map<string, number>();
  thisMonthExpenses.forEach(expense => {
    categoryTotals.set(
      expense.category, 
      (categoryTotals.get(expense.category) || 0) + expense.amount
    );
  });
  
  const topCategory = Array.from(categoryTotals.entries())
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Sin gastos';
  
  // Cálculos de presupuesto
  const totalBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0);
  const budgetUsage = totalBudget > 0 ? (totalThisMonth / totalBudget) * 100 : 0;
  const budgetRemaining = totalBudget - totalThisMonth;
  
  // Días hasta fin de mes
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const daysUntilMonthEnd = isCurrentMonth ? lastDayOfMonth - now.getDate() : 0;
  
  // Proyección fin de mes
  const projectedMonthlyTotal = isCurrentMonth && daysIntoMonth > 0
    ? (totalThisMonth / daysIntoMonth) * lastDayOfMonth
    : totalThisMonth;
  
  return {
    totalThisMonth,
    totalLastMonth,
    avgDailySpending,
    budgetUsage,
    topCategory,
    daysUntilMonthEnd,
    projectedMonthlyTotal,
    budgetRemaining
  };
};

/**
 * Genera insights automáticos basados en los datos
 */
export const generateInsights = (expenses: Expense[], budgets: Budget[], kpis: KPIData): string[] => {
  const insights: string[] = [];

  // Insight sobre presupuesto
  if (kpis.budgetUsage > 100) {
    insights.push(`⚠️ Has excedido tu presupuesto mensual en ${(kpis.budgetUsage - 100).toFixed(1)}%`);
  } else if (kpis.budgetUsage > 80) {
    insights.push(`⚡ Has usado ${kpis.budgetUsage.toFixed(1)}% de tu presupuesto mensual`);
  }

  // Insight sobre cambio mensual
  const monthChange = kpis.totalLastMonth > 0 
    ? ((kpis.totalThisMonth - kpis.totalLastMonth) / kpis.totalLastMonth * 100)
    : 0;

  if (monthChange > 20) {
    insights.push(`📈 Tus gastos aumentaron ${monthChange.toFixed(1)}% respecto al mes anterior`);
  } else if (monthChange < -20) {
    insights.push(`📉 ¡Excelente! Reduciste tus gastos ${Math.abs(monthChange).toFixed(1)}% este mes`);
  }

  // Insight sobre proyección
  if (kpis.projectedMonthlyTotal > kpis.totalThisMonth * 1.3) {
    insights.push(`🎯 A tu ritmo actual, podrías gastar ${((kpis.projectedMonthlyTotal / kpis.totalThisMonth - 1) * 100).toFixed(0)}% más de lo planeado`);
  }

  // Insight sobre categoría dominante
  if (kpis.topCategory !== 'Sin gastos') {
    insights.push(`🏆 Tu categoría con mayor gasto este mes es "${kpis.topCategory}"`);
  }

  return insights.slice(0, 3); // Máximo 3 insights
};