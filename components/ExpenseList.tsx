'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

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
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [selectedYearMonth, setSelectedYearMonth] = useState('')
  const [availableYearMonths, setAvailableYearMonths] = useState<YearMonth[]>([])
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
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
          setExpenses(data as Expense[])
          
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
        }
      }
    }

    fetchExpenses()
  }, [supabase])

  const handleYearMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYearMonth(e.target.value)
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
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Mis Gastos</h1>
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
              <span className="text-sm text-gray-600">
                {new Date(expense.created_at).toLocaleDateString('es-CL')}
              </span>
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
    </div>
  )
}