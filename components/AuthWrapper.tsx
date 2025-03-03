// components/AuthWrapper.tsx
'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { User } from '@supabase/supabase-js'
import Auth from './Auth'
import ExpenseForm from './ExpenseForm'
import { FadeLoader } from 'react-spinners'

// Verificamos que las variables de entorno estén presentes
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export default function AuthWrapper() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const supabaseAuth = supabase.auth
    
    const getUser = async () => {
      try {
        setLoading(true)
        const { data: { user } } = await supabaseAuth.getUser()
        setUser(user)
      } catch (error) {
        console.error('Error checking auth state:', error)
      } finally {
        setLoading(false)
      }
    }
    
    getUser()

    const { data: { subscription } } = supabaseAuth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  // Estado de carga mientras verificamos la autenticación
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <FadeLoader color="#4f46e5" />
          <p className="mt-4 text-gray-600">Cargando tu perfil...</p>
        </div>
      </div>
    )
  }

  return user ? <ExpenseForm /> : <Auth />
}