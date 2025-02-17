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

export default function ExpenseList() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [selectedMonth, setSelectedMonth] = useState('')
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
        }
      }
    }

    fetchExpenses()
  }, [supabase])

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(e.target.value)
  }

  const filteredExpenses = selectedMonth
  ? expenses.filter((expense) => {
      const expenseDate = new Date(expense.created_at);
      const expenseMonth = (expenseDate.getMonth() + 1).toString().padStart(2, '0');
      return expenseMonth === selectedMonth;
    })
  : expenses;

return (
  <div className="container mx-auto mt-8">
    <h1 className="text-2xl font-bold mb-4">Mis Gastos</h1>
    <div className="mb-4">
      <label htmlFor="month" className="block text-sm font-medium text-gray-700">
        Filtrar por mes:
      </label>
      <select
        id="month"
        value={selectedMonth}
        onChange={handleMonthChange}
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
      >
        <option value="">Todos los meses</option>
        <option value="01">Enero</option>
        <option value="02">Febrero</option>
        <option value="03">Marzo</option>
        <option value="04">Abril</option>
        <option value="05">Mayo</option>
        <option value="06">Junio</option>
        <option value="07">Julio</option>
        <option value="08">Agosto</option>
        <option value="09">Septiembre</option>
        <option value="10">Octubre</option>
        <option value="11">Noviembre</option>
        <option value="12">Diciembre</option>
      </select>

      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border p-2">Monto</th>
            <th className="border p-2">Categoría</th>
            <th className="border p-2">Observación</th>
            <th className="border p-2">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {filteredExpenses.map((expense) => (
            <tr key={expense.id}>
              <td className="border p-2">${expense.amount}</td>
              <td className="border p-2">{expense.category}</td>
              <td className="border p-2">{expense.observation}</td>
              <td className="border p-2">{new Date(expense.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}