// components/ExpenseList.tsx - TIPOS CORREGIDOS
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trash2, Wallet, Filter, Calendar, Tag, Edit3, Save, X, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

// Importar nuestras utilidades y constantes
import { getCategoryEmoji, CATEGORIES } from '@/constants/categories';
import { formatCurrency, formatDate, handleSupabaseError, formatNumber } from '@/lib/utils';
import type { Expense } from '@/lib/types';
import { createBrowserClient } from '@supabase/ssr';

interface YearMonth {
  year: number;
  month: string;
  label: string;
}

interface EditExpenseData {
  category: string;
  amount: string; // String para manejar el formato con separadores
  type: 'Individual' | 'Compartido';
  observation: string;
  date: string; // Fecha en formato YYYY-MM-DD
}

export default function ExpenseList() {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0');
  const defaultYearMonth = `${currentYear}-${currentMonth}`;
  
  // Estados principales
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [selectedYearMonth, setSelectedYearMonth] = useState(defaultYearMonth);
  const [availableYearMonths, setAvailableYearMonths] = useState<YearMonth[]>([]);
  
  // Estados para modales
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  
  // Estados para edición
  const [showEditModal, setShowEditModal] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [editFormData, setEditFormData] = useState<EditExpenseData>({
    category: '',
    amount: '',
    type: 'Individual',
    observation: '',
    date: ''
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  
  // Estados para filtros
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Cliente de Supabase
  const supabase = typeof window !== 'undefined' ? 
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ) : null;

  // Cargar gastos
  const fetchExpenses = async () => {
    if (!supabase) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('Usuario no autenticado');
        return;
      }

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_email', user.email)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error al cargar gastos:', error);
        return;
      }

      if (data) {
        setExpenses(data);
        generateAvailableYearMonths(data);
      }
    } catch (error) {
      console.error('Error inesperado al cargar gastos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generar lista de años/meses disponibles
  const generateAvailableYearMonths = (expenses: Expense[]) => {
    const yearMonthSet = new Set<string>();
    
    expenses.forEach(expense => {
      const date = new Date(expense.created_at);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      yearMonthSet.add(`${year}-${month}`);
    });

    const yearMonths: YearMonth[] = Array.from(yearMonthSet)
      .sort((a, b) => b.localeCompare(a))
      .map(yearMonth => {
        const [year, month] = yearMonth.split('-');
        const monthNames = [
          'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        return {
          year: parseInt(year),
          month,
          label: `${monthNames[parseInt(month) - 1]} ${year}`
        };
      });

    setAvailableYearMonths(yearMonths);
  };

  // Filtrar gastos
  const filterExpenses = () => {
    let filtered = expenses;

    if (selectedYearMonth) {
      filtered = filtered.filter(expense => {
        const expenseDate = new Date(expense.created_at);
        const expenseYearMonth = `${expenseDate.getFullYear()}-${(expenseDate.getMonth() + 1).toString().padStart(2, '0')}`;
        return expenseYearMonth === selectedYearMonth;
      });
    }

    if (selectedCategory) {
      filtered = filtered.filter(expense => expense.category === selectedCategory);
    }

    if (selectedType) {
      filtered = filtered.filter(expense => expense.type === selectedType);
    }

    setFilteredExpenses(filtered);
    
    const total = filtered.reduce((sum, expense) => sum + expense.amount, 0);
    setTotalAmount(total);
  };

  // Event handlers existentes
  const handleYearMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYearMonth(e.target.value);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedType(e.target.value);
  };

  const resetFilters = () => {
    setSelectedCategory('');
    setSelectedType('');
    setSelectedYearMonth(defaultYearMonth);
  };

  // Manejar eliminación
  const handleDeleteClick = (expense: Expense) => {
    setExpenseToDelete(expense);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!expenseToDelete || !supabase) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseToDelete.id);

      if (error) {
        console.error('Error al eliminar gasto:', error);
        const errorMessage = handleSupabaseError(error);
        alert(errorMessage);
        return;
      }

      setExpenses(prev => prev.filter(e => e.id !== expenseToDelete.id));
      setShowDeleteModal(false);
      setExpenseToDelete(null);
    } catch (error) {
      console.error('Error inesperado al eliminar gasto:', error);
      alert('Error inesperado al eliminar el gasto');
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setExpenseToDelete(null);
  };

  // Funciones para edición
  const handleEditClick = (expense: Expense) => {
    setExpenseToEdit(expense);
    // Convertir la fecha del gasto al formato YYYY-MM-DD para el input date
    const expenseDate = new Date(expense.created_at);
    const formattedDate = expenseDate.toISOString().split('T')[0];
    
    setEditFormData({
      category: expense.category,
      amount: expense.amount.toString(),
      type: expense.type as 'Individual' | 'Compartido',
      observation: expense.observation || '',
      date: formattedDate
    });
    setShowEditModal(true);
  };

  const handleEditFormChange = (field: keyof EditExpenseData, value: string) => {
    if (field === 'amount') {
      // Manejar formato de números con separadores
      const numericValue = value.replace(/[^\d]/g, '');
      setEditFormData(prev => ({
        ...prev,
        [field]: numericValue
      }));
    } else {
      setEditFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const submitEditExpense = async () => {
    if (!expenseToEdit || !supabase) return;

    // Validación básica
    if (!editFormData.category || !editFormData.amount || !editFormData.date) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    const numericAmount = parseInt(editFormData.amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert('Por favor ingresa un monto válido');
      return;
    }

    setIsSubmittingEdit(true);

    try {
      // 🔧 CORREGIDO: Datos para actualizar en Supabase
      // Crear timestamp con zona horaria de Santiago para la fecha editada
      const dateWithTimezone = editFormData.date + 'T12:00:00-03:00'; // Mediodía en Santiago
      
      const updateDataForSupabase = {
        category: editFormData.category,
        amount: numericAmount,
        type: editFormData.type,
        observation: editFormData.observation.trim() || null, // null para Supabase
        created_at: dateWithTimezone
      };

      const { error } = await supabase
        .from('expenses')
        .update(updateDataForSupabase)
        .eq('id', expenseToEdit.id);

      if (error) {
        console.error('Error al actualizar gasto:', error);
        const errorMessage = handleSupabaseError(error);
        alert(errorMessage);
        return;
      }

      // 🔧 CORREGIDO: Actualizar estado local con tipos compatibles
      setExpenses(prev => 
        prev.map(expense => 
          expense.id === expenseToEdit.id 
            ? {
                ...expense,
                category: editFormData.category,
                amount: numericAmount,
                type: editFormData.type,
                // Convertir null a undefined para compatibilidad con el tipo Expense
                observation: editFormData.observation.trim() || undefined,
                created_at: dateWithTimezone
              }
            : expense
        )
      );

      // Cerrar modal
      setShowEditModal(false);
      setExpenseToEdit(null);
      setEditFormData({
        category: '',
        amount: '',
        type: 'Individual',
        observation: '',
        date: ''
      });

    } catch (error) {
      console.error('Error inesperado al actualizar gasto:', error);
      alert('Error inesperado al actualizar el gasto');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const cancelEdit = () => {
    setShowEditModal(false);
    setExpenseToEdit(null);
    setEditFormData({
      category: '',
      amount: '',
      type: 'Individual',
      observation: '',
      date: ''
    });
  };

  // Función para exportar gastos a Excel
  const exportToExcel = () => {
    if (filteredExpenses.length === 0) {
      alert('No hay gastos para exportar con los filtros seleccionados.');
      return;
    }

    // Preparar datos para Excel
    const excelData = filteredExpenses.map(expense => ({
      'Fecha': formatDate(expense.created_at),
      'Categoría': expense.category,
      'Monto': expense.amount,
      'Tipo': expense.type,
      'Observación': expense.observation || '',
    }));

    // Agregar fila de totales
    const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    excelData.push({
      'Fecha': 'TOTAL',
      'Categoría': '',
      'Monto': totalAmount,
      'Tipo': 'Individual' as const, // Usar un tipo válido para evitar error de TypeScript
      'Observación': '',
    });

    // Crear workbook y worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Gastos');

    // Configurar estilos para el total
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    const totalRow = range.e.r;
    
    // Generar nombre de archivo con fecha actual y filtros
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    let filename = `gastos_${dateStr}`;
    
    if (selectedYearMonth) {
      const [year, month] = selectedYearMonth.split('-');
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      filename += `_${monthNames[parseInt(month) - 1]}_${year}`;
    }
    
    if (selectedCategory) {
      filename += `_${selectedCategory.replace(/\s+/g, '_')}`;
    }
    
    if (selectedType) {
      filename += `_${selectedType}`;
    }
    
    filename += '.xlsx';

    // Descargar archivo
    XLSX.writeFile(wb, filename);
  };

  // Efectos
  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    filterExpenses();
  }, [expenses, selectedYearMonth, selectedCategory, selectedType]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-6 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent mb-4"></div>
          <p className="text-gray-600 font-medium text-lg">Cargando gastos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-6 flex flex-col justify-center">
      <div className="max-w-6xl mx-auto w-full px-4">
        <div className="bg-white shadow-xl rounded-3xl overflow-hidden">
          
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
            </div>
          </div>

          {/* Filtros */}
          <div className="p-6 bg-gray-50 border-b space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label htmlFor="yearMonth" className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Calendar className="w-4 h-4 mr-1 text-indigo-500" /> Mes
                </label>
                <select
                  id="yearMonth"
                  value={selectedYearMonth}
                  onChange={handleYearMonthChange}
                  className="w-full px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Todos los meses</option>
                  {availableYearMonths.map(yearMonth => (
                    <option key={`${yearMonth.year}-${yearMonth.month}`} value={`${yearMonth.year}-${yearMonth.month}`}>
                      {yearMonth.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="category" className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Tag className="w-4 h-4 mr-1 text-indigo-500" /> Categoría
                </label>
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  className="w-full px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Todas las categorías</option>
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>
                      {getCategoryEmoji(category)} {category}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="type" className="text-sm font-medium text-gray-700 mb-1 flex items-center">
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
            </div>
            
            <div className="flex justify-between items-center">
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-sm font-medium text-indigo-600 bg-white border border-indigo-300 rounded-lg hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              >
                Limpiar filtros
              </button>
              
              <button
                onClick={exportToExcel}
                disabled={filteredExpenses.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar Excel
              </button>
              
              <div className="p-2 px-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-600 mr-2">Total:</span>
                  <span className="text-lg font-bold text-indigo-700 tabular-nums">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Contenido principal */}
          <div className="p-6">
            {filteredExpenses.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-600">No hay gastos para mostrar con los filtros actuales.</p>
              </div>
            ) : (
              <>
                {/* Tabla para desktop */}
                <div className="hidden lg:block overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
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
                            {formatDate(expense.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="mr-3 text-lg">
                                {getCategoryEmoji(expense.category)}
                              </span>
                              <span className="text-sm font-medium text-gray-900">
                                {expense.category}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              expense.type === 'Individual' 
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {expense.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 tabular-nums">
                            {formatCurrency(expense.amount)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                            {expense.observation || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleEditClick(expense)}
                                className="text-indigo-600 hover:text-indigo-800 transition-colors p-1 rounded-full hover:bg-indigo-50"
                                title="Editar gasto"
                              >
                                <Edit3 className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(expense)}
                                className="text-red-600 hover:text-red-800 transition-colors p-1 rounded-full hover:bg-red-50"
                                title="Eliminar gasto"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Vista de tarjetas para móviles */}
                <div className="lg:hidden divide-y divide-gray-200">
                  {filteredExpenses.map((expense) => (
                    <div key={expense.id} className="p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-500">
                          {formatDate(expense.created_at)}
                        </span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditClick(expense)}
                            className="text-indigo-600 hover:text-indigo-800 transition-colors p-1 rounded-full hover:bg-indigo-50"
                            title="Editar gasto"
                          >
                            <Edit3 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(expense)}
                            className="text-red-600 hover:text-red-800 transition-colors p-1 rounded-full hover:bg-red-50"
                            title="Eliminar gasto"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center">
                          <span className="mr-2 text-lg">{getCategoryEmoji(expense.category)}</span>
                          <span className="font-medium text-gray-900">{expense.category}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          expense.type === 'Individual' 
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {expense.type}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-gray-900 tabular-nums">
                          {formatCurrency(expense.amount)}
                        </span>
                        {expense.observation && (
                          <span className="text-sm text-gray-500 ml-2 truncate max-w-xs">
                            {expense.observation}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal de edición */}
      {showEditModal && expenseToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Editar Gasto</h3>
              <button
                onClick={cancelEdit}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <select
                  value={editFormData.category}
                  onChange={(e) => handleEditFormChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Selecciona una categoría</option>
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>
                      {getCategoryEmoji(category)} {category}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Monto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">$</span>
                  </div>
                  <input
                    type="text"
                    value={formatNumber(editFormData.amount)}
                    onChange={(e) => handleEditFormChange('amount', e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0"
                    inputMode="numeric"
                  />
                </div>
              </div>
              
              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de gasto
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleEditFormChange('type', 'Individual')}
                    className={`p-3 text-sm font-medium rounded-lg border-2 transition-all ${
                      editFormData.type === 'Individual'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                        : 'border-gray-200 text-gray-700 hover:border-indigo-300'
                    }`}
                  >
                    Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEditFormChange('type', 'Compartido')}
                    className={`p-3 text-sm font-medium rounded-lg border-2 transition-all ${
                      editFormData.type === 'Compartido'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                        : 'border-gray-200 text-gray-700 hover:border-indigo-300'
                    }`}
                  >
                    Compartido
                  </button>
                </div>
              </div>
              
              {/* Fecha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha del gasto
                </label>
                <input
                  type="date"
                  value={editFormData.date}
                  onChange={(e) => handleEditFormChange('date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              {/* Observación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observación
                </label>
                <textarea
                  value={editFormData.observation}
                  onChange={(e) => handleEditFormChange('observation', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Detalles adicionales..."
                />
              </div>
            </div>
            
            <div className="flex space-x-3 justify-end mt-6">
              <button
                onClick={cancelEdit}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Cancelar
              </button>
              <button
                onClick={submitEditExpense}
                disabled={isSubmittingEdit}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmittingEdit ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar */}
      {showDeleteModal && expenseToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Confirmar eliminación
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              ¿Estás seguro de que quieres eliminar este gasto?
            </p>
            <div className="bg-gray-50 p-3 rounded-lg mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="mr-2 text-lg">{getCategoryEmoji(expenseToDelete.category)}</span>
                  <span className="font-medium">{expenseToDelete.category}</span>
                </div>
                <span className="font-bold text-gray-900">
                  {formatCurrency(expenseToDelete.amount)}
                </span>
              </div>
              {expenseToDelete.observation && (
                <p className="text-sm text-gray-600 mt-1">
                  {expenseToDelete.observation}
                </p>
              )}
            </div>
            <div className="flex space-x-3 justify-end">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}