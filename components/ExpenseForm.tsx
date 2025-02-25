'use client'

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { LogOut } from 'lucide-react';
import Link from 'next/link';

interface Budget {
  id: number;
  category: string;
  amount: number;
  created_at: string;
  user_email: string;
}

interface BudgetProgress {
  percentage: number;
  color: string;
  spent: number;
  budget: number;
  remaining: number;
}

export default function ExpenseForm() {
  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    observation: ''
  });
  const [message, setMessage] = useState('');
  const [budgets, setBudgets] = useState<{ [key: string]: number }>({});
  const [monthlySpending, setMonthlySpending] = useState<{ [key: string]: number }>({});
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchBudgets = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;
    
    // Cargar presupuestos
    const { data: budgetData, error: budgetError } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_email', user.email);
    
    if (budgetError) {
      console.error('Error al cargar presupuestos:', budgetError);
    } else if (budgetData) {
      const budgetMap: { [key: string]: number } = {};
      budgetData.forEach((budget: Budget) => {
        budgetMap[budget.category] = budget.amount;
      });
      setBudgets(budgetMap);
    }
    
    // Cargar gastos del mes actual
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString();
    const lastDayOfMonth = new Date(currentYear, currentMonth, 0).toISOString();
    
    const { data: expenseData, error: expenseError } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_email', user.email)
      .gte('created_at', firstDayOfMonth)
      .lte('created_at', lastDayOfMonth);
    
    if (expenseError) {
      console.error('Error al cargar gastos:', expenseError);
    } else if (expenseData) {
      const spendingMap: { [key: string]: number } = {};
      expenseData.forEach((expense) => {
        const current = spendingMap[expense.category] || 0;
        spendingMap[expense.category] = current + expense.amount;
      });
      setMonthlySpending(spendingMap);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        setMessage('Por favor inicia sesión para registrar gastos');
        return;
      }

      const { error } = await supabase
        .from('expenses')
        .insert([
          {
            amount: Number(formData.amount),
            category: formData.category,
            observation: formData.observation,
            user_email: user.email
          }
        ]);

      if (error) throw error;

      setMessage('Gasto registrado exitosamente');
      setFormData({ amount: '', category: '', observation: '' });
      
      // Actualizar presupuestos después de registrar un gasto
      fetchBudgets();
    } catch (error) {
      setMessage('Error al registrar el gasto');
      console.error(error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const getBudgetProgress = (category: string): BudgetProgress | null => {
    const budget = budgets[category] || 0;
    const spent = monthlySpending[category] || 0;
    
    if (budget === 0) return null;
    
    const percentage = (spent / budget) * 100;
    let color = 'bg-green-600';
    
    if (percentage > 100) {
      color = 'bg-red-600';
    } else if (percentage > 80) {
      color = 'bg-yellow-500';
    }
    
    return {
      percentage: Math.min(percentage, 100),
      color,
      spent,
      budget,
      remaining: budget - spent
    };
  };

  // Obtener el progreso del presupuesto para la categoría seleccionada
  const budgetProgress = formData.category ? getBudgetProgress(formData.category) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-6 flex flex-col justify-center">
      <div className="relative sm:max-w-xl sm:mx-auto w-full px-4">
        <div className="relative bg-white shadow-lg rounded-2xl">
          {/* Header con botón de logout */}
          <div className="px-8 py-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Registro de Gastos</h2>
            <button
              onClick={handleLogout}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="px-8 py-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 block">
                  Monto
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="block w-full pl-8 pr-4 py-3 rounded-lg border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900"
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 block">
                  Categoría
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="block w-full px-4 py-3 rounded-lg border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900"
                  required
                >
                  <option value="">Selecciona una categoría</option>
                  <option value="Supermercado">🛒 Supermercado {budgets['Supermercado'] ? `(Presupuesto: $${budgets['Supermercado'].toLocaleString('es-CL')})` : ''}</option>
                  <option value="Restaurant">🍽️ Restaurant {budgets['Restaurant'] ? `(Presupuesto: $${budgets['Restaurant'].toLocaleString('es-CL')})` : ''}</option>
                  <option value="Hobby">🎨 Hobby {budgets['Hobby'] ? `(Presupuesto: $${budgets['Hobby'].toLocaleString('es-CL')})` : ''}</option>
                  <option value="Cuidado_personal">💅 Cuidado personal {budgets['Cuidado_personal'] ? `(Presupuesto: $${budgets['Cuidado_personal'].toLocaleString('es-CL')})` : ''}</option>
                  <option value="Suscripciones">📱 Suscripciones {budgets['Suscripciones'] ? `(Presupuesto: $${budgets['Suscripciones'].toLocaleString('es-CL')})` : ''}</option>
                  <option value="Carrete">🎉 Carrete {budgets['Carrete'] ? `(Presupuesto: $${budgets['Carrete'].toLocaleString('es-CL')})` : ''}</option>
                  <option value="Arriendo">🏠 Arriendo {budgets['Arriendo'] ? `(Presupuesto: $${budgets['Arriendo'].toLocaleString('es-CL')})` : ''}</option>
                  <option value="Cuentas">📋 Cuentas {budgets['Cuentas'] ? `(Presupuesto: $${budgets['Cuentas'].toLocaleString('es-CL')})` : ''}</option>
                  <option value="Viajes">✈️ Viajes {budgets['Viajes'] ? `(Presupuesto: $${budgets['Viajes'].toLocaleString('es-CL')})` : ''}</option>
                  <option value="Traslados">🚗 Traslados {budgets['Traslados'] ? `(Presupuesto: $${budgets['Traslados'].toLocaleString('es-CL')})` : ''}</option>
                  <option value="Mascotas">🐾 Mascotas {budgets['Mascotas'] ? `(Presupuesto: $${budgets['Mascotas'].toLocaleString('es-CL')})` : ''}</option>
                  <option value="Regalos">🎁 Regalos {budgets['Regalos'] ? `(Presupuesto: $${budgets['Regalos'].toLocaleString('es-CL')})` : ''}</option>
                  <option value="Otros">📦 Otros {budgets['Otros'] ? `(Presupuesto: $${budgets['Otros'].toLocaleString('es-CL')})` : ''}</option>
                </select>
              </div>

              {/* Mostrar información del presupuesto si existe para la categoría seleccionada */}
              {budgetProgress && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Presupuesto: {formData.category.replace('_', ' ')}
                  </h3>
                  
                  {/* Barra de progreso */}
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                    <div 
                      className={`h-2.5 rounded-full ${budgetProgress.color}`}
                      style={{ width: `${budgetProgress.percentage}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Gastado: ${budgetProgress.spent.toLocaleString('es-CL')}</span>
                    <span>
                      Restante: ${budgetProgress.remaining.toLocaleString('es-CL')}
                      {budgetProgress.remaining < 0 && 
                        <span className="text-red-600"> (Excedido)</span>
                      }
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 block">
                  Observación
                </label>
                <textarea
                  value={formData.observation}
                  onChange={(e) => setFormData({...formData, observation: e.target.value})}
                  rows={3}
                  className="block w-full px-4 py-3 rounded-lg border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900"
                  placeholder="Añade detalles sobre este gasto..."
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Registrar Gasto
              </button>
            </form>

            {message && (
              <div 
                className={`mt-6 p-4 rounded-lg ${
                  message.includes('Error') 
                    ? 'bg-red-50 text-red-700' 
                    : 'bg-green-50 text-green-700'
                }`}
              >
                {message}
              </div>
            )}

            <div className="mt-8 space-y-2">
              <Link href="/expenses">
                <button className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
                  Ver mis gastos
                </button>
              </Link>
              
              <Link href="/expenses/budget">
                <button className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors">
                  Administrar Presupuestos
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}