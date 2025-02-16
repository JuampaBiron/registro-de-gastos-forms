'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { User } from '@supabase/supabase-js'
import Auth from './Auth'
import ExpenseForm from './ExpenseForm'

// Logs temporales para depuración
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('SUPABASE_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 5) + '...') // Solo mostramos los primeros 5 caracteres por seguridad

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export default function AuthWrapper() {
  const [user, setUser] = useState<User | null>(null)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const supabaseAuth = supabase.auth
    
    const getUser = async () => {
      const { data: { user } } = await supabaseAuth.getUser()
      console.log('Current user:', user ? 'Authenticated' : 'Not authenticated')
      setUser(user)
    }
    getUser()

    const { data: { subscription } } = supabaseAuth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', session ? 'Authenticated' : 'Not authenticated')
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  return user ? <ExpenseForm /> : <Auth />
}