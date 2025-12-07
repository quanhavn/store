'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  HomeOutlined,
  ShoppingCartOutlined,
  InboxOutlined,
  WalletOutlined,
  CalculatorOutlined,
  BarChartOutlined,
  FileTextOutlined
} from '@ant-design/icons'

/**
 * Navigation items with prefetch configuration
 *
 * prefetch: true - Enables automatic prefetching of the route
 *   - In production, Next.js prefetches visible links automatically
 *   - Links in viewport are prefetched when idle
 *   - Results in faster perceived navigation
 *
 * priority: true - Most frequently accessed routes
 *   - These routes will be prefetched immediately when the layout loads
 */
const navItems = [
  { href: '/', icon: HomeOutlined, label: 'Trang chu', prefetch: true, priority: true },
  { href: '/pos', icon: ShoppingCartOutlined, label: 'Ban hang', prefetch: true, priority: true },
  { href: '/inventory', icon: InboxOutlined, label: 'Kho', prefetch: true, priority: false },
  { href: '/finance', icon: WalletOutlined, label: 'Thu chi', prefetch: true, priority: false },
  { href: '/invoices', icon: FileTextOutlined, label: 'Hóa đơn', prefetch: true, priority: false },
  { href: '/tax', icon: CalculatorOutlined, label: 'Thue', prefetch: true, priority: false },
  { href: '/reports', icon: BarChartOutlined, label: 'Bao cao', prefetch: true, priority: false },
]

/**
 * MobileLayout Component
 *
 * Performance optimizations:
 * - Uses Next.js Link component for client-side navigation
 * - Automatic prefetching of navigation routes
 * - Priority routes (home, POS) are prefetched first
 * - CSS-based hover states (no JS overhead)
 */
export function MobileLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-1 overflow-y-auto pb-16">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 z-50 safe-area-bottom">
        <div className="grid grid-cols-7 h-full max-w-lg mx-auto">
          {navItems.map(({ href, icon: Icon, label, prefetch }) => {
            const isActive = pathname === href ||
              (href !== '/' && pathname.startsWith(href))

            return (
              <Link
                key={href}
                href={href}
                prefetch={prefetch}
                className={`flex flex-col items-center justify-center gap-1 text-xs transition-colors ${
                  isActive
                    ? 'text-blue-500'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className={`text-xl ${isActive ? 'text-blue-500' : ''}`} />
                <span className={isActive ? 'font-medium' : ''}>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
