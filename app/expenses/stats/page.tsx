// expenses/stats/page.tsx
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
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { ArrowLeft, Wallet, Calendar, PieChart as PieChartIcon, BarChart2, TrendingUp } from 'lucide-react'

interface Expense {
  id: number
  amount: number
  category: string
  observation: string
  created_at: string
  user_email: string
  type: string
}

interface DailyExpense {
  day: number
  total: number
  segment: string
}

interface MonthlyTotal {
  month: string
  monthLabel: string
  total: number
  [key: string]: number | string // Para categorías dinámicas
}

interface CategoryTotal {
  category: string
  total: number
  percentage: number
}

const CHART_COLORS = [
  '#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', 
  '#d0ed57', '#ffc658', '#ff8042', '#ff6361', '#bc5090', 
  '#58508d', '#003f5c', '#444e86', '#955196', '#dd5182', 
  '#ff6e54', '#ffa600'
];

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

  // Función mejorada para evitar problemas de zona horaria
  const fixDateTimezone = (dateStr: string): Date => {
    // Obtener solo la parte de la fecha (YYYY-MM-DD)
    const datePart = dateStr.split('T')[0];
    // Crear una fecha a mediodía para evitar problemas de zona horaria
    return new Date(`${datePart}T12:00:00Z`);
  };

  const getAvailableMonths = (expenseData: Expense[]) => {
    const months = new Set<string>()
    expenseData.forEach(expense => {
      const date = fixDateTimezone(expense.created_at)
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
      const date = fixDateTimezone(expense.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthNames = [
        'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
        'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
      ]
      //const monthLabel = `${monthNames[date.getMonth()]} ${date.getFullYear()}`
      
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
      const monthNames = [
        'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
        'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
      ]
      const [year, monthNum] = month.split('-')
      const monthLabel = `${monthNames[parseInt(monthNum) - 1]} ${year}`
      
      const monthStats: MonthlyTotal = { month, monthLabel, total: 0 }
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
      const date = fixDateTimezone(expense.created_at)
      return date.getFullYear() === year && date.getMonth() + 1 === month
    })

    // Inicializar todos los días del mes con valor 0
    const daysInMonth = new Date(year, month, 0).getDate()
    for (let day = 1; day <= daysInMonth; day++) {
      dailyMap.set(day, 0)
    }

    monthExpenses.forEach(expense => {
      const date = fixDateTimezone(expense.created_at)
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

  // Formato de moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Cálculo de totales para el mes seleccionado
  const currentMonthTotal = dailyExpenses.reduce((sum, item) => sum + item.total, 0)

  // Personalización del Tooltip
  const CustomTooltip = ({ active, payload, label, formatter }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip bg-white p-3 border border-gray-200 shadow-md rounded-md">
          <p className="font-medium">{`${payload[0].payload.name || label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color }}>
              {`${entry.name}: ${formatter ? formatter(entry.value) : entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Componente personalizado para renderizar etiquetas en el gráfico circular
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return percent > 0.05 ? (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    ) : null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-6 flex flex-col justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="mt-2 text-gray-600">Cargando tus estadísticas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-6">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header principal */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link 
                href="/expenses" 
                className="flex items-center justify-center w-10 h-10 bg-white/20 text-white rounded-full hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors"
                title="Volver a Gastos"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-bold text-white">Estadísticas</h1>
            </div>
            <Link 
              href="/expenses/budget" 
              className="inline-flex items-center px-4 py-2 bg-white/20 text-white text-sm font-medium rounded-full hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors"
            >
              <Wallet className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Presupuestos</span>
            </Link>
          </div>

          {/* Selector de mes y resumen */}
          <div className="p-4 bg-gray-50 border-b">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div className="w-full sm:w-auto">
                <label htmlFor="monthSelect" className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Calendar className="w-4 h-4 mr-1 text-indigo-500" /> Mes
                </label>
                <select
                  id="monthSelect"
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  className="w-full sm:w-auto px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {availableMonths.map(month => (
                    <option key={month} value={month}>
                      {formatMonth(month)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                <div className="text-sm font-medium text-gray-700">Total del mes:</div>
                <div className="text-xl font-bold text-indigo-700 tabular-nums">
                  {formatCurrency(currentMonthTotal)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gráfico de Gastos Diarios */}
          <div className="bg-white p-6 rounded-3xl shadow-xl col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              <TrendingUp className="w-5 h-5 mr-2 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-800">Gastos Diarios</h2>
            </div>
            <div className="h-72 sm:h-80 md:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyExpenses}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="day"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    content={<CustomTooltip formatter={(value: number) => formatCurrency(value)} />}
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
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {['Inicio de mes', 'Mitad de mes', 'Fin de mes'].map(segment => {
                const segmentTotal = dailyExpenses
                  .filter(exp => exp.segment === segment)
                  .reduce((sum, exp) => sum + exp.total, 0)
                return (
                  <div key={segment} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h3 className="text-sm font-medium text-gray-700 mb-1">{segment}</h3>
                    <p className="text-lg font-semibold text-indigo-700 tabular-nums">
                      {formatCurrency(segmentTotal)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Gráfico de distribución por categorías (Pie Chart) */}
          <div className="bg-white p-6 rounded-3xl shadow-xl">
            <div className="flex items-center mb-4">
              <PieChartIcon className="w-5 h-5 mr-2 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-800">Distribución por Categorías</h2>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryTotals}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="total"
                    nameKey="category"
                  >
                    {categoryTotals.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend layout="vertical" align="right" verticalAlign="middle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico de Gastos Mensuales */}
          <div className="bg-white p-6 rounded-3xl shadow-xl">
            <div className="flex items-center mb-4">
              <BarChart2 className="w-5 h-5 mr-2 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-800">Gastos Mensuales</h2>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTotals}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="monthLabel"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="total"
                    name="Total"
                    fill="#8884d8"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}