// app/page.tsx
import AuthWrapper from '@/components/AuthWrapper'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const metadata = {
  title: 'Registro de Gastos',
  description: 'Aplicación para registrar y gestionar gastos personales',
}

export default function Home() {
  return <AuthWrapper />
}