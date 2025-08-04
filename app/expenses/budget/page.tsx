// app/expenses/budget/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import {  ArrowLeft, PlusCircle, X, BarChart3, Home, RefreshCw } from 'lucide-react'

// Importar nuestras utilidades y constantes
import { getCategoryEmoji, CATEGORIES } from '@/constants/categories'
import { formatNumber, formatCategoryName, handleSupabaseError } from '@/lib/utils'
import type { Budget } from '@/lib/types'

interface CategorySpending {
  category: string
  spent: number
  budget: number
  percentage: number
  isEditing?: boolean
  newAmount?: number
  rawAmount?: string // Para almacenar el valor numérico sin formato
  formattedAmount?: string // Para mostrar el valor con formato
}

export default function BudgetPage() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [categorySpendings, setCategorySpendings] = useState<CategorySpending[]>([])
  const [newBudget, setNewBudget] = useState<{
    category: string, 
    amount: number, 
    rawAmount: string,
    formattedAmount: string
  } | null>(null)
  const inputRefs = useRef<{[key: string]: HTMLInputElement | null}>({})
  
  // Calcular totales para la fila de resumen
  const totalBudget = categorySpendings.reduce((sum, item) => sum + item.budget, 0);
  const totalSpent = categorySpendings.reduce((sum, item) => sum + item.spent, 0);
  const totalPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Función auxiliar para establecer la referencia del input
  const setInputRef = (el: HTMLInputElement | null, category: string) => {
    inputRefs.current[category] = el;
    if (el) {
      el.focus();
      el.select();
    }
  };

  const fetchBudgets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.log('Usuario no autenticado')
        return
      }

      // Obtener presupuestos
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_email', user.email)
        .order('category')

      if (budgetError) {
        console.error('Error al cargar presupuestos:', budgetError)
        return
      }

      setBudgets(budgetData || [])

      // Obtener gastos del mes actual
      const now = new Date()
      const year = now.getFullYear()
      const month = (now.getMonth() + 1).toString().padStart(2, '0')
      const startOfMonth = `${year}-${month}-01`
      const endOfMonth = `${year}-${month}-31`

      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select('category, amount')
        .eq('user_email', user.email)
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth)

      if (expenseError) {
        console.error('Error al cargar gastos:', expenseError)
        return
      }

      // Procesar datos para crear CategorySpending
      const spendingMap: { [key: string]: number } = {}
      expenseData?.forEach(expense => {
        spendingMap[expense.category] = (spendingMap[expense.category] || 0) + expense.amount
      })

      const budgetMap: { [key: string]: number } = {}
      budgetData?.forEach(budget => {
        budgetMap[budget.category] = budget.amount
      })

      // Combinar gastos con presupuestos
      const allCategories = new Set([
        ...Object.keys(spendingMap),
        ...Object.keys(budgetMap)
      ])

      const spendings: CategorySpending[] = []
      allCategories.forEach(category => {
        const spent = spendingMap[category] || 0
        const budget = budgetMap[category] || 0
        const percentage = budget > 0 ? (spent / budget) * 100 : 0
        const rawAmount = budget > 0 ? budget.toString() : ''
        const formattedAmount = budget > 0 ? formatNumber(budget.toString()) : ''
        
        spendings.push({
          category,
          spent,
          budget,
          percentage,
          isEditing: false,
          newAmount: budget,
          rawAmount,
          formattedAmount
        })
      })
      
      // Ordenar por porcentaje de uso (mayor a menor)
      spendings.sort((a, b) => {
        // Si ambos tienen presupuesto, ordenar por porcentaje
        if (a.budget > 0 && b.budget > 0) {
          return b.percentage - a.percentage
        }
        // Si solo uno tiene presupuesto, ese va primero
        if (a.budget > 0) return -1
        if (b.budget > 0) return 1
        // Si ninguno tiene presupuesto, ordenar por gasto
        return b.spent - a.spent
      })
      
      // Asegurarnos de que los valores formateados estén correctamente inicializados
      spendings.forEach(item => {
        item.rawAmount = item.budget > 0 ? item.budget.toString() : '';
        item.formattedAmount = item.budget > 0 ? formatNumber(item.budget.toString()) : '';
      })
      
      setCategorySpendings(spendings)
    } catch (error) {
      console.error('Error inesperado al cargar datos:', error)
    }
  }

  useEffect(() => {
    fetchBudgets()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBudgetFocus = (category: string) => {
    setCategorySpendings(prev => prev.map(item => 
      item.category === category 
        ? { 
            ...item, 
            isEditing: true,
            // Asegurarnos que formattedAmount esté correctamente inicializado
            rawAmount: item.budget > 0 ? item.budget.toString() : '',
            formattedAmount: item.budget > 0 ? formatNumber(item.budget.toString()) : ''
          }
        : item
    ))
  }

  const handleBudgetChange = (category: string, value: string) => {
    // Remover caracteres no numéricos
    const numericValue = value.replace(/[^\d]/g, '');
    
    // Valor numérico para cálculos
    const amount = numericValue === '' ? 0 : parseInt(numericValue);
    
    // Actualizar el estado
    setCategorySpendings(prev => prev.map(item => 
      item.category === category 
        ? { 
            ...item, 
            newAmount: amount,
            rawAmount: numericValue,
            formattedAmount: numericValue === '' ? '' : formatNumber(numericValue)
          }
        : item
    ))
  }

  const handleBudgetBlur = async (category: string) => {
    const item = categorySpendings.find(item => item.category === category)
    if (!item || item.budget === item.newAmount) {
      // No hay cambios, solo quitar el modo edición
      setCategorySpendings(prev => prev.map(i => 
        i.category === category ? { ...i, isEditing: false } : i
      ))
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (item.newAmount === 0) {
        // Eliminar presupuesto si el nuevo monto es 0
        const { error } = await supabase
          .from('budgets')
          .delete()
          .eq('user_email', user.email)
          .eq('category', category)

        if (error) {
          const errorMessage = handleSupabaseError(error)
          alert(errorMessage)
          return
        }
      } else {
        // Actualizar o crear presupuesto
        const { error } = await supabase
          .from('budgets')
          .upsert({
            category,
            amount: item.newAmount!,
            user_email: user.email
          })

        if (error) {
          const errorMessage = handleSupabaseError(error)
          alert(errorMessage)
          return
        }
      }

      // Actualizar estado local
      setCategorySpendings(prev => prev.map(i => 
        i.category === category 
          ? { 
              ...i, 
              budget: item.newAmount!, 
              percentage: item.newAmount! > 0 ? (i.spent / item.newAmount!) * 100 : 0,
              isEditing: false,
              rawAmount: item.newAmount! > 0 ? item.newAmount!.toString() : '',
              formattedAmount: item.newAmount! > 0 ? formatNumber(item.newAmount!.toString()) : ''
            } 
          : i
      ))

    } catch (error) {
      console.error('Error al actualizar presupuesto:', error)
      alert('Error al actualizar el presupuesto')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, category: string) => {
    if (e.key === 'Enter') {
      handleBudgetBlur(category)
    } else if (e.key === 'Escape') {
      // Cancelar edición
      setCategorySpendings(prev => prev.map(i => 
        i.category === category ? { ...i, isEditing: false } : i
      ))
    }
  }

  const handleAddBudget = () => {
    setNewBudget({
      category: '',
      amount: 0,
      rawAmount: '',
      formattedAmount: ''
    })
  }

  const handleNewBudgetChange = (field: string, value: string) => {
    if (!newBudget) return

    if (field === 'amount') {
      const numericValue = value.replace(/[^\d]/g, '')
      const amount = numericValue === '' ? 0 : parseInt(numericValue)
      
      setNewBudget({
        ...newBudget,
        amount,
        rawAmount: numericValue,
        formattedAmount: numericValue === '' ? '' : formatNumber(numericValue)
      })
    } else {
      setNewBudget({
        ...newBudget,
        [field]: value
      })
    }
  }

  const handleSaveNewBudget = async () => {
    if (!newBudget || !newBudget.category || newBudget.amount <= 0) {
      alert('Por favor completa todos los campos correctamente')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Verificar si ya existe un presupuesto para esta categoría
      const existingBudget = budgets.find(b => b.category === newBudget.category)
      
      if (existingBudget) {
        // Actualizar presupuesto existente
        const { error } = await supabase
          .from('budgets')
          .update({
            amount: newBudget.amount
          })
          .eq('id', existingBudget.id)

        if (error) {
          console.error('Error al actualizar presupuesto existente:', error);
          const errorMessage = handleSupabaseError(error);
          alert(errorMessage);
          return;
        }
      } else {
        // Crear nuevo presupuesto
        const { error } = await supabase
          .from('budgets')
          .insert({
            category: newBudget.category,
            amount: newBudget.amount,
            user_email: user.email
          });

        if (error) {
          console.error('Error al insertar nuevo presupuesto:', error);
          const errorMessage = handleSupabaseError(error);
          alert(errorMessage);
          return;
        }
      }

      // Actualizar datos
      await fetchBudgets()
      setNewBudget(null)
    } catch (error) {
      console.error('Error al guardar nuevo presupuesto:', error)
      alert('Error al guardar el presupuesto')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-4 px-2 sm:py-6 sm:px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Barra de navegación móvil */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex items-center gap-3">
            <Link 
              href="/" 
              className="flex items-center justify-center w-10 h-10 bg-white text-indigo-600 rounded-full shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
              title="Volver al Inicio"
            >
              <Home className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Presupuestos</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchBudgets()}
              className="flex items-center px-3 py-2 bg-white text-indigo-600 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
              title="Actualizar datos"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline text-sm">Actualizar</span>
            </button>
            
            <Link 
              href="/expenses" 
              className="flex items-center px-3 py-2 bg-white text-indigo-600 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span className="text-sm">Gastos</span>
            </Link>
            
            <Link 
              href="/expenses/stats" 
              className="flex items-center px-3 py-2 bg-white text-indigo-600 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
            >
              <BarChart3 className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline text-sm">Estadísticas</span>
            </Link>
          </div>
        </div>

        {/* Contenedor principal */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          
          {/* Header con resumen */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-white">
              <div className="text-center">
                <div className="text-lg sm:text-xl font-bold">${formatNumber(totalBudget.toString())}</div>
                <div className="text-sm opacity-90">Presupuesto Total</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-xl font-bold">${formatNumber(totalSpent.toString())}</div>
                <div className="text-sm opacity-90">Gastado Total</div>
              </div>
              <div className="text-center">
                <div className={`text-lg sm:text-xl font-bold ${totalPercentage > 100 ? 'text-red-200' : 'text-white'}`}>
                  {totalPercentage.toFixed(1)}%
                </div>
                <div className="text-sm opacity-90">Uso Promedio</div>
              </div>
            </div>
          </div>

          {/* Tabla de presupuestos */}
          <div className="p-4 sm:p-6">
            
            {/* Botón para agregar nuevo presupuesto */}
            <div className="mb-6 flex justify-end">
              <button
                onClick={handleAddBudget}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Nuevo Presupuesto
              </button>
            </div>

            {/* Modal para nuevo presupuesto */}
            {newBudget && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Nuevo Presupuesto</h3>
                    <button
                      onClick={() => setNewBudget(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Categoría
                      </label>
                      <select
                        value={newBudget.category}
                        onChange={(e) => handleNewBudgetChange('category', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">Selecciona una categoría</option>
                        {CATEGORIES.map(category => (
                          <option key={category} value={category}>
                            {getCategoryEmoji(category)} {category}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Monto
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 text-sm">$</span>
                        </div>
                        <input
                          type="text"
                          value={newBudget.formattedAmount}
                          onChange={(e) => handleNewBudgetChange('amount', e.target.value)}
                          className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="0"
                          inputMode="numeric"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3 justify-end mt-6">
                    <button
                      onClick={() => setNewBudget(null)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveNewBudget}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              </div>
            )}

          {/* Lista de categorías - DISEÑO MEJORADO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categorySpendings.map((item) => (
              <div key={item.category} 
                  className={`relative p-5 rounded-2xl border-2 transition-all hover:shadow-lg ${
                    item.percentage > 100 ? 'bg-red-50 border-red-200 hover:shadow-red-100' : 
                    item.percentage > 80 ? 'bg-yellow-50 border-yellow-200 hover:shadow-yellow-100' :
                    item.budget > 0 ? 'bg-green-50 border-green-200 hover:shadow-green-100' : 
                    'bg-gray-50 border-gray-200 hover:shadow-gray-100'
                  } ${item.isEditing ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200' : ''}`}>
                
                {/* Header de la card - Categoría */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getCategoryEmoji(item.category)}</span>
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {formatCategoryName(item.category)}
                    </h3>
                  </div>
                  
                  {/* Porcentaje como badge */}
                  <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                    item.percentage > 100 ? 'bg-red-100 text-red-700' : 
                    item.percentage > 80 ? 'bg-yellow-100 text-yellow-700' :
                    item.budget > 0 ? 'bg-green-100 text-green-700' : 
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {item.budget > 0 ? `${item.percentage.toFixed(0)}%` : 'Sin presupuesto'}
                  </div>
                </div>

                {/* Montos */}
                <div className="space-y-3 mb-4">
                  {/* Presupuesto */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Presupuesto</span>
                    <div className="relative">
                      {item.isEditing ? (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">$</span>
                          <input
                            ref={(el) => setInputRef(el, item.category)}
                            type="text"
                            value={item.formattedAmount || ''}
                            onChange={(e) => handleBudgetChange(item.category, e.target.value)}
                            onBlur={() => handleBudgetBlur(item.category)}
                            onKeyDown={(e) => handleKeyDown(e, item.category)}
                            className="w-32 pl-6 pr-3 py-2 text-sm font-bold text-right border-2 border-indigo-500 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                            inputMode="numeric"
                            placeholder="0"
                          />
                        </div>
                      ) : (
                        <div 
                          onClick={() => handleBudgetFocus(item.category)}
                          className="px-3 py-2 text-sm font-bold text-right bg-white border-2 border-gray-200 rounded-lg cursor-pointer hover:border-indigo-300 transition-colors min-w-[120px]"
                        >
                          ${item.budget === 0 ? '0' : formatNumber(item.budget.toString())}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Gastado */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Gastado</span>
                    <div className="px-3 py-2 text-sm font-bold text-right bg-white border-2 border-gray-200 rounded-lg min-w-[120px]">
                      ${formatNumber(item.spent.toString())}
                    </div>
                  </div>

                  {/* Disponible */}
                  {item.budget > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Disponible</span>
                      <div className={`px-3 py-2 text-sm font-bold text-right rounded-lg min-w-[120px] ${
                        item.budget - item.spent >= 0 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        ${formatNumber((item.budget - item.spent).toString())}
                      </div>
                    </div>
                  )}
                </div>

                {/* Barra de progreso */}
                {item.budget > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Progreso</span>
                      <span className={`text-xs font-medium ${
                        item.percentage > 100 ? 'text-red-600' : 
                        item.percentage > 80 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {item.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-300 ${
                          item.percentage > 100 ? 'bg-red-500' : 
                          item.percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(item.percentage, 100)}%` }}
                      ></div>
                    </div>
                    
                    {/* Indicador de exceso */}
                    {item.percentage > 100 && (
                      <div className="text-xs text-red-600 font-medium text-center mt-1">
                        Exceso: ${formatNumber((item.spent - item.budget).toString())}
                      </div>
                    )}
                  </div>
                )}

                {/* Mensaje para categorías sin presupuesto */}
                {item.budget === 0 && item.spent > 0 && (
                  <div className="text-center py-3">
                    <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      Click para asignar presupuesto
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

            {/* Fila de totales */}
          </div>
        </div>
      </div>
    </div>
  )
}