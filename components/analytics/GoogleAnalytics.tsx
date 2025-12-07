'use client'

import { GoogleAnalytics as GA } from '@next/third-parties/google'

export function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

  if (!gaId || process.env.NODE_ENV !== 'production') {
    return null
  }

  return <GA gaId={gaId} />
}
