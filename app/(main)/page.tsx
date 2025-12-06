import { createClient } from '@/lib/supabase/server'
import { DashboardContent } from '@/components/dashboard/dashboard-content'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: userData } = await supabase
    .from('users')
    .select('*, stores(*)')
    .eq('id', user?.id || '')
    .single()

  const userRecord = userData as { stores?: { name?: string } } | null
  const storeName = userRecord?.stores?.name || 'Cửa hàng'

  return <DashboardContent storeName={storeName} />
}
