import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MobileLayout } from '@/components/mobile/mobile-layout'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <MobileLayout>{children}</MobileLayout>
}
