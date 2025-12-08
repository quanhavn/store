'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Select } from 'antd'
import { GlobalOutlined } from '@ant-design/icons'
import { useLocale, useTranslations } from 'next-intl'
import { locales, localeNames, type Locale } from '@/i18n/config'

export function LanguageSwitcher() {
  const t = useTranslations('settings')
  const locale = useLocale() as Locale
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleChange = (newLocale: Locale) => {
    // Set the locale cookie
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`

    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <Select<Locale>
      value={locale}
      onChange={handleChange}
      loading={isPending}
      style={{ width: 140 }}
      suffixIcon={<GlobalOutlined />}
      options={locales.map((loc) => ({
        value: loc,
        label: localeNames[loc],
      }))}
    />
  )
}
