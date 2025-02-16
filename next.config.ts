// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    domains: ['fonts.googleapis.com'],
  },
  // Configurar la página como dinámica por defecto
  staticPageGenerationTimeout: 0
}

export default nextConfig