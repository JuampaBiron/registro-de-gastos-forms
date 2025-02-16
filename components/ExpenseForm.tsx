// components/ExpenseForm.tsx
'use client'

import React, { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { LogOut } from 'lucide-react'

export default function ExpenseForm() {
  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    observation: ''
  })
  const [message, setMessage] = useState('')
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user?.email) {
        setMessage('Por favor inicia sesión para registrar gastos')
        return
      }

      const { error } = await supabase
        .from('expenses')
        .insert([
          {
            amount: Number(formData.amount),
            category: formData.category,
            observation: formData.observation,
            user_email: user.email
          }
        ])

      if (error) throw error

      setMessage('Gasto registrado exitosamente')
      setFormData({ amount: '', category: '', observation: '' })
    } catch (error) {
      setMessage('Error al registrar el gasto')
      console.error(error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-6 flex flex-col justify-center">
      <div className="relative sm:max-w-xl sm:mx-auto w-full px-4">
        <div className="relative bg-white shadow-lg rounded-2xl">
          <div className="px-8 py-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Registro de Gastos</h2>
            <button
              onClick={handleLogout}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="px-8 py-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 block">
                  Monto
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="block w-full pl-8 pr-4 py-3 rounded-lg border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 block">
                  Categoría
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="block w-full px-4 py-3 rounded-lg border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900"
                  required
                >
                  <option value="">Selecciona una categoría</option>
                  <option value="alimentacion">🍽️ Alimentación</option>
                  <option value="transporte">🚗 Transporte</option>
                  <option value="servicios">🏠 Servicios</option>
                  <option value="entretenimiento">🎮 Entretenimiento</option>
                  <option value="otros">📦 Otros</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 block">
                  Observación
                </label>
                <textarea
                  value={formData.observation}
                  onChange={(e) => setFormData({...formData, observation: e.target.value})}
                  rows={3}
                  className="block w-full px-4 py-3 rounded-lg border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900"
                  placeholder="Añade detalles sobre este gasto..."
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Registrar Gasto
              </button>
            </form>

            {message && (
              <div 
                className={`mt-6 p-4 rounded-lg ${
                  message.includes('Error') 
                    ? 'bg-red-50 text-red-700' 
                    : 'bg-green-50 text-green-700'
                }`}
              >
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}