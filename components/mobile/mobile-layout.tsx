'use client'

import { ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { 
  HomeOutlined, 
  ShoppingCartOutlined, 
  InboxOutlined, 
  WalletOutlined, 
  BarChartOutlined 
} from '@ant-design/icons'

const navItems = [
  { href: '/', icon: HomeOutlined, label: 'Trang chủ' },
  { href: '/pos', icon: ShoppingCartOutlined, label: 'Bán hàng' },
  { href: '/inventory', icon: InboxOutlined, label: 'Kho' },
  { href: '/finance', icon: WalletOutlined, label: 'Thu chi' },
  { href: '/reports', icon: BarChartOutlined, label: 'Báo cáo' },
]

export function MobileLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-1 overflow-y-auto pb-16">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 z-50 safe-area-bottom">
        <div className="grid grid-cols-5 h-full max-w-lg mx-auto">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href || 
              (href !== '/' && pathname.startsWith(href))

            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                className={`flex flex-col items-center justify-center gap-1 text-xs transition-colors ${
                  isActive 
                    ? 'text-blue-500' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className={`text-xl ${isActive ? 'text-blue-500' : ''}`} />
                <span className={isActive ? 'font-medium' : ''}>{label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
