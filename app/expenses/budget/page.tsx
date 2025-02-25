// expenses/budget/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { Save, ArrowLeftCircle, PlusCircle, X } from 'lucide-react'

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
}

export default function BudgetPage() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [categorySpendings, setCategorySpendings] = useState<CategorySpending[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingBudget, setEditingBudget] = useState<{category: string, amount: number} | null>(null)
  const [newBudget, setNewBudget] = useState<{category: string, amount: number} | null>(null)
  
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
          percentage
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

  const handleEditBudget = (category: string) => {
    const budget = budgets.find(b => b.category === category)
    if (budget) {
      setEditingBudget({ category, amount: budget.amount })
    } else {
      setEditingBudget({ category, amount: 0 })
    }
  }

  const handleSaveBudget = async () => {
    if (!editingBudget) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const existingBudget = budgets.find(b => b.category === editingBudget.category)

    try {
      if (existingBudget) {
        // Actualizar presupuesto existente
        const { error } = await supabase
          .from('budgets')
          .update({
            amount: editingBudget.amount
          })
          .eq('id', existingBudget.id)

        if (error) throw error
      } else {
        // Crear nuevo presupuesto
        const { error } = await supabase
          .from('budgets')
          .insert({
            category: editingBudget.category,
            amount: editingBudget.amount,
            user_email: user.email
          })
        
        if (error) throw error
      }

      // Actualizar datos
      fetchBudgets()
      setEditingBudget(null)
    } catch (error) {
      console.error('Error al guardar presupuesto:', error)
      alert('Error al guardar el presupuesto')
    }
  }

  const handleCancelEdit = () => {
    setEditingBudget(null)
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg text-gray-600">Cargando presupuestos...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen bg-gray-100">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Link 
            href="/expenses" 
            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          >
            <ArrowLeftCircle className="w-5 h-5 mr-2" />
            Volver a Gastos
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Presupuestos Mensuales</h1>
        </div>
        <button
          onClick={handleAddNew}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          Nuevo Presupuesto
        </button>
      </div>

      {/* Panel de nuevo presupuesto */}
      {newBudget && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
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
        <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 font-medium text-sm text-gray-700">
          <div className="col-span-3 md:col-span-3">Categoría</div>
          <div className="col-span-3 md:col-span-3">Presupuesto</div>
          <div className="col-span-3 md:col-span-3">Gastado</div>
          <div className="col-span-2 md:col-span-2">Progreso</div>
          <div className="col-span-1 md:col-span-1 text-right">Acciones</div>
        </div>

        {categorySpendings.map((item) => (
          <div key={item.category} className="grid grid-cols-12 gap-4 p-4 border-b border-gray-200 items-center">
            {editingBudget && editingBudget.category === item.category ? (
              <>
                <div className="col-span-3 md:col-span-3 font-medium">
                  {getCategoryEmoji(item.category)} {formatCategoryName(item.category)}
                </div>
                <div className="col-span-3 md:col-span-3">
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      value={editingBudget.amount}
                      onChange={(e) => setEditingBudget({...editingBudget, amount: parseInt(e.target.value) || 0})}
                      className="block w-full pl-8 pr-4 py-2 rounded-md border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      min="0"
                    />
                  </div>
                </div>
                <div className="col-span-3 md:col-span-3 text-gray-700">
                  ${item.spent.toLocaleString('es-CL')}
                </div>
                <div className="col-span-2 md:col-span-2">
                  {/* No progress bar while editing */}
                  <div className="text-sm text-gray-500">Editando...</div>
                </div>
                <div className="col-span-1 md:col-span-1 flex justify-end gap-2">
                  <button
                    onClick={handleSaveBudget}
                    className="text-green-600 hover:text-green-800"
                    title="Guardar"
                  >
                    <Save className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="text-red-600 hover:text-red-800"
                    title="Cancelar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="col-span-3 md:col-span-3 font-medium">
                  {getCategoryEmoji(item.category)} {formatCategoryName(item.category)}
                </div>
                <div className="col-span-3 md:col-span-3">
                  {item.budget > 0 ? `$${item.budget.toLocaleString('es-CL')}` : 'No establecido'}
                </div>
                <div className="col-span-3 md:col-span-3 text-gray-700">
                  ${item.spent.toLocaleString('es-CL')}
                </div>
                <div className="col-span-2 md:col-span-2">
                  {item.budget > 0 ? (
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${
                          item.percentage > 100 ? 'bg-red-600' :
                          item.percentage > 80 ? 'bg-yellow-400' : 'bg-green-600'
                        }`}
                        style={{ width: `${Math.min(item.percentage, 100)}%` }}
                      ></div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">Sin presupuesto</div>
                  )}
                </div>
                <div className="col-span-1 md:col-span-1 text-right">
                  <button
                    onClick={() => handleEditBudget(item.category)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Editar presupuesto"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}