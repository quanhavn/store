'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/supabase/functions'
import { BankDepositBook } from '@/components/reports'

export default function BankBookPage() {
  const t = useTranslations('reports')

  const { data: storeData } = useQuery({
    queryKey: ['user-store'],
    queryFn: () => api.store.getUserStore(),
  })

  const store = storeData?.store
  const storeInfo = store ? {
    name: store.name,
    address: store.address || '',
    taxCode: store.tax_code || undefined,
  } : undefined

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">{t('bankBook.title')}</h1>
      <p className="text-gray-500 mb-4 text-sm">{t('bankBook.templateCode')}</p>
      <BankDepositBook storeInfo={storeInfo} />
    </div>
  )
}
