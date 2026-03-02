import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ASO Copilot – App Store Optimization',
  description:
    'AI-powered ASO scoring, keyword variants, and optimization tips for your App Store listing.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
