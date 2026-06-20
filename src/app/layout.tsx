import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Invollve — Gestão de Agência',
  description: 'Sistema de gestão para a agência Invollve',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[#0f0f13] text-white antialiased">{children}</body>
    </html>
  )
}
