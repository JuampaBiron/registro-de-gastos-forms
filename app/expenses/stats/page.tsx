// expenses/stats/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts'

interface Expense {
  id: number
  amount: number
  category: string
  observation: string
  created_at: string
  user_email: string
}

interface DailyExpense {
  day: number
  total: number
  segment: string
}

interface MonthlyTotal {
  month: string
  total: number
  [key: string]: number | string // Para categorías dinámicas
}

interface CategoryTotal {
  category: string
  total: number
  percentage: number
}

export default function ExpenseStats() {
  const [expenses, setExpenses] = useState<Expense[]>([]) // Store the raw expense data
  const [dailyExpenses, setDailyExpenses] = useState<DailyExpense[]>([])
  const [selectedMonth, setSelectedMonth] = useState('')
  const [availableMonths, setAvailableMonths] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [monthlyTotals, setMonthlyTotals] = useState<MonthlyTotal[]>([])
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([])
  
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
      } else if (data) {
        // Store the raw expense data
        setExpenses(data)
        
        const months = getAvailableMonths(data)
        setAvailableMonths(months)
        
        // Only proceed if we have months available
        if (months.length > 0) {
          setSelectedMonth(months[0])
          calculateStats(data)
          calculateDailyExpenses(data, months[0])
        }
      }
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchExpenses()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // When selectedMonth changes, recalculate the daily expenses
  useEffect(() => {
    if (selectedMonth && expenses.length > 0) {
      calculateDailyExpenses(expenses, selectedMonth)
    }
  }, [selectedMonth, expenses])

  const getAvailableMonths = (expenseData: Expense[]) => {
    const months = new Set<string>()
    expenseData.forEach(expense => {
      const date = new Date(expense.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      months.add(monthKey)
    })
    return Array.from(months).sort((a, b) => b.localeCompare(a))
  }

  const calculateStats = (expenseData: Expense[]) => {
    // Calcular totales por categoría y mes
    const monthData = new Map<string, Map<string, number>>()
    const categoryMap = new Map<string, number>()
    let totalAmount = 0
    
    expenseData.forEach(expense => {
      // Procesar datos mensuales
      const date = new Date(expense.created_at)
      const monthKey = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!monthData.has(monthKey)) {
        monthData.set(monthKey, new Map<string, number>())
      }
      
      const categoryMapForMonth = monthData.get(monthKey)!
      const currentAmount = categoryMapForMonth.get(expense.category) || 0
      categoryMapForMonth.set(expense.category, currentAmount + expense.amount)
      
      // Procesar totales por categoría
      const currentCategoryTotal = categoryMap.get(expense.category) || 0
      categoryMap.set(expense.category, currentCategoryTotal + expense.amount)
      totalAmount += expense.amount
    })

    // Convertir datos mensuales a formato para el gráfico
    const monthlyStats = Array.from(monthData.entries()).map(([month, categories]) => {
      const monthStats: MonthlyTotal = { month, total: 0 }
      let total = 0
      
      categories.forEach((amount, category) => {
        monthStats[category] = amount
        total += amount
      })
      
      monthStats.total = total
      return monthStats
    }).sort((a, b) => a.month.localeCompare(b.month))

    setMonthlyTotals(monthlyStats)

    // Convertir totales por categoría a formato para el gráfico
    const categoryStats = Array.from(categoryMap.entries()).map(([category, total]) => ({
      category,
      total,
      percentage: (total / totalAmount) * 100
    })).sort((a, b) => b.total - a.total)

    setCategoryTotals(categoryStats)
  }

  const calculateDailyExpenses = (expenseData: Expense[], monthKey: string) => {
    const dailyMap = new Map<number, number>()
    
    const [year, month] = monthKey.split('-').map(Number)
    const monthExpenses = expenseData.filter(expense => {
      const date = new Date(expense.created_at)
      return date.getFullYear() === year && date.getMonth() + 1 === month
    })

    monthExpenses.forEach(expense => {
      const date = new Date(expense.created_at)
      const day = date.getDate()
      const current = dailyMap.get(day) || 0
      dailyMap.set(day, current + expense.amount)
    })

    const dailyStats = Array.from(dailyMap.entries())
      .map(([day, total]) => ({
        day,
        total,
        segment: day <= 10 ? 'Inicio de mes' : day <= 20 ? 'Mitad de mes' : 'Fin de mes'
      }))
      .sort((a, b) => a.day - b.day)

    setDailyExpenses(dailyStats)
  }

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = e.target.value
    setSelectedMonth(newMonth)
    // Daily expenses will be recalculated by the useEffect hook
  }

  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-')
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]
    return `${monthNames[parseInt(month) - 1]} ${year}`
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg text-gray-600">Cargando estadísticas...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen bg-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Estadísticas de Gastos</h1>
        <Link 
          href="/expenses"
          className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
        >
          Volver a Gastos
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gráfico de Gastos Diarios */}
        <div className="bg-white p-6 rounded-lg shadow-md md:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Gastos Diarios del Mes</h2>
            <select
              value={selectedMonth}
              onChange={handleMonthChange}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableMonths.map(month => (
                <option key={month} value={month}>
                  {formatMonth(month)}
                </option>
              ))}
            </select>
          </div>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyExpenses}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="day"
                  label={{ value: 'Día del mes', position: 'insideBottom', offset: -10 }}
                />
                <YAxis
                  label={{ 
                    value: 'Monto ($)', 
                    angle: -90, 
                    position: 'insideLeft',
                    offset: -5
                  }}
                />
                <Tooltip 
                  formatter={(value: number) => `$${value.toLocaleString('es-CL')}`}
                  labelFormatter={(day) => `Día ${day}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  name="Gasto diario"
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Resumen por segmentos del mes */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            {['Inicio de mes', 'Mitad de mes', 'Fin de mes'].map(segment => {
              const segmentTotal = dailyExpenses
                .filter(exp => exp.segment === segment)
                .reduce((sum, exp) => sum + exp.total, 0)
              return (
                <div key={segment} className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-1">{segment}</h3>
                  <p className="text-lg font-semibold text-gray-900">
                    ${segmentTotal.toLocaleString('es-CL')}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Gráfico de Gastos Mensuales */}
        <div className="bg-white p-6 rounded-lg shadow-md md:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Gastos Mensuales</h2>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTotals}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month"
                  label={{ value: 'Mes', position: 'insideBottom', offset: -10 }}
                />
                <YAxis 
                  label={{ 
                    value: 'Monto ($)', 
                    angle: -90, 
                    position: 'insideLeft',
                    offset: -5
                  }}
                />
                <Tooltip 
                  formatter={(value: number) => `$${value.toLocaleString('es-CL')}`}
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
                />
                <Legend />
                {categoryTotals.map((category, index) => (
                  <Bar 
                    key={category.category}
                    dataKey={category.category}
                    name={category.category}
                    stackId="a"
                    fill={`hsl(${index * (360 / categoryTotals.length)}, 70%, 50%)`}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}