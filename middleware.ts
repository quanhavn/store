import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest } from 'next/server'

/**
 * Security headers for production environment.
 * These headers help protect against common web vulnerabilities.
 */
const securityHeaders = {
  // Prevents clickjacking attacks by disabling iframe embedding
  'X-Frame-Options': 'DENY',

  // Prevents MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Controls how much referrer information is sent
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Restricts browser features
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), interest-cohort=()',

  // Content Security Policy - restricts resource loading
  'Content-Security-Policy': [
    "default-src 'self'",
    // Allow inline scripts for Next.js and React
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    // Allow inline styles for Ant Design and Tailwind
    "style-src 'self' 'unsafe-inline'",
    // Allow images from self, data URIs, and HTTPS sources
    "img-src 'self' data: https: blob:",
    // Allow fonts from self
    "font-src 'self' data:",
    // Allow connections to Supabase and self
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com",
    // Prevent framing
    "frame-ancestors 'none'",
    // Form submissions to self only
    "form-action 'self'",
    // Base URI restriction
    "base-uri 'self'",
    // Object/embed restriction
    "object-src 'none'",
  ].join('; '),
}

/**
 * Determines if the current environment is production.
 */
function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

export async function middleware(request: NextRequest) {
  // Handle Supabase session update first (for auth)
  const response = await updateSession(request)

  // Apply security headers in production only
  if (isProduction()) {
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest)
     * - icons (PWA icons)
     * - Static files with common extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
