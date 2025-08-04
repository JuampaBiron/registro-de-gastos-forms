// lib/utils.ts

/**
 * Formatea un número como moneda chilena
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * Formatea una fecha en formato chileno
 */
export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('es-CL');
};

/**
 * Capitaliza la primera letra de una cadena
 */
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Convierte snake_case o kebab-case a texto legible
 */
export const formatCategoryName = (category: string): string => {
  return category.replace(/[_-]/g, ' ');
};

/**
 * Formatea números con separadores de miles (sin símbolo de moneda)
 */
export const formatNumber = (value: string | number): string => {
  const numericValue = typeof value === 'string' 
    ? value.replace(/[^\d]/g, '') 
    : value.toString();
    
  return new Intl.NumberFormat('es-CL').format(
    numericValue === '' || numericValue === '0' ? 0 : parseInt(numericValue.toString())
  );
};

/**
 * Formatea fecha para input date (YYYY-MM-DD)
 */
export const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Obtiene el nombre del mes desde una fecha en formato YYYY-MM-DD
 */
export const getMonthName = (dateStr: string): string => {
  const [year, month] = dateStr.split('-').map(part => parseInt(part));
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
};

/**
 * Formatea un mes desde formato YYYY-MM a texto legible
 */
export const formatMonth = (monthKey: string): string => {
  const [year, month] = monthKey.split('-');
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
};

/**
 * Maneja errores de Supabase y devuelve mensajes amigables
 */
export const handleSupabaseError = (error: unknown): string => {  // ✅ Solución
  const supabaseError = error as { code?: string; message?: string };
  
  if (supabaseError?.code === '23505') {
    return 'Ya existe un registro con estos datos';
  }
  
  if (supabaseError?.code === '42501') {
    return 'No tienes permisos para realizar esta acción';
  }

  return supabaseError?.message || 'Ha ocurrido un error inesperado';
};