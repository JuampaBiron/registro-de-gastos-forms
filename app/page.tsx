import AuthWrapper from '@/components/AuthWrapper'

export const metadata = {
  title: 'Registro de Gastos',
  description: 'Aplicación para registrar y gestionar gastos personales',
}

export default function Home() {
  return <AuthWrapper />
}