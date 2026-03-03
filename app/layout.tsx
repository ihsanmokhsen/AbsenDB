import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })
const geistMono = Geist_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Absensi Apel Pagi BPAD Provinsi NTT (Plus Rekapan)',
  description: 'Sistem absensi dan rekapan internal BPAD Provinsi NTT',
  icons: {
    icon: '/logo-bpad.png',
    shortcut: '/logo-bpad.png',
    apple: '/logo-bpad.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${geist.className} ${geistMono.variable} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
