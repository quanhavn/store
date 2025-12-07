# Security Checklist

This document provides a comprehensive security checklist for the Store Management PWA application. Use this checklist during development, code reviews, and before deployments.

---

## Authentication

- [x] JWT tokens expire appropriately (Supabase default: 1 hour access token)
- [x] Session management secure (HttpOnly cookies, Secure flag in production)
- [x] Password requirements enforced (Supabase Auth minimum 6 characters)
- [x] Email verification enabled (Supabase Auth setting)
- [x] Rate limiting on auth endpoints (Supabase built-in)
- [ ] Consider implementing refresh token rotation
- [ ] MFA/2FA for owner accounts (optional enhancement)

### Implementation Details
- Supabase handles JWT generation and validation
- Access tokens expire in 1 hour (configurable in Supabase dashboard)
- Refresh tokens stored in HttpOnly cookies via `@supabase/ssr`
- Session refresh handled automatically by middleware

---

## Authorization

- [x] RLS policies on all tables (19 tables protected)
- [x] Edge Functions verify auth (`getUser()` called on all endpoints)
- [x] Role-based access control (owner/manager/staff)
- [x] Store-based isolation (users can only access their store's data)
- [x] Helper functions for role checks (`is_owner()`, `is_owner_or_manager()`)
- [x] Sensitive data restricted (salaries: owner only, finance: manager+)
- [x] No DELETE policies on critical tables (stores, users)

### Role Permissions Matrix

| Resource | Staff | Manager | Owner |
|----------|-------|---------|-------|
| Products | View | Full | Full |
| Categories | View | Full | Full |
| Sales | Create/View | Full | Full |
| Expenses | View | Full | Full |
| Cash Book | View | Full | Full |
| Bank Accounts | View | Full | Full |
| Employees | View | Full | Full |
| Salary Records | - | - | Full |
| Tax Settings | - | View | Full |
| Store Settings | View | View | Full |

---

## Data Protection

- [x] HTTPS enforced (Vercel/Supabase handles TLS)
- [x] Sensitive data encrypted at rest (Supabase PostgreSQL encryption)
- [x] No PII in logs (error messages sanitized)
- [x] Environment variables for secrets (never hardcoded)
- [x] Service role key only used server-side
- [ ] Consider field-level encryption for bank account numbers
- [ ] Implement data retention policies

### Environment Variables Security
```
NEVER commit these to version control:
- SUPABASE_SERVICE_ROLE_KEY
- E-invoice provider credentials
- Any API keys or secrets

Safe for client-side (public):
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## Input Validation

- [x] Server-side validation in Edge Functions
- [x] SQL injection prevented (Supabase parameterized queries)
- [x] XSS prevented (React auto-escaping, no dangerouslySetInnerHTML)
- [x] Client-side validation (Ant Design Form rules)
- [x] Input sanitization for search queries
- [x] Numeric inputs validated (min/max constraints)
- [ ] Consider adding Zod schemas for Edge Function inputs
- [ ] Rate limiting on data mutation endpoints

### Validation Checklist by Feature

#### Products
- [x] Name: Required, non-empty string
- [x] Price: Required, non-negative number
- [x] SKU/Barcode: Uniqueness checked in database
- [x] Quantity: Non-negative integer

#### HR/Employees
- [x] Phone: Vietnam format `^0\d{9}$`
- [x] ID Card: CCCD/CMND format `^\d{9,12}$`
- [x] Salary: Non-negative number
- [x] Dates: Valid date format

#### Finance
- [x] Amount: Positive number
- [x] Payment method: Enum validation
- [x] Bank account ID: UUID validation via foreign key

---

## API Security

- [x] CORS headers configured (`Access-Control-Allow-Origin`)
- [x] OPTIONS preflight handled
- [x] Authentication required on all Edge Functions
- [x] Error messages sanitized (no stack traces in production)
- [x] Request body parsed safely (JSON.parse in try/catch)
- [ ] Rate limiting headers (`X-RateLimit-*`)
- [ ] Request size limits

### Edge Function Security Pattern
```typescript
// All Edge Functions follow this pattern:
serve(async (req: Request) => {
  // 1. Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    // 2. Verify authentication
    const supabase = createSupabaseClient(req)
    const user = await getUser(supabase) // Throws if not authenticated

    // 3. Get store context
    const { store_id } = await getUserStore(supabase, user.id)

    // 4. Process request with store isolation
    // All queries filter by store_id

  } catch (error) {
    // 5. Sanitized error response
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
})
```

---

## Security Headers

The following headers should be set in production:

- [x] `Content-Security-Policy` - Restricts resource loading
- [x] `X-Frame-Options: DENY` - Prevents clickjacking
- [x] `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- [x] `Referrer-Policy: strict-origin-when-cross-origin`
- [x] `Permissions-Policy` - Restricts browser features
- [ ] `Strict-Transport-Security` (HSTS) - Vercel handles this

### CSP Directives
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self';
connect-src 'self' https://*.supabase.co wss://*.supabase.co;
frame-ancestors 'none';
```

---

## Offline Security

- [x] IndexedDB data is store-scoped
- [x] Sync queue respects RLS policies
- [x] Offline data cleared on logout
- [ ] Consider encrypting IndexedDB data
- [ ] Implement offline session timeout

---

## Third-Party Integrations

### E-Invoice Providers
- [ ] Validate provider responses
- [ ] Store credentials encrypted
- [ ] Use HTTPS only
- [ ] Implement timeout handling

### Payment Gateways (Future)
- [ ] Use official SDKs
- [ ] Never log card data
- [ ] PCI DSS compliance if handling cards
- [ ] Webhook signature verification

---

## Deployment Security

### Vercel
- [x] Environment variables in Vercel dashboard
- [x] No secrets in repository
- [x] Preview deployments use separate Supabase project (recommended)

### Supabase
- [x] RLS enabled on all tables
- [x] Service role key restricted to server-side
- [x] Database connections via SSL
- [ ] Enable pg_audit for logging (optional)
- [ ] Regular backup verification

---

## Monitoring & Incident Response

- [ ] Error tracking (Sentry recommended)
- [ ] Authentication failure monitoring
- [ ] Unusual activity alerts
- [ ] Incident response plan documented
- [ ] Security contact established

---

## Regular Security Tasks

### Weekly
- [ ] Review error logs for security issues
- [ ] Check for dependency updates

### Monthly
- [ ] Run `pnpm audit` for vulnerabilities
- [ ] Review access patterns
- [ ] Update dependencies with security patches

### Quarterly
- [ ] Full security audit
- [ ] Review and update this checklist
- [ ] Test backup restoration
- [ ] Review user access and roles

---

## Compliance Notes

### Vietnam Data Protection
- Personal data (CCCD, phone, bank accounts) must be protected
- Consider data localization requirements
- Maintain audit logs for financial transactions

### Tax Compliance
- E-invoice data must be retained per regulations
- Ensure data integrity for tax audits
- Secure transmission to tax authorities

---

## Quick Security Fixes

If you discover a security issue:

1. **Immediately**: Disable affected feature if critical
2. **Within 1 hour**: Assess impact and scope
3. **Within 24 hours**: Deploy fix to production
4. **Within 48 hours**: Notify affected users if data exposed
5. **Within 1 week**: Post-mortem and update procedures

---

## Audit Log

| Date | Auditor | Findings | Actions Taken |
|------|---------|----------|---------------|
| 2024-12-07 | Initial Setup | RLS policies enhanced | Added role-based access control |
| | | Security headers missing | Added middleware.ts with CSP |
| | | Input validation gaps | Documented validation requirements |

---

*Last Updated: December 2024*
*Next Review: March 2025*
