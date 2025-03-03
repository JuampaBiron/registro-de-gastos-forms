'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Trash2, BarChart3, Wallet, Filter, ArrowLeft, Calendar, Tag } from 'lucide-react'
import Link from 'next/link'

interface Expense {
  id: number
  amount: number
  category: string
  observation: string
  created_at: string
  user_email: string
  type: string
}

interface YearMonth {
  year: number
  month: string
  label: string
}

export default function ExpenseList() {
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0')
  const defaultYearMonth = `${currentYear}-${currentMonth}`

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [selectedYearMonth, setSelectedYearMonth] = useState(defaultYearMonth)
  const [availableYearMonths, setAvailableYearMonths] = useState<YearMonth[]>([])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedType, setSelectedType] = useState<string>('')
  const [categories, setCategories] = useState<string[]>([])
  const [totalAmount, setTotalAmount] = useState(0)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchExpenses = async () => {
    setIsLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_email', user.email)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching expenses:', error)
      } else {
        setExpenses(data)
        
        // Extract unique categories
        const uniqueCategories = Array.from(new Set(data.map((expense: Expense) => expense.category)))
        setCategories(uniqueCategories.sort())
        
        const yearMonths = data.reduce((acc: YearMonth[], expense) => {
          const date = new Date(expense.created_at)
          const year = date.getFullYear()
          const month = (date.getMonth() + 1).toString().padStart(2, '0')
          const yearMonth = `${year}-${month}`
          
          if (!acc.some(ym => `${ym.year}-${ym.month}` === yearMonth)) {
            const monthNames = [
              'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
              'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
            ]
            acc.push({
              year,
              month,
              label: `${monthNames[parseInt(month) - 1]} ${year}`
            })
          }
          return acc
        }, [])
        
        yearMonths.sort((a, b) => {
          return `${b.year}${b.month}`.localeCompare(`${a.year}${a.month}`)
        })
        
        setAvailableYearMonths(yearMonths)
        
        if (!yearMonths.some(ym => `${ym.year}-${ym.month}` === defaultYearMonth)) {
          setSelectedYearMonth(yearMonths.length > 0 ? `${yearMonths[0].year}-${yearMonths[0].month}` : '')
        }
      }
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchExpenses()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Calculate total for filtered expenses
    const total = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    setTotalAmount(total)
  }, [selectedYearMonth, selectedCategory, selectedType, expenses])

  const handleYearMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYearMonth(e.target.value)
  }

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value)
  }

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedType(e.target.value)
  }

  const handleDeleteClick = (expense: Expense) => {
    setExpenseToDelete(expense)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    if (expenseToDelete) {
      try {
        const { error } = await supabase
          .from('expenses')
          .delete()
          .eq('id', expenseToDelete.id)
          .select()

        if (error) {
          console.error('Error al eliminar el gasto:', error)
          alert('Error al eliminar el gasto: ' + error.message)
        } else {
          await fetchExpenses()
        }
      } catch (error) {
        console.error('Error en la operación de eliminación:', error)
        alert('Error en la operación de eliminación')
      }
    }
    setShowDeleteModal(false)
    setExpenseToDelete(null)
  }

  const resetFilters = () => {
    setSelectedYearMonth(defaultYearMonth)
    setSelectedCategory('')
    setSelectedType('')
  }

  // Get emoji for category
  const getCategoryEmoji = (category: string) => {
    const emojiMap: { [key: string]: string } = {
      'Supermercado': '🛒',
      'Restaurant': '🍽️',
      'Hobby': '🎨',
      'Cuidado personal': '💅',
      'Suscripciones': '📱',
      'Carrete': '🎉',
      'Arriendo': '🏠',
      'Cuentas': '📋',
      'Viajes': '✈️',
      'Traslados': '🚗',
      'Mascotas': '🐾',
      'Regalos': '🎁',
      'Otros': '📦'
    };
    
    return emojiMap[category] || '';
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Apply all filters
  const filteredExpenses = expenses.filter((expense) => {
    // Year-Month filter
    const expenseDate = new Date(expense.created_at)
    const expenseYearMonth = `${expenseDate.getFullYear()}-${(expenseDate.getMonth() + 1)
      .toString()
      .padStart(2, '0')}`
    
    const yearMonthMatch = selectedYearMonth ? expenseYearMonth === selectedYearMonth : true
    
    // Category filter
    const categoryMatch = selectedCategory ? expense.category === selectedCategory : true
    
    // Type filter
    const typeMatch = selectedType ? expense.type === selectedType : true
    
    return yearMonthMatch && categoryMatch && typeMatch
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-6">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link 
                href="/" 
                className="flex items-center justify-center w-10 h-10 bg-white/20 text-white rounded-full hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors"
                title="Volver al Inicio"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-bold text-white">Mis Gastos</h1>
            </div>
            <div className="flex space-x-2">
              <Link 
                href="/expenses/budget" 
                className="inline-flex items-center px-4 py-2 bg-white/20 text-white text-sm font-medium rounded-full hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors"
              >
                <Wallet className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Presupuestos</span>
              </Link>
              <Link 
                href="/expenses/stats" 
                className="inline-flex items-center px-4 py-2 bg-white/20 text-white text-sm font-medium rounded-full hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors"
              >
                <BarChart3 className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Estadísticas</span>
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 bg-gray-50 border-b">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="yearMonth" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Calendar className="w-4 h-4 mr-1 text-indigo-500" /> Mes
                </label>
                <select
                  id="yearMonth"
                  value={selectedYearMonth}
                  onChange={handleYearMonthChange}
                  className="w-full px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Todos los meses</option>
                  {availableYearMonths.map((ym) => (
                    <option key={`${ym.year}-${ym.month}`} value={`${ym.year}-${ym.month}`}>
                      {ym.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Tag className="w-4 h-4 mr-1 text-indigo-500" /> Categoría
                </label>
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  className="w-full px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Todas las categorías</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {getCategoryEmoji(category)} {category}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Filter className="w-4 h-4 mr-1 text-indigo-500" /> Tipo
                </label>
                <select
                  id="type"
                  value={selectedType}
                  onChange={handleTypeChange}
                  className="w-full px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Todos los tipos</option>
                  <option value="Individual">Individual</option>
                  <option value="Compartido">Compartido</option>
                </select>
              </div>
              
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-sm font-medium text-indigo-600 bg-white border border-indigo-300 rounded-lg hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
            
            {/* Total display */}
            <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Total {selectedYearMonth ? 'del mes' : ''} {selectedCategory ? `en ${selectedCategory}` : ''} {selectedType ? `(${selectedType})` : ''}:</span>
                <span className="text-lg font-bold text-indigo-700">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </div>
          
          {/* Loading state */}
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent align-[-0.125em]"></div>
              <p className="mt-2 text-gray-600">Cargando tus gastos...</p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">No hay gastos para mostrar con los filtros actuales.</p>
            </div>
          ) : (
            <>
              {/* Vista de tabla para pantallas grandes */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Categoría
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Observación
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredExpenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(expense.created_at).toLocaleDateString('es-CL')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="flex items-center">
                            <span className="mr-2">{getCategoryEmoji(expense.category)}</span>
                            {expense.category}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            expense.type === 'Individual' 
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {expense.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                          {formatCurrency(expense.amount)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {expense.observation || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => handleDeleteClick(expense)}
                            className="text-red-600 hover:text-red-800 transition-colors p-1 rounded-full hover:bg-red-50"
                            title="Eliminar gasto"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Vista de tarjetas para móviles y tablets */}
              <div className="lg:hidden divide-y divide-gray-200">
                {filteredExpenses.map((expense) => (
                  <div key={expense.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <div className="flex items-center mb-1">
                          <span className="mr-2">{getCategoryEmoji(expense.category)}</span>
                          <span className="font-medium text-gray-900">{expense.category}</span>
                          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                            expense.type === 'Individual' 
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {expense.type}
                          </span>
                        </div>
                        <span className="text-lg font-bold text-gray-900">
                          {formatCurrency(expense.amount)}
                        </span>
                        {expense.observation && (
                          <p className="text-sm text-gray-600 mt-1">
                            {expense.observation}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-sm text-gray-500 mb-2">
                          {new Date(expense.created_at).toLocaleDateString('es-CL')}
                        </span>
                        <button
                          onClick={() => handleDeleteClick(expense)}
                          className="text-red-600 hover:text-red-800 transition-colors p-1 rounded-full hover:bg-red-50"
                          title="Eliminar gasto"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal de confirmación */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ¿Estás seguro?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Esta acción no se puede deshacer. Se eliminará permanentemente este gasto de{' '}
              {formatCurrency(expenseToDelete?.amount || 0)} en {expenseToDelete?.category}.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}