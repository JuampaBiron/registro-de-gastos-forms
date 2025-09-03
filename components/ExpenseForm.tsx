// components/ExpenseForm.tsx
'use client'

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { LogOut, TrendingUp, Wallet, CreditCard, Calendar } from 'lucide-react';
import Link from 'next/link';

// Importar nuestras utilidades y constantes
import { getCategoryEmoji, CATEGORIES } from '@/constants/categories';
import { 
  formatCurrency, 
  formatNumber, 
  formatDateForInput, 
  getMonthName, 
  handleSupabaseError 
} from '@/lib/utils';

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
    observation: '',
    type: 'Individual',
    date: formatDateForInput(new Date()) // Fecha actual en formato YYYY-MM-DD
  });
  const [formattedAmount, setFormattedAmount] = useState('');
  const [message, setMessage] = useState('');
  const [budgets, setBudgets] = useState<{ [key: string]: number }>({});
  const [monthlySpending, setMonthlySpending] = useState<{ [key: string]: number }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Efecto para actualizar el monto formateado cuando cambia formData.amount
  useEffect(() => {
    if (formData.amount === '') {
      setFormattedAmount('');
    } else {
      setFormattedAmount(formatNumber(formData.amount));
    }
  }, [formData.amount]);

  // Manejar cambios en el input de monto
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Remover todos los caracteres no numéricos
    const numericValue = value.replace(/[^\d]/g, '');
    
    // Actualizar el estado raw sin formato
    setFormData({...formData, amount: numericValue});
    
    // El valor formateado se actualizará mediante el useEffect
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      
      // Redirigir a la página de inicio de sesión
      window.location.href = '/login';
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Intentar redirigir a la página de inicio de sesión de todos modos
      window.location.href = '/login';
    }
  };

  const fetchBudgets = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.log('Error al obtener usuario:', userError);
        // Si el error es de token, intentamos hacer logout para limpiar la sesión
        if (userError.code === 'refresh_token_not_found') {
          await handleLogout();
          return;
        }
      }
      
      if (!user) return;
      
      // Cargar presupuestos
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_email', user.email);
      
      if (budgetError) {
        console.log('Error al cargar presupuestos:', {
          error: budgetError,
          message: budgetError?.message || 'Error desconocido',
          code: budgetError?.code || 'Sin código'
        });
        return;
      }

      console.log('Budget data received:', budgetData);
      
      const budgetMap: { [key: string]: number } = {};
      budgetData?.forEach(budget => {
        if (budget.category && typeof budget.amount === 'number') {
          budgetMap[budget.category] = budget.amount;
        } else {
          console.log('Budget data inválido (filtrado):', budget);
        }
      });
      setBudgets(budgetMap);

      // Cargar gastos del mes actual para calcular progreso
      const currentDate = new Date(formData.date);
      const year = currentDate.getFullYear();
      const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      const startOfMonth = `${year}-${month}-01`;
      const endOfMonth = `${year}-${month}-31`;

      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select('category, amount')
        .eq('user_email', user.email)
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth);

      if (expenseError) {
        console.log('Error al cargar gastos:', {
          error: expenseError,
          message: expenseError?.message || 'Error desconocido',
          code: expenseError?.code || 'Sin código'
        });
        return;
      }

      console.log('Expense data received:', expenseData);
      
      const spendingMap: { [key: string]: number } = {};
      expenseData?.forEach(expense => {
        if (expense.category && typeof expense.amount === 'number') {
          spendingMap[expense.category] = (spendingMap[expense.category] || 0) + expense.amount;
        } else {
          console.log('Expense data inválido (filtrado):', expense);
        }
      });
      setMonthlySpending(spendingMap);

    } catch (error) {
      console.log('Error inesperado al cargar presupuestos:', error);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, [formData.date]); // Recargar cuando cambie la fecha

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setMessage('Error: Usuario no autenticado');
        return;
      }

      // Preparar datos para insertar
      const expenseData = {
        amount: parseInt(formData.amount),
        category: formData.category,
        observation: formData.observation,
        type: formData.type,
        user_email: user.email,
        created_at: formData.date
      };
      
      console.log('Enviando fecha:', formData.date);
      console.log('Datos completos:', expenseData);

      // Insertar gasto
      const { error } = await supabase
        .from('expenses')
        .insert(expenseData);

      if (error) {
        console.error('Error al registrar gasto:', error);
        const errorMessage = handleSupabaseError(error);
        setMessage(errorMessage);
        return;
      }

      setMessage('¡Gasto registrado exitosamente!');
      setFormData({ 
        amount: '', 
        category: '', 
        observation: '', 
        type: 'Individual',
        date: formData.date // Mantener la fecha seleccionada
      });
      setFormattedAmount('');
      
      // Actualizar presupuestos después de registrar un gasto
      fetchBudgets();
    } catch (error) {
      setMessage('Error al registrar el gasto');
      console.error(error);
    } finally {
      setIsSubmitting(false);
      
      // Hacer que el mensaje desaparezca después de 3 segundos
      setTimeout(() => {
        setMessage('');
      }, 3000);
    }
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-6 flex flex-col justify-center">
      <div className="relative sm:max-w-xl sm:mx-auto w-full px-4">
        <div className="relative bg-white shadow-xl rounded-3xl overflow-hidden">
          {/* Header con gradiente */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <Wallet className="mr-2 h-6 w-6" /> Registro de Gastos
            </h2>
            <button
              onClick={handleLogout}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="px-8 py-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Selector de fecha */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <Calendar className="w-4 h-4 mr-1" /> Fecha del gasto
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="block w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 transition-colors text-gray-900 shadow-sm"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Registrando gasto para: {getMonthName(formData.date)}</p>
              </div>

              {/* Categoría con diseño mejorado */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 block">
                  Categoría
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="block w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 transition-colors text-gray-900 shadow-sm"
                  required
                >
                  <option value="">Selecciona una categoría</option>
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>
                      {getCategoryEmoji(category)} {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Monto con diseño mejorado y separador de miles */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-1" /> Monto
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="text"
                    value={formattedAmount}
                    onChange={handleAmountChange}
                    className="block w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 transition-colors text-gray-900 shadow-sm"
                    placeholder="0"
                    required
                    inputMode="numeric"
                  />
                </div>
              </div>

              {/* Tipo de gasto con diseño mejorado */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 block">
                  Tipo de gasto
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div 
                    className={`flex items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.type === 'Individual' 
                        ? 'bg-indigo-50 border-indigo-500 shadow-sm' 
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                    onClick={() => setFormData({...formData, type: 'Individual'})}
                  >
                    <input
                      id="individual"
                      name="expense-type"
                      type="radio"
                      checked={formData.type === 'Individual'}
                      onChange={() => {}}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <label htmlFor="individual" className="ml-2 block text-sm font-medium text-gray-700 cursor-pointer">
                      Individual
                    </label>
                  </div>
                  <div 
                    className={`flex items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.type === 'Compartido' 
                        ? 'bg-indigo-50 border-indigo-500 shadow-sm' 
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                    onClick={() => setFormData({...formData, type: 'Compartido'})}
                  >
                    <input
                      id="compartido"
                      name="expense-type"
                      type="radio"
                      checked={formData.type === 'Compartido'}
                      onChange={() => {}}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <label htmlFor="compartido" className="ml-2 block text-sm font-medium text-gray-700 cursor-pointer">
                      Compartido
                    </label>
                  </div>
                </div>
              </div>

              {/* Mostrar información del presupuesto con diseño mejorado */}
              {budgetProgress && (
                <div className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    {getCategoryEmoji(formData.category)} Presupuesto: {formData.category} ({getMonthName(formData.date)})
                  </h3>
                  
                  {/* Barra de progreso mejorada */}
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
                    <div 
                      className={`h-3 rounded-full ${budgetProgress.color} transition-all`}
                      style={{ width: `${budgetProgress.percentage}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <div className="text-gray-600">
                      <div className="font-medium">Gastado</div>
                      <div>{formatCurrency(budgetProgress.spent)}</div>
                    </div>
                    <div className={budgetProgress.remaining < 0 ? "text-red-600" : "text-green-600"}>
                      <div className="font-medium">Restante</div>
                      <div>
                        {formatCurrency(budgetProgress.remaining)}
                        {budgetProgress.remaining < 0 && <span> (Excedido)</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Observación con diseño mejorado */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 block">
                  Observación
                </label>
                <textarea
                  value={formData.observation}
                  onChange={(e) => setFormData({...formData, observation: e.target.value})}
                  rows={3}
                  className="block w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 transition-colors text-gray-900 shadow-sm"
                  placeholder="Añade detalles sobre este gasto..."
                />
              </div>

              {/* Botón mejorado con estado de carga */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSubmitting ? (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : null}
                {isSubmitting ? 'Registrando...' : 'Registrar Gasto'}
              </button>
            </form>

            {/* Mensaje con animación */}
            {message && (
              <div 
                className={`mt-6 p-4 rounded-xl shadow-sm border-l-4 transition-all duration-300 ease-in-out ${
                  message.includes('Error') 
                    ? 'bg-red-50 border-red-400 text-red-700' 
                    : 'bg-green-50 border-green-400 text-green-700'
                }`}
              >
                <div className="flex">
                  <div className="flex-shrink-0">
                    {message.includes('Error') ? (
                      <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">{message}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Enlaces de navegación */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex justify-center space-x-4">
                <Link 
                  href="/expenses" 
                  className="inline-flex items-center px-4 py-2 border border-indigo-300 shadow-sm text-sm font-medium rounded-md text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Ver Gastos
                </Link>
                <Link 
                  href="/expenses/budget" 
                  className="inline-flex items-center px-4 py-2 border border-indigo-300 shadow-sm text-sm font-medium rounded-md text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Presupuestos
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}