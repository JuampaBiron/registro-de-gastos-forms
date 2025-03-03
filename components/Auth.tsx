// components/Auth.tsx
'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { AuthError } from '@supabase/supabase-js'
import { Mail, Lock, LogIn, UserPlus, Loader2 } from 'lucide-react'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setMessage('Por favor ingresa email y contraseña')
      setMessageType('error')
      return
    }
    
    setLoading(true)
    setMessage('')
    
    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        setMessageType('success')
        setMessage('¡Iniciando sesión!')
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setMessageType('success')
        setMessage('¡Revisa tu correo electrónico para confirmar tu cuenta!')
      }
    } catch (error: unknown) {
      setMessageType('error')
      if (error instanceof AuthError) {
        // Manejar mensajes de error en español
        if (error.message.includes('Invalid login credentials')) {
          setMessage('Credenciales inválidas. Verifica tu email y contraseña.')
        } else if (error.message.includes('Email not confirmed')) {
          setMessage('Email no confirmado. Por favor revisa tu correo.')
        } else if (error.message.includes('Password should be at least')) {
          setMessage('La contraseña debe tener al menos 6 caracteres.')
        } else {
          setMessage(error.message)
        }
      } else {
        setMessage('Ha ocurrido un error inesperado')
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleAuthMode = () => {
    setAuthMode(authMode === 'login' ? 'signup' : 'login')
    setMessage('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {authMode === 'login' ? 'Inicia sesión en tu cuenta' : 'Crea una nueva cuenta'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {authMode === 'login' 
              ? 'Ingresa tus datos para acceder a tu control de gastos' 
              : 'Regístrate para comenzar a controlar tus gastos'}
          </p>
        </div>
        
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl sm:rounded-3xl sm:px-10 border border-gray-100">
            <form className="space-y-6" onSubmit={handleAuth}>
              {/* Campo de correo electrónico */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Mail className="h-4 w-4 mr-1 text-indigo-500" />
                  Correo electrónico
                </label>
                <div className="mt-1 relative rounded-xl shadow-sm">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 rounded-xl border-2 border-gray-200 placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>

              {/* Campo de contraseña */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Lock className="h-4 w-4 mr-1 text-indigo-500" />
                  Contraseña
                </label>
                <div className="mt-1 relative rounded-xl shadow-sm">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 rounded-xl border-2 border-gray-200 placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder={authMode === 'login' ? '••••••••' : 'Crea tu contraseña'}
                  />
                </div>
              </div>

              {/* Botón de acción principal */}
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center px-4 py-3 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      {authMode === 'login' ? 'Iniciando sesión...' : 'Registrando...'}
                    </>
                  ) : (
                    <>
                      {authMode === 'login' ? (
                        <>
                          <LogIn className="w-4 h-4 mr-2" />
                          Iniciar sesión
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Crear cuenta
                        </>
                      )}
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Mensaje de éxito o error */}
            {message && (
              <div 
                className={`mt-6 p-4 rounded-xl shadow-sm border-l-4 transition-all duration-300 ease-in-out ${
                  messageType === 'error'
                    ? 'bg-red-50 text-red-700 border-red-500' 
                    : 'bg-green-50 text-green-700 border-green-500'
                }`}
              >
                {message}
              </div>
            )}

            {/* Toggle entre login y signup */}
            <div className="mt-6 text-center">
              <button 
                type="button" 
                onClick={toggleAuthMode}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:underline transition duration-150 ease-in-out"
              >
                {authMode === 'login'
                  ? '¿No tienes una cuenta? Regístrate'
                  : '¿Ya tienes una cuenta? Inicia sesión'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}