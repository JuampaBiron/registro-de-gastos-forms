// constants/categories.ts

export const CATEGORY_EMOJIS = {
  'Casa': '🏠',
  'Supermercado': '🛒',
  'Restaurant': '🍽️',
  'Hobby': '🎨',
  'Cuidado personal': '💅',
  'Suscripciones': '📱',
  'Carrete': '🎉',
  'Arriendo': '🏢',
  'Cuentas': '📋',
  'Viajes': '✈️',
  'Traslados': '🚗',
  'Mascotas': '🐾',
  'Regalos': '🎁',
  'Otros': '📦'
} as const;

export const EXPENSE_TYPES = {
  INDIVIDUAL: 'Individual',
  COMPARTIDO: 'Compartido'
} as const;

// Lista de categorías para formularios
export const CATEGORIES = Object.keys(CATEGORY_EMOJIS) as Array<keyof typeof CATEGORY_EMOJIS>;

// Función helper para obtener emoji de categoría
export const getCategoryEmoji = (category: string): string => {
  return CATEGORY_EMOJIS[category as keyof typeof CATEGORY_EMOJIS] || '📦';
};