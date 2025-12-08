import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AntdProvider } from '@/components/providers/antd-provider'
import { QueryProvider } from '@/components/providers/query-provider'
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'

/**
 * Font Optimization
 *
 * Using next/font for optimal font loading:
 * - Automatic self-hosting (no external requests to Google)
 * - Zero layout shift with CSS size-adjust
 * - font-display: swap for faster perceived loading
 * - Preloading of fonts for critical text
 * - Subsets reduce font file size
 */
const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'swap', // Show fallback font immediately, swap when loaded
  preload: true, // Preload font files
  variable: '--font-inter', // CSS variable for flexible usage
  fallback: [
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Oxygen',
    'Ubuntu',
    'sans-serif',
  ],
})

export const metadata: Metadata = {
  title: 'Quản Lý Cửa Hàng',
  description: 'Ứng dụng quản lý cửa hàng bán lẻ - Tuân thủ thuế Việt Nam 2026',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Quản Lý Cửa Hàng',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#3b82f6',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning className={inter.variable}>
      <body className={inter.className}>
        <GoogleAnalytics />
        <QueryProvider>
          <NextIntlClientProvider messages={messages}>
            <AntdProvider>
              {children}
            </AntdProvider>
          </NextIntlClientProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
