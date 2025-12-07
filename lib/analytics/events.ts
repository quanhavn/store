/**
 * Track custom events in Google Analytics 4
 */
export function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params)
  }
}

/**
 * Track when a sale is completed
 */
export function trackSaleCompleted(amount: number, itemCount: number): void {
  trackEvent('sale_completed', {
    value: amount,
    currency: 'VND',
    item_count: itemCount,
  })
}

/**
 * Track when a new user registers
 */
export function trackUserRegistered(): void {
  trackEvent('user_registered')
}

/**
 * Track when a product is added to inventory
 */
export function trackProductAdded(productId: string, productName: string): void {
  trackEvent('product_added', {
    product_id: productId,
    product_name: productName,
  })
}

/**
 * Track when a report is exported
 */
export function trackReportExported(reportType: string, format: 'excel' | 'pdf'): void {
  trackEvent('report_exported', {
    report_type: reportType,
    format,
  })
}

/**
 * Track when an employee checks in
 */
export function trackCheckIn(employeeId: string): void {
  trackEvent('employee_check_in', {
    employee_id: employeeId,
  })
}

/**
 * Track payment method usage
 */
export function trackPaymentMethodUsed(method: string, amount: number): void {
  trackEvent('payment_method_used', {
    payment_method: method,
    value: amount,
    currency: 'VND',
  })
}
