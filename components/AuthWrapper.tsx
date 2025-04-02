// components/AuthWrapper.tsx
'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { User } from '@supabase/supabase-js'
import Auth from './Auth'
import ExpenseForm from './ExpenseForm'
import { FadeLoader } from 'react-spinners'

// Verificamos que las variables de entorno estén presentes
if (typeof window !== 'undefined') {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
}

export default function AuthWrapper() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  
  // Creamos el cliente de Supabase una sola vez
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    // Función para verificar el estado de autenticación
  // En AuthWrapper.tsx, modifica la función checkAuthState:

  const checkAuthState = async () => {
    try {
      setLoading(true);
      
      // Primero intentar obtener la sesión actual
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error al obtener la sesión:', sessionError.message);
        setAuthError(sessionError.message);
        return; // Salir si hay un error de sesión
      }
      
      // Si no hay sesión activa, simplemente configurar usuario como null
      if (!sessionData.session) {
        setUser(null);
        return; // No es necesario mostrar un error, solo no hay usuario autenticado
      }
      
      // Si hay sesión, verificar el usuario
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Error al verificar la autenticación:', error.message);
        setAuthError(error.message);
        
        // Si el error es por token inválido, limpiar la sesión
        if (error.message.includes('invalid token') || error.message.includes('not found')) {
          await supabase.auth.signOut();
        }
      } else {
        setUser(user);
      }
    } catch (error: any) {
      console.error('Error inesperado:', error);
      setAuthError('Ha ocurrido un error inesperado');
    } finally {
      setLoading(false);
    }
  }
    
    // Verificar estado inicial
    checkAuthState()

    // Suscribirse a cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      setAuthError(null) // Limpiar cualquier error cuando cambie el estado de autenticación
    })

    // Limpiar suscripción al desmontar
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  // Mostrar estado de carga
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <FadeLoader color="#4f46e5" />
          </div>
          <p className="text-gray-600 font-medium">Cargando tu perfil...</p>
        </div>
      </div>
    )
  }

  // Mostrar mensaje de error si ocurrió alguno
  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full">
          <div className="text-center text-red-600 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-center mb-4">Error de autenticación</h2>
          <p className="text-gray-600 text-center mb-6">{authError}</p>
          <button 
            onClick={() => setAuthError(null)}
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Volver a intentar
          </button>
        </div>
      </div>
    )
  }

  // Renderizar componente de autenticación o formulario de gastos
  return user ? <ExpenseForm /> : <Auth />
}