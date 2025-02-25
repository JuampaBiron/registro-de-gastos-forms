// expenses/budget/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { Save, Home, PlusCircle, X, BarChart3 } from 'lucide-react'

interface Budget {
  id: number
  category: string
  amount: number
  user_email: string
  created_at: string
}

interface CategorySpending {
  category: string
  spent: number
  budget: number
  percentage: number
  isEditing?: boolean
  newAmount?: number
}

export default function BudgetPage() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [categorySpendings, setCategorySpendings] = useState<CategorySpending[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newBudget, setNewBudget] = useState<{category: string, amount: number} | null>(null)
  const inputRefs = useRef<{[key: string]: HTMLInputElement | null}>({})
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Categorías disponibles para presupuestos
  const availableCategories = [
    'Supermercado', 'Restaurant', 'Hobby', 'Cuidado_personal', 'Suscripciones',
    'Carrete', 'Arriendo', 'Cuentas', 'Viajes', 'Traslados', 'Mascotas', 'Regalos', 'Otros'
  ]

  const fetchBudgets = async () => {
    setIsLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setIsLoading(false)
      return
    }

    // Obtener los presupuestos existentes
    const { data: budgetData, error: budgetError } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_email', user.email)

    if (budgetError) {
      console.error('Error al cargar presupuestos:', budgetError)
    } else {
      setBudgets(budgetData || [])
    }

    // Obtener los gastos del mes actual para cada categoría
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1
    const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString()
    const lastDayOfMonth = new Date(currentYear, currentMonth, 0).toISOString()

    const { data: expenseData, error: expenseError } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_email', user.email)
      .gte('created_at', firstDayOfMonth)
      .lte('created_at', lastDayOfMonth)

    if (expenseError) {
      console.error('Error al cargar gastos:', expenseError)
    } else {
      // Calcular gastos por categoría
      const categoryMap = new Map<string, number>()
      
      expenseData?.forEach(expense => {
        const current = categoryMap.get(expense.category) || 0
        categoryMap.set(expense.category, current + expense.amount)
      })
      
      // Combinar con presupuestos
      const spendings: CategorySpending[] = []
      
      availableCategories.forEach(category => {
        const budget = budgetData?.find(b => b.category === category)?.amount || 0
        const spent = categoryMap.get(category) || 0
        const percentage = budget > 0 ? (spent / budget) * 100 : 0
        
        spendings.push({
          category,
          spent,
          budget,
          percentage,
          isEditing: false,
          newAmount: budget
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
      
      setCategorySpendings(spendings)
    }
    
    setIsLoading(false)
  }

  useEffect(() => {
    fetchBudgets()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBudgetFocus = (category: string) => {
    setCategorySpendings(prev => prev.map(item => 
      item.category === category 
        ? { ...item, isEditing: true }
        : item
    ))
  }

  const handleBudgetChange = (category: string, value: string) => {
    const amount = parseInt(value) || 0
    setCategorySpendings(prev => prev.map(item => 
      item.category === category 
        ? { ...item, newAmount: amount }
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const existingBudget = budgets.find(b => b.category === category)
      
      if (existingBudget) {
        // Actualizar presupuesto existente
        const { error } = await supabase
          .from('budgets')
          .update({
            amount: item.newAmount
          })
          .eq('id', existingBudget.id)

        if (error) throw error
      } else if (item.newAmount! > 0) {
        // Crear nuevo presupuesto solo si la cantidad es mayor que 0
        const { error } = await supabase
          .from('budgets')
          .insert({
            category: category,
            amount: item.newAmount,
            user_email: user.email
          })
        
        if (error) throw error
      }

      // Actualizar datos
      await fetchBudgets()
    } catch (error) {
      console.error('Error al guardar presupuesto:', error)
      // En caso de error, restaurar el valor anterior
      setCategorySpendings(prev => prev.map(i => 
        i.category === category ? { ...i, newAmount: i.budget, isEditing: false } : i
      ))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, category: string) => {
    if (e.key === 'Enter') {
      const input = inputRefs.current[category]
      if (input) {
        input.blur()
      }
    } else if (e.key === 'Escape') {
      // Cancelar edición y restaurar valor original
      setCategorySpendings(prev => prev.map(item => 
        item.category === category 
          ? { ...item, isEditing: false, newAmount: item.budget }
          : item
      ))
    }
  }

  const handleAddNew = () => {
    // Filtrar categorías que ya tienen presupuesto
    const budgetCategories = budgets.map(b => b.category)
    const unbudgetedCategories = availableCategories.filter(c => !budgetCategories.includes(c))
    
    if (unbudgetedCategories.length > 0) {
      setNewBudget({ category: unbudgetedCategories[0], amount: 0 })
    } else {
      alert('Todas las categorías ya tienen presupuesto')
    }
  }

  const handleSaveNewBudget = async () => {
    if (!newBudget) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const { error } = await supabase
        .from('budgets')
        .insert({
          category: newBudget.category,
          amount: newBudget.amount,
          user_email: user.email
        })
      
      if (error) throw error

      // Actualizar datos
      fetchBudgets()
      setNewBudget(null)
    } catch (error) {
      console.error('Error al guardar presupuesto:', error)
      alert('Error al guardar el presupuesto')
    }
  }

  const formatCategoryName = (category: string) => {
    return category.replace('_', ' ')
  }

  const getCategoryEmoji = (category: string) => {
    const emojis: {[key: string]: string} = {
      'Supermercado': '🛒',
      'Restaurant': '🍽️',
      'Hobby': '🎨',
      'Cuidado_personal': '💅',
      'Suscripciones': '📱',
      'Carrete': '🎉',
      'Arriendo': '🏠',
      'Cuentas': '📋',
      'Viajes': '✈️',
      'Traslados': '🚗',
      'Mascotas': '🐾',
      'Regalos': '🎁',
      'Otros': '📦'
    }
    return emojis[category] || '📊'
  }

  // Función auxiliar para establecer la referencia del input
  const setInputRef = (el: HTMLInputElement | null, category: string) => {
    if (inputRefs.current) {
      inputRefs.current[category] = el;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg text-gray-600">Cargando presupuestos...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen bg-gray-100">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link 
            href="/expenses" 
            className="inline-flex items-center justify-center w-10 h-10 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            title="Volver a Gastos"
          >
            <Home className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Presupuestos</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link 
            href="/expenses/stats" 
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors whitespace-nowrap"
          >
            <BarChart3 className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Ver Estadísticas</span>
            <span className="sm:hidden">Estadíst.</span>
          </Link>
          <button
            onClick={handleAddNew}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Nuevo Presupuesto</span>
            <span className="sm:hidden">Nuevo</span>
          </button>
        </div>
      </div>

      {/* Panel de nuevo presupuesto */}
      {newBudget && (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Agregar Nuevo Presupuesto</h2>
            <button 
              onClick={() => setNewBudget(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría
              </label>
              <select
                value={newBudget.category}
                onChange={(e) => setNewBudget({...newBudget, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {availableCategories
                  .filter(c => !budgets.some(b => b.category === c))
                  .map(category => (
                    <option key={category} value={category}>
                      {getCategoryEmoji(category)} {formatCategoryName(category)}
                    </option>
                  ))
                }
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto Presupuestado
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  value={newBudget.amount}
                  onChange={(e) => setNewBudget({...newBudget, amount: parseInt(e.target.value) || 0})}
                  className="block w-full pl-8 pr-4 py-2 rounded-md border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  min="0"
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSaveNewBudget}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <Save className="w-5 h-5 mr-2" />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de presupuestos y gastos */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="grid grid-cols-12 gap-2 md:gap-4 p-3 md:p-4 bg-gray-50 border-b border-gray-200 font-medium text-xs md:text-sm text-gray-700">
          <div className="col-span-3 md:col-span-3">Categoría</div>
          <div className="col-span-3 md:col-span-3">Presupuesto</div>
          <div className="col-span-3 md:col-span-3">Gastado</div>
          <div className="col-span-3 md:col-span-3">Progreso</div>
        </div>

        {categorySpendings.map((item) => (
          <div key={item.category} className="grid grid-cols-12 gap-2 md:gap-4 p-3 md:p-4 border-b border-gray-200 items-center text-sm">
            <div className="col-span-3 md:col-span-3 font-medium truncate">
              {getCategoryEmoji(item.category)} {formatCategoryName(item.category)}
            </div>
            <div className="col-span-3 md:col-span-3">
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-2 md:pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-xs sm:text-sm">$</span>
                </div>
                <input
                  ref={(el) => setInputRef(el, item.category)}
                  type="number"
                  value={item.isEditing ? item.newAmount : item.budget}
                  onChange={(e) => handleBudgetChange(item.category, e.target.value)}
                  onFocus={() => handleBudgetFocus(item.category)}
                  onBlur={() => handleBudgetBlur(item.category)}
                  onKeyDown={(e) => handleKeyDown(e, item.category)}
                  className={`block w-full pl-6 md:pl-8 pr-2 md:pr-4 py-1 md:py-2 text-xs md:text-sm rounded-md border focus:ring-2 focus:border-indigo-500 ${
                    item.isEditing 
                      ? 'border-indigo-500 focus:ring-indigo-500' 
                      : 'border-transparent hover:border-gray-300 focus:ring-indigo-500'
                  }`}
                  min="0"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="col-span-3 md:col-span-3 text-gray-700 truncate">
              ${item.spent.toLocaleString('es-CL')}
            </div>
            <div className="col-span-3 md:col-span-3">
              {item.budget > 0 ? (
                <div className="w-full bg-gray-200 rounded-full h-2 md:h-2.5">
                  <div 
                    className={`h-2 md:h-2.5 rounded-full ${
                      item.percentage > 100 ? 'bg-red-600' :
                      item.percentage > 80 ? 'bg-yellow-400' : 'bg-green-600'
                    }`}
                    style={{ width: `${Math.min(item.percentage, 100)}%` }}
                  ></div>
                </div>
              ) : (
                <div className="text-xs md:text-sm text-gray-500">Sin presupuesto</div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 text-center text-sm text-gray-600">
        <p>Haz clic en cualquier presupuesto para editarlo. Presiona Enter o haz clic fuera del campo para guardar.</p>
      </div>
    </div>
  )
}