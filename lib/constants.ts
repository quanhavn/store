// LocalStorage keys
export const STORAGE_KEYS = {
  ONBOARDING_DRAFT: 'onboarding_draft',
  CURRENT_STORE_ID: 'current-store-id',
} as const

// Onboarding default values - keep in sync with setup page
export const ONBOARDING_DEFAULTS = {
  storeName: '',
  address: '',
  phone: '',
  email: '',
  taxCode: '',
  revenueTier: 'under_200m' as const,
  eInvoiceRequired: false,
}

export type RevenueTier = 'under_200m' | '200m_1b' | '1b_3b' | 'over_3b'

export interface OnboardingData {
  storeName: string
  address: string
  phone: string
  email: string
  taxCode: string
  revenueTier: RevenueTier
  eInvoiceRequired: boolean
}

export interface OnboardingDraft {
  data: OnboardingData
  step: number
}
