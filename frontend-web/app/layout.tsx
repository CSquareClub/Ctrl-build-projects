import type { Metadata } from 'next'
import { Inter, Space_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Focus Room — Flow State Dashboard',
  description: 'Gamified deep work & Pomodoro dashboard powered by YOLOv8 AI focus tracking.',
  keywords: ['focus', 'pomodoro', 'flow state', 'productivity', 'gamified'],
  openGraph: {
    title: 'Focus Room — Flow State Dashboard',
    description: 'Enter your flow state. AI-powered focus tracking with gamified streaks and duels.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceMono.variable}`}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
