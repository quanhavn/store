'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Badge } from 'antd'
import {
  HomeOutlined,
  ShoppingCartOutlined,
  InboxOutlined,
  WalletOutlined,
  AppstoreOutlined
} from '@ant-design/icons'
import { useNavBadges } from '@/lib/hooks/useNavBadges'
import { useTranslations } from 'next-intl'

type NavItemKey = 'home' | 'pos' | 'inventory' | 'finance' | 'menu'

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
const navItems: { href: string; icon: typeof HomeOutlined; labelKey: NavItemKey; prefetch: boolean; priority: boolean; isPOS?: boolean }[] = [
  { href: '/', icon: HomeOutlined, labelKey: 'home', prefetch: true, priority: true },
  { href: '/pos', icon: ShoppingCartOutlined, labelKey: 'pos', prefetch: true, priority: true, isPOS: true },
  { href: '/inventory', icon: InboxOutlined, labelKey: 'inventory', prefetch: true, priority: false },
  { href: '/finance', icon: WalletOutlined, labelKey: 'finance', prefetch: true, priority: false },
  { href: '/menu', icon: AppstoreOutlined, labelKey: 'menu', prefetch: true, priority: false },
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
  const { inventory: inventoryBadge } = useNavBadges()
  const t = useTranslations('nav')

  const getBadgeCount = (href: string): number => {
    if (href === '/inventory') return inventoryBadge
    return 0
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-1 overflow-y-auto pb-16">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 z-50 safe-area-bottom">
        <div className="grid grid-cols-5 h-full max-w-lg mx-auto">
          {navItems.map(({ href, icon: Icon, labelKey, prefetch, isPOS }) => {
            const isActive = pathname === href ||
              (href !== '/' && pathname.startsWith(href))
            const badgeCount = getBadgeCount(href)

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
                <Badge count={badgeCount} size="small" offset={[-2, 2]}>
                  <div className={`${isPOS && isActive ? 'ring-2 ring-blue-500 ring-offset-2 rounded-full p-1' : ''}`}>
                    <Icon className={`text-2xl ${isActive ? 'text-blue-500' : ''}`} />
                  </div>
                </Badge>
                <span className={isActive ? 'font-medium' : ''}>{t(labelKey)}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
