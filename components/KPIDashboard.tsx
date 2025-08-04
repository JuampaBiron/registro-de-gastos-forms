// components/KPIDashboard.tsx - VERSIÓN ACTUALIZADA
'use client'

import React from 'react';
import { TrendingUp, TrendingDown, Target, Calendar, DollarSign, AlertTriangle, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { KPIData } from '@/lib/statsCalculations';

interface KPICardProps {
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  subtitle?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  tooltip?: string; // Nuevo: para explicar cálculos
}

const KPICard: React.FC<KPICardProps> = ({ 
  title, 
  value, 
  change, 
  trend, 
  icon, 
  subtitle,
  color = 'blue',
  tooltip 
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700'
  };

  const iconColorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600',
    purple: 'text-purple-600'
  };

  return (
    <div className={`p-4 rounded-xl border-2 ${colorClasses[color]} transition-all hover:shadow-md hover:scale-105 duration-200 relative group`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg bg-white ${iconColorClasses[color]} shadow-sm`}>
          {icon}
        </div>
        <div className="flex items-center space-x-2">
          {change && (
            <div className={`flex items-center text-sm font-medium ${
              trend === 'up' ? 'text-red-600' : trend === 'down' ? 'text-green-600' : 'text-gray-600'
            }`}>
              {trend === 'up' && <TrendingUp className="w-4 h-4 mr-1" />}
              {trend === 'down' && <TrendingDown className="w-4 h-4 mr-1" />}
              {change}
            </div>
          )}
          {tooltip && (
            <div className="relative">
              <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
              <div className="absolute bottom-full right-0 mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                {tooltip}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
        {subtitle && (
          <p className="text-xs text-gray-500">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

interface KPIDashboardProps {
  data: KPIData;
  insights?: string[];
}

const KPIDashboard: React.FC<KPIDashboardProps> = ({ data, insights = [] }) => {
  // Calcular el cambio porcentual
  const monthlyChange = data.totalLastMonth > 0 
    ? ((data.totalThisMonth - data.totalLastMonth) / data.totalLastMonth * 100).toFixed(1)
    : '0';
  
  const monthlyTrend = parseFloat(monthlyChange) > 0 ? 'up' : parseFloat(monthlyChange) < 0 ? 'down' : 'neutral';
  
  // Determinar el color del presupuesto
  const budgetColor = data.budgetUsage > 100 ? 'red' : data.budgetUsage > 80 ? 'yellow' : 'green';
  
  // Calcular días promedio de gasto
  const daysIntoMonth = new Date().getDate();
  const spendingRate = data.totalThisMonth / daysIntoMonth;

  // Determinar color de la proyección basado en qué tan realista es
  const projectionMultiplier = data.projectedMonthlyTotal / data.totalThisMonth;
  const projectionColor = projectionMultiplier > 3 ? 'red' : projectionMultiplier > 2 ? 'yellow' : 'green';
  
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">📊 Resumen del Mes</h2>
        <div className="text-sm text-gray-500">
          Actualizado: {new Date().toLocaleDateString('es-CL', { 
            day: 'numeric', 
            month: 'long', 
            hour: '2-digit', 
            minute: '2-digit'
          })}
        </div>
      </div>
      
      {/* Grid de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total del mes */}
        <KPICard
          title="Total del Mes"
          value={formatCurrency(data.totalThisMonth)}
          change={monthlyChange !== '0' ? `${parseFloat(monthlyChange) > 0 ? '+' : ''}${monthlyChange}%` : undefined}
          trend={monthlyTrend}
          icon={<DollarSign className="w-5 h-5" />}
          subtitle="vs mes anterior"
          color="blue"
        />
        
        {/* Uso del presupuesto */}
        <KPICard
          title="Presupuesto Usado"
          value={`${data.budgetUsage.toFixed(1)}%`}
          icon={<Target className="w-5 h-5" />}
          subtitle={
            data.budgetRemaining > 0 
              ? `Quedan ${formatCurrency(data.budgetRemaining)}` 
              : data.budgetRemaining < 0 
                ? `Excedido por ${formatCurrency(Math.abs(data.budgetRemaining))}` 
                : 'Sin presupuesto definido'
          }
          color={budgetColor}
          tooltip="Porcentaje del presupuesto total utilizado este mes"
        />
        
        {/* Promedio diario */}
        <KPICard
          title="Promedio Diario"
          value={formatCurrency(data.avgDailySpending)}
          icon={<Calendar className="w-5 h-5" />}
          subtitle={`Basado en ${daysIntoMonth} días`}
          color="purple"
          tooltip={`Total gastado (${formatCurrency(data.totalThisMonth)}) dividido por días transcurridos (${daysIntoMonth})`}
        />
        
        {/* Proyección mejorada */}
        <KPICard
          title="Proyección Fin de Mes"
          value={formatCurrency(data.projectedMonthlyTotal)}
          change={data.projectedMonthlyTotal > data.totalThisMonth ? 
            `+${formatCurrency(data.projectedMonthlyTotal - data.totalThisMonth)} estimado` : undefined}
          icon={<TrendingUp className="w-5 h-5" />}
          subtitle={`${data.daysUntilMonthEnd} días restantes • ${data.projectionMethod}`}
          color={projectionColor}
          tooltip={`Método de cálculo: ${data.projectionMethod}. Esta proyección considera patrones de gasto más realistas que un simple promedio diario.`}
        />
      </div>
      
      {/* Panel de insights mejorado */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-4">
            <div className="flex items-center mb-2">
              <div className="p-1 bg-indigo-100 rounded-lg mr-2">
                <AlertTriangle className="w-4 h-4 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-indigo-800">💡 Insight Principal</h3>
            </div>
            <p className="text-sm text-indigo-700 leading-relaxed">
              {insights[0]}
            </p>
          </div>
          
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-center mb-2">
              <div className="p-1 bg-yellow-100 rounded-lg mr-2">
                <TrendingUp className="w-4 h-4 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-yellow-800">📊 Análisis de Proyección</h3>
            </div>
            <p className="text-sm text-yellow-700 leading-relaxed">
              <strong>Método:</strong> {data.projectionMethod}<br/>
              <strong>Estimado:</strong> {formatCurrency(data.projectedMonthlyTotal)}
              {data.projectedMonthlyTotal > data.totalThisMonth * 2 && (
                <span className="block mt-1 font-medium text-yellow-800">
                  ⚠️ Proyección alta - considera ajustar gastos diarios.
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Estadísticas adicionales */}
      <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-600">Categoría Top</p>
            <p className="font-semibold text-gray-800">{data.topCategory}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Días Transcurridos</p>
            <p className="font-semibold text-gray-800">{daysIntoMonth} días</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Días Restantes</p>
            <p className="font-semibold text-gray-800">{data.daysUntilMonthEnd} días</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Ritmo Diario</p>
            <p className="font-semibold text-gray-800">{formatCurrency(spendingRate)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KPIDashboard;