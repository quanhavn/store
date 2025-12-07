# Environment Variables Guide

This document describes all environment variables required for the Store Management PWA.

## Setup Instructions

1. Copy `.env.example` to `.env.local`
2. Fill in the required values
3. Never commit `.env.local` to version control

---

## Required Variables

### Supabase Configuration

| Variable | Required | Client-Safe | Description |
|----------|----------|-------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Yes | Your Supabase project URL (e.g., `https://abc123.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Yes | Public anonymous key - respects RLS policies |
| `SUPABASE_SERVICE_ROLE_KEY` | No | **NO** | Admin key that bypasses RLS - server-side only |

### Where to Find These Values

1. Go to your Supabase Dashboard
2. Navigate to **Settings > API**
3. Copy the values from the **Project URL** and **API Keys** sections

---

## Optional Variables

### Application Configuration

| Variable | Default | Client-Safe | Description |
|----------|---------|-------------|-------------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Yes | Application URL for OAuth redirects |
| `NODE_ENV` | `development` | Yes | Environment mode |
| `NEXT_PUBLIC_APP_NAME` | `Store Management` | Yes | PWA display name |
| `NEXT_PUBLIC_APP_SHORT_NAME` | `StorePOS` | Yes | PWA short name (max 12 chars) |

### CORS Configuration (Edge Functions)

| Variable | Default | Description |
|----------|---------|-------------|
| `ALLOWED_ORIGIN` | `*` | Allowed origin for CORS (restrict in production) |
| `ALLOWED_ORIGINS` | `*` | Comma-separated list of allowed origins |

### Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_ENABLE_OFFLINE` | `true` | Enable PWA offline mode |
| `NEXT_PUBLIC_ENABLE_E_INVOICE` | `false` | Enable e-invoice integration |
| `NEXT_PUBLIC_ENABLE_HR` | `true` | Enable HR/Payroll module |

### Analytics

| Variable | Required | Client-Safe | Description |
|----------|----------|-------------|-------------|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | No | Yes | Google Analytics measurement ID (G-XXXXXXXXXX) |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Yes | Sentry DSN for error tracking |

---

## E-Invoice Integration (Optional)

These are only needed if using Vietnamese e-invoice providers.

**SECURITY: All e-invoice credentials are server-side only!**

### MISA meInvoice

| Variable | Description |
|----------|-------------|
| `E_INVOICE_PROVIDER` | Set to `misa` |
| `MISA_APP_ID` | Application ID from MISA dashboard |
| `MISA_TAX_CODE` | Your business tax code |
| `MISA_API_KEY` | API key from MISA |

### Viettel S-Invoice

| Variable | Description |
|----------|-------------|
| `E_INVOICE_PROVIDER` | Set to `viettel` |
| `VIETTEL_USERNAME` | Viettel portal username |
| `VIETTEL_PASSWORD` | Viettel portal password |
| `VIETTEL_TAX_CODE` | Your business tax code |

### VNPT e-Invoice

| Variable | Description |
|----------|-------------|
| `E_INVOICE_PROVIDER` | Set to `vnpt` |
| `VNPT_USERNAME` | VNPT portal username |
| `VNPT_PASSWORD` | VNPT portal password |
| `VNPT_API_URL` | VNPT API endpoint URL |

---

## Security Guidelines

### What's Safe for Client-Side (NEXT_PUBLIC_*)

Variables prefixed with `NEXT_PUBLIC_` are:
- Bundled into the client JavaScript
- Visible to anyone who views page source
- **Safe only because they work with RLS policies**

### What Must Stay Server-Side

These variables must NEVER be exposed to the client:

1. **`SUPABASE_SERVICE_ROLE_KEY`**
   - Bypasses all RLS policies
   - Has full database access
   - Only use in Edge Functions or server-side code

2. **E-Invoice Credentials**
   - Contains API keys and passwords
   - Only use in Edge Functions

3. **Any database passwords or connection strings**

### Production Checklist

- [ ] All `NEXT_PUBLIC_*` variables are safe to expose
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is not in client code
- [ ] `ALLOWED_ORIGIN` is set to your production domain (not `*`)
- [ ] E-invoice credentials are only in server-side code
- [ ] `.env.local` is in `.gitignore`

---

## Environment-Specific Configuration

### Development

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-dev-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-dev-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
ALLOWED_ORIGIN=*
```

### Staging

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-staging-anon-key
NEXT_PUBLIC_APP_URL=https://staging.yourapp.com
NODE_ENV=production
ALLOWED_ORIGIN=https://staging.yourapp.com
```

### Production

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-prod-anon-key
NEXT_PUBLIC_APP_URL=https://yourapp.com
NODE_ENV=production
ALLOWED_ORIGIN=https://yourapp.com
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Deployment Configuration

### Vercel

1. Go to your Vercel project
2. Navigate to **Settings > Environment Variables**
3. Add each variable for the appropriate environment (Development/Preview/Production)
4. Redeploy to apply changes

### Supabase Edge Functions

1. Go to your Supabase project
2. Navigate to **Edge Functions > Secrets**
3. Add secrets that Edge Functions need:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - E-invoice credentials (if applicable)

---

## Troubleshooting

### "Invalid API key" Error

- Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
- Check you're using the anon key, not the service role key
- Ensure the key matches your Supabase project

### "Connection refused" Error

- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check your internet connection
- Verify Supabase project is not paused

### CORS Errors

- Set `ALLOWED_ORIGIN` to your app's domain
- For development, use `*` temporarily
- Ensure Edge Functions are deployed

### Environment Variables Not Loading

- Restart the development server after changing `.env.local`
- Verify `.env.local` is in the project root
- Check for typos in variable names
- `NEXT_PUBLIC_*` variables require a rebuild

---

*Last Updated: December 2024*
