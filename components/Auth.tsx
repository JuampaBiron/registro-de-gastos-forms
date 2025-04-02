// components/Auth.tsx - Con Google Login añadido
'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { AuthError } from '@supabase/supabase-js'
import { Mail, Lock, LogIn, UserPlus, Loader2, Eye, EyeOff } from 'lucide-react'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [formSubmitted, setFormSubmitted] = useState(false)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Comprobar si hay un hash de confirmación en la URL
  useEffect(() => {
    const handleHashChange = async () => {
      const hash = window.location.hash;
      
      if (hash && hash.includes('#access_token=')) {
        try {
          setLoading(true);
          const { error } = await supabase.auth.getSession();
          
          if (error) {
            setMessage('Error al confirmar el email: ' + error.message);
            setMessageType('error');
          } else {
            setMessage('¡Email confirmado! Iniciando sesión...');
            setMessageType('success');
            // Actualizar la URL para quitar el hash
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (err) {
          console.error('Error al procesar confirmación:', err);
          setMessage('Error al procesar la confirmación');
          setMessageType('error');
        } finally {
          setLoading(false);
        }
      }
    };

    handleHashChange();
  }, [supabase.auth]);

  // Validar email
  const isValidEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email);
  }

  // Validar contraseña
  const isValidPassword = (password: string) => {
    return password.length >= 6;
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormSubmitted(true);
    
    // Validar campos
    if (!email || !password) {
      setMessage('Por favor ingresa email y contraseña');
      setMessageType('error');
      return;
    }
    
    if (!isValidEmail(email)) {
      setMessage('Por favor ingresa un email válido');
      setMessageType('error');
      return;
    }
    
    if (!isValidPassword(password)) {
      setMessage('La contraseña debe tener al menos 6 caracteres');
      setMessageType('error');
      return;
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
          options: {
            emailRedirectTo: window.location.origin
          }
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
        } else if (error.message.includes('User already registered')) {
          setMessage('Este email ya está registrado. Intenta iniciar sesión.')
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

  // Función para iniciar sesión con Google
  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setMessage('');
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`
        }
      });
      
      if (error) throw error;
      
      // No necesitamos setMessage aquí ya que el usuario será redirigido a Google
    } catch (error: unknown) {
      setMessageType('error');
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage('Error al iniciar sesión con Google');
      }
    }
  };

  const toggleAuthMode = () => {
    setAuthMode(authMode === 'login' ? 'signup' : 'login')
    setMessage('')
    setFormSubmitted(false)
  }

  const handleResetPassword = async () => {
    if (!email || !isValidEmail(email)) {
      setMessage('Por favor ingresa un email válido para restablecer tu contraseña');
      setMessageType('error');
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      setMessageType('success');
      setMessage('Revisa tu correo para instrucciones de restablecimiento de contraseña');
    } catch (error) {
      setMessageType('error');
      if (error instanceof AuthError) {
        setMessage(`Error: ${error.message}`);
      } else {
        setMessage('Ha ocurrido un error al intentar restablecer la contraseña');
      }
    } finally {
      setLoading(false);
    }
  };

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
            {/* Botón de inicio de sesión con Google */}
            <div className="mb-6">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {googleLoading ? (
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                ) : (
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
                {googleLoading ? 'Conectando...' : 'Continuar con Google'}
              </button>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">O continúa con email</span>
              </div>
            </div>

            <form className="space-y-6" onSubmit={handleAuth}>
              {/* Campo de correo electrónico */}
              <div>
                <label htmlFor="email" className="flex items-center">
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
                    className={`appearance-none block w-full px-4 py-3 rounded-xl border-2 placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors
                      ${formSubmitted && (!email || !isValidEmail(email)) 
                        ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-200 text-gray-900'}`}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                {formSubmitted && !email && (
                  <p className="mt-1 text-sm text-red-600">
                    El email es requerido
                  </p>
                )}
                {formSubmitted && email && !isValidEmail(email) && (
                  <p className="mt-1 text-sm text-red-600">
                    Ingresa un email válido
                  </p>
                )}
              </div>

              {/* Campo de contraseña */}
              <div>
                <label htmlFor="password" className="flex items-center">
                  <Lock className="h-4 w-4 mr-1 text-indigo-500" />
                  Contraseña
                </label>
                <div className="mt-1 relative rounded-xl shadow-sm">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`appearance-none block w-full px-4 py-3 pr-10 rounded-xl border-2 placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition-colors
                      ${formSubmitted && (!password || !isValidPassword(password)) 
                        ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-200 text-gray-900'}`}
                    placeholder={authMode === 'login' ? '••••••••' : 'Crea tu contraseña'}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {formSubmitted && !password && (
                  <p className="mt-1 text-sm text-red-600">
                    La contraseña es requerida
                  </p>
                )}
                {formSubmitted && password && !isValidPassword(password) && (
                  <p className="mt-1 text-sm text-red-600">
                    La contraseña debe tener al menos 6 caracteres
                  </p>
                )}
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

            {/* Olvidé mi contraseña */}
            {authMode === 'login' && (
              <div className="mt-4 text-center">
                <button 
                  type="button" 
                  onClick={handleResetPassword}
                  disabled={loading}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:underline transition duration-150 ease-in-out"
                >
                  ¿Olvidaste tu contraseña?
                </button>
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