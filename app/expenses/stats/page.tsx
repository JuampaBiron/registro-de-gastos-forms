// app/expenses/stats/page.tsx - VERSIÓN CORREGIDA (con filtros por mes)
'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { ArrowLeft, Download, RefreshCw, TrendingUp, PieChart as PieChartIcon, BarChart2 } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts'

// Importar nuestras utilidades y componentes
import { formatCurrency, formatMonth } from '@/lib/utils'
import { calculateKPIs, generateInsights, type KPIData } from '@/lib/statsCalculations'
import type { Expense, Budget } from '@/lib/types'
import KPIDashboard from '@/components/KPIDashboard'

// Interfaces existentes
interface DailyExpense {
  day: number
  total: number
  segment: string
}

interface MonthlyTotal {
  month: string
  monthLabel: string
  total: number
}

interface CategoryTotal {
  category: string
  total: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    value: number; 
    name: string;
    color: string;
    payload: Record<string, unknown>;  
  }>
  label?: string
  formatter?: (value: number) => string
}

interface RenderCustomizedLabelProps {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  percent: number
}

export default function StatsPageWithKPIs() {
  // Estados existentes
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [availableMonths, setAvailableMonths] = useState<string[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [dailyExpenses, setDailyExpenses] = useState<DailyExpense[]>([])
  const [monthlyTotals, setMonthlyTotals] = useState<MonthlyTotal[]>([])
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([])
  
  // Nuevos estados para KPIs
  const [kpiData, setKpiData] = useState<KPIData | null>(null)
  const [insights, setInsights] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Colores para gráficos
  const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0', '#ffb347']

  // Cargar todos los datos
  const fetchData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.log('Usuario no autenticado')
        return
      }

      // Cargar gastos
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_email', user.email)
        .order('created_at', { ascending: false })

      if (expenseError) {
        console.error('Error al cargar gastos:', expenseError)
        return
      }

      // Cargar presupuestos
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_email', user.email)

      if (budgetError) {
        console.error('Error al cargar presupuestos:', budgetError)
        return
      }

      if (expenseData) {
        setExpenses(expenseData)
        setBudgets(budgetData || [])
        generateAvailableMonths(expenseData)
        generateMonthlyTotals(expenseData) // Esta sí debe mostrar todos los meses
      }
    } catch (error) {
      console.error('Error inesperado al cargar datos:', error)
    } finally {
      setLoading(false)
    }
  }

  // Generar meses disponibles
  const generateAvailableMonths = (expenses: Expense[]) => {
    const monthsSet = new Set<string>()
    
    expenses.forEach(expense => {
      const date = new Date(expense.created_at)
      const year = date.getFullYear()
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      monthsSet.add(`${year}-${month}`)
    })

    const months = Array.from(monthsSet).sort((a, b) => b.localeCompare(a))
    setAvailableMonths(months)
    
    if (months.length > 0 && !selectedMonth) {
      setSelectedMonth(months[0])
    }
  }

  // Esta función debe mostrar TODOS los meses (para el gráfico de barras mensuales)
  const generateMonthlyTotals = (expenses: Expense[]) => {
    const monthlyMap = new Map<string, number>()
    
    expenses.forEach(expense => {
      const date = new Date(expense.created_at)
      const year = date.getFullYear()
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const monthKey = `${year}-${month}`
      
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + expense.amount)
    })

    const monthlyTotals: MonthlyTotal[] = Array.from(monthlyMap.entries())
      .map(([month, total]) => ({
        month,
        monthLabel: formatMonth(month),
        total
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    setMonthlyTotals(monthlyTotals)
  }

  // 🚀 NUEVA FUNCIÓN: Generar categorías FILTRADAS por mes seleccionado
  const generateCategoryTotals = (expenses: Expense[], selectedMonth: string) => {
    // Filtrar gastos del mes seleccionado
    const monthExpenses = expenses.filter(expense => {
      const date = new Date(expense.created_at)
      const year = date.getFullYear()
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const expenseMonth = `${year}-${month}`
      return expenseMonth === selectedMonth
    })

    const categoryMap = new Map<string, number>()
    
    // Solo procesar gastos del mes seleccionado
    monthExpenses.forEach(expense => {
      categoryMap.set(expense.category, (categoryMap.get(expense.category) || 0) + expense.amount)
    })

    const categoryTotals: CategoryTotal[] = Array.from(categoryMap.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8) // Mostrar hasta 8 categorías

    setCategoryTotals(categoryTotals)
  }

  const generateDailyExpenses = (expenses: Expense[], month: string) => {
    const dailyMap = new Map<number, number>()
    
    const filteredExpenses = expenses.filter(expense => {
      const date = new Date(expense.created_at)
      const year = date.getFullYear()
      const expenseMonth = (date.getMonth() + 1).toString().padStart(2, '0')
      return `${year}-${expenseMonth}` === month
    })

    filteredExpenses.forEach(expense => {
      const day = new Date(expense.created_at).getDate()
      dailyMap.set(day, (dailyMap.get(day) || 0) + expense.amount)
    })

    const dailyStats: DailyExpense[] = Array.from(dailyMap.entries())
      .map(([day, total]) => ({
        day,
        total,
        segment: day <= 10 ? 'Inicio de mes' : day <= 20 ? 'Mitad de mes' : 'Fin de mes'
      }))
      .sort((a, b) => a.day - b.day)

    setDailyExpenses(dailyStats)
  }

  // Event handlers
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = e.target.value
    setSelectedMonth(newMonth)
  }

  const handleRefresh = () => {
    fetchData()
  }

  const handleExport = () => {
    // Función básica de exportación
    const data = {
      month: selectedMonth,
      monthLabel: formatMonth(selectedMonth),
      kpis: kpiData,
      dailyExpenses,
      categoryTotals,
      insights
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `estadisticas-${selectedMonth}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Componentes de tooltip
  const CustomTooltip: React.FC<CustomTooltipProps> = ({ 
    active, 
    payload, 
    label, 
    formatter 
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip bg-white p-3 border border-gray-200 shadow-md rounded-md">
          <p className="font-medium">{`${payload[0].payload.name || label}`}</p>
          {payload.map((entry, index) => (
            <p key={`item-${index}`} style={{ color: entry.color }}>
              {`${entry.name}: ${formatter ? formatter(entry.value) : entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = ({ 
    cx, 
    cy, 
    midAngle, 
    innerRadius, 
    outerRadius, 
    percent 
  }: RenderCustomizedLabelProps) => {
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
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    ) : null;
  };

  // Calcular KPIs cuando cambien los datos
  useEffect(() => {
    if (expenses.length > 0 && selectedMonth) {
      const kpis = calculateKPIs(expenses, budgets, selectedMonth)
      const generatedInsights = generateInsights(expenses, budgets, kpis)
      
      setKpiData(kpis)
      setInsights(generatedInsights)
    }
  }, [expenses, budgets, selectedMonth])

  // Efectos
  useEffect(() => {
    fetchData()
  }, [])

  // 🚀 ACTUALIZADO: Generar datos cuando cambie el mes seleccionado
  useEffect(() => {
    if (selectedMonth && expenses.length > 0) {
      generateDailyExpenses(expenses, selectedMonth)
      generateCategoryTotals(expenses, selectedMonth) // ¡Ahora filtra por mes!
    }
  }, [selectedMonth, expenses])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-6 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent mb-4"></div>
          <p className="text-gray-600 font-medium text-lg">Cargando estadísticas avanzadas...</p>
        </div>
      </div>
    )
  }

  const currentMonthTotal = dailyExpenses.reduce((sum, item) => sum + item.total, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-6">
      <div className="container mx-auto max-w-7xl px-4">
        
        {/* Header mejorado */}
        <div className="bg-white rounded-3xl shadow-xl mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <Link 
                  href="/expenses" 
                  className="flex items-center justify-center w-10 h-10 bg-white/20 text-white rounded-full hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors"
                  title="Volver a Gastos"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-2xl font-bold text-white">📊 Estadísticas Avanzadas</h1>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleRefresh}
                  className="p-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
                  title="Actualizar datos"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
                <button
                  onClick={handleExport}
                  className="p-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
                  title="Exportar datos"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Controles */}
          <div className="p-6 bg-gray-50 border-b">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <label htmlFor="month-select" className="block text-sm font-medium text-gray-700 mb-1">
                  📅 Período de análisis:
                </label>
                <select
                  id="month-select"
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                >
                  {availableMonths.map(month => (
                    <option key={month} value={month}>
                      {formatMonth(month)}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Insight rápido */}
              {insights.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-md">
                  <div className="flex items-center mb-1">
                    <span className="text-blue-600 mr-1">💡</span>
                    <h3 className="text-xs font-medium text-blue-800">Insight Principal</h3>
                  </div>
                  <p className="text-xs text-blue-700 leading-relaxed">{insights[0]}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dashboard de KPIs */}
        {kpiData && (
          <div className="bg-white rounded-3xl shadow-xl mb-6 p-6">
            <KPIDashboard data={kpiData} insights={insights} />
          </div>
        )}

        {/* Gráficos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Gráfico de Gastos Diarios */}
          <div className="bg-white p-6 rounded-3xl shadow-xl col-span-1 md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-indigo-600" />
                Gastos Diarios - {formatMonth(selectedMonth)}
              </h2>
              <div className="text-sm text-gray-500">
                Total: {formatCurrency(currentMonthTotal)}
              </div>
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
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#8884d8' }}
                    activeDot={{ r: 7 }}
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
                  <div key={segment} className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
                    <h3 className="text-sm font-medium text-gray-700 mb-1">{segment}</h3>
                    <p className="text-lg font-bold text-indigo-700 tabular-nums">
                      {formatCurrency(segmentTotal)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 🚀 GRÁFICO DE CATEGORÍAS ACTUALIZADO - Ahora filtra por mes */}
          <div className="bg-white p-6 rounded-3xl shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <PieChartIcon className="w-5 h-5 mr-2 text-indigo-600" />
                Distribución por Categorías
              </h2>
              <div className="text-sm text-gray-500">
                {formatMonth(selectedMonth)}
              </div>
            </div>
            <div className="h-80">
              {categoryTotals.length > 0 ? (
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
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <PieChartIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Sin gastos en {formatMonth(selectedMonth)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Gráfico de Gastos Mensuales (este SÍ debe mostrar todos los meses) */}
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