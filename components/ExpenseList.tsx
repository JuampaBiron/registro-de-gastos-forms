'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Trash2, Home, BarChart3, Wallet } from 'lucide-react'
import Link from 'next/link'

interface Expense {
  id: number
  amount: number
  category: string
  observation: string
  created_at: string
  user_email: string
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
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchExpenses = async () => {
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
          setSelectedYearMonth('')
        }
      }
    }
  }

  useEffect(() => {
    fetchExpenses()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleYearMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYearMonth(e.target.value)
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

  const filteredExpenses = selectedYearMonth
    ? expenses.filter((expense) => {
        const expenseDate = new Date(expense.created_at)
        const expenseYearMonth = `${expenseDate.getFullYear()}-${(expenseDate.getMonth() + 1)
          .toString()
          .padStart(2, '0')}`
        return expenseYearMonth === selectedYearMonth
      })
    : expenses

  return (
    <div className="container mx-auto px-4 mt-8 min-h-screen bg-gray-100">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link 
            href="/" 
            className="inline-flex items-center justify-center w-10 h-10 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            title="Volver al Inicio"
          >
            <Home className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Mis Gastos</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link 
            href="/expenses/budget" 
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors whitespace-nowrap"
          >
            <Wallet className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Presupuestos</span>
            <span className="sm:hidden">Presup.</span>
          </Link>
          <Link 
            href="/expenses/stats" 
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors whitespace-nowrap"
          >
            <BarChart3 className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Ver Estadísticas</span>
            <span className="sm:hidden">Estadíst.</span>
          </Link>
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="yearMonth" className="block text-sm font-medium text-gray-700 mb-1">
          Filtrar por mes:
        </label>
        <select
          id="yearMonth"
          value={selectedYearMonth}
          onChange={handleYearMonthChange}
          className="w-full px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los meses</option>
          {availableYearMonths.map((ym) => (
            <option key={`${ym.year}-${ym.month}`} value={`${ym.year}-${ym.month}`}>
              {ym.label}
            </option>
          ))}
        </select>
      </div>
      
      {/* Vista de tabla para pantallas grandes */}
      <div className="hidden md:block overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Monto
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Categoría
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Observación
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredExpenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  ${expense.amount.toLocaleString('es-CL')}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  {expense.category}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {expense.observation}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  {new Date(expense.created_at).toLocaleDateString('es-CL')}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">
                  <button
                    onClick={() => handleDeleteClick(expense)}
                    className="text-red-600 hover:text-red-800 transition-colors"
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

      {/* Vista de tarjetas para móviles */}
      <div className="md:hidden space-y-4">
        {filteredExpenses.map((expense) => (
          <div key={expense.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-lg font-semibold text-gray-900">
                ${expense.amount.toLocaleString('es-CL')}
              </span>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {new Date(expense.created_at).toLocaleDateString('es-CL')}
                </span>
                <button
                  onClick={() => handleDeleteClick(expense)}
                  className="text-red-600 hover:text-red-800 transition-colors"
                  title="Eliminar gasto"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="text-sm font-medium text-gray-700">
              {expense.category}
            </div>
            {expense.observation && (
              <div className="text-sm text-gray-600 mt-1">
                {expense.observation}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal de confirmación simple */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ¿Estás seguro?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Esta acción no se puede deshacer. Se eliminará permanentemente este gasto de{' '}
              ${expenseToDelete?.amount.toLocaleString('es-CL')} en {expenseToDelete?.category}.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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