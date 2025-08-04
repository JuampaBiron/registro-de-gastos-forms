// lib/statsCalculations.ts - VERSIÓN MEJORADA

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
  projectionMethod: string; // Nuevo: para mostrar cómo se calculó
}

/**
 * Calcula una proyección más realista del gasto mensual
 */
const calculateSmartProjection = (
  thisMonthExpenses: Expense[],
  lastMonthExpenses: Expense[],
  totalThisMonth: number,
  daysIntoMonth: number,
  lastDayOfMonth: number,
  isCurrentMonth: boolean
): { projection: number; method: string } => {
  
  if (!isCurrentMonth) {
    return { projection: totalThisMonth, method: 'Mes completado' };
  }

  // Opción 1: Si estamos muy temprano en el mes (primeros 5 días)
  // Usar promedio del mes anterior como referencia
  if (daysIntoMonth <= 5 && lastMonthExpenses.length > 0) {
    const lastMonthTotal = lastMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const currentProgress = totalThisMonth;
    const expectedProgress = (lastMonthTotal / 30) * daysIntoMonth; // Estimado basado en mes anterior
    
    // Si el gasto actual está muy por encima del esperado, usar una proyección más conservadora
    if (currentProgress > expectedProgress * 1.5) {
      const conservativeProjection = lastMonthTotal * 1.1; // 10% más que el mes anterior
      return { projection: conservativeProjection, method: 'Conservadora (basada en mes anterior)' };
    }
  }

  // Opción 2: Si tenemos suficientes días de datos (6+ días)
  // Usar promedio móvil de los últimos 7 días
  if (daysIntoMonth >= 6) {
    const last7Days = thisMonthExpenses
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, Math.min(7, daysIntoMonth));
    
    if (last7Days.length > 0) {
      const last7DaysTotal = last7Days.reduce((sum, expense) => sum + expense.amount, 0);
      const avgLast7Days = last7DaysTotal / last7Days.length;
      const projectionFromAverage = avgLast7Days * lastDayOfMonth;
      
      return { projection: projectionFromAverage, method: 'Promedio últimos 7 días' };
    }
  }

  // Opción 3: Proyección híbrida para casos intermedios
  if (daysIntoMonth >= 3) {
    const simpleProjection = (totalThisMonth / daysIntoMonth) * lastDayOfMonth;
    
    // Si hay datos del mes anterior, hacer un blend
    if (lastMonthExpenses.length > 0) {
      const lastMonthTotal = lastMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      
      // Peso: 70% proyección actual, 30% referencia mes anterior
      const blendedProjection = (simpleProjection * 0.7) + (lastMonthTotal * 0.3);
      return { projection: blendedProjection, method: 'Híbrida (actual + mes anterior)' };
    }
    
    // Si no hay mes anterior, usar proyección simple pero limitada
    const cappedProjection = Math.min(simpleProjection, totalThisMonth * 3); // Máximo 3x el gasto actual
    return { projection: cappedProjection, method: 'Simple limitada' };
  }

  // Opción 4: Muy pocos días, proyección muy conservadora
  return { projection: totalThisMonth * 2, method: 'Muy conservadora (pocos datos)' };
};

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
  
  // 🚀 NUEVA PROYECCIÓN INTELIGENTE
  const { projection: projectedMonthlyTotal, method: projectionMethod } = calculateSmartProjection(
    thisMonthExpenses,
    lastMonthExpenses,
    totalThisMonth,
    daysIntoMonth,
    lastDayOfMonth,
    isCurrentMonth
  );
  
  return {
    totalThisMonth,
    totalLastMonth,
    avgDailySpending,
    budgetUsage,
    topCategory,
    daysUntilMonthEnd,
    projectedMonthlyTotal,
    budgetRemaining,
    projectionMethod
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

  // Insight mejorado sobre proyección
  if (kpis.projectedMonthlyTotal > kpis.totalThisMonth * 1.5) {
    const increasePercent = ((kpis.projectedMonthlyTotal / kpis.totalThisMonth - 1) * 100).toFixed(0);
    insights.push(`🎯 Proyección: ${increasePercent}% más que el gasto actual (${kpis.projectionMethod.toLowerCase()})`);
  }

  // Insight sobre categoría dominante
  if (kpis.topCategory !== 'Sin gastos') {
    insights.push(`🏆 Tu categoría con mayor gasto este mes es "${kpis.topCategory}"`);
  }

  return insights.slice(0, 3); // Máximo 3 insights
};