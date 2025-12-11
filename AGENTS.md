# Store Management PWA - Agent Guidelines

## Project Overview
Mobile-first PWA for Vietnamese small retail stores with Vietnam Tax 2026 compliance.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Auth**: Supabase Auth (Phone OTP / Magic Link)
- **State**: Zustand + TanStack Query
- **Offline**: Dexie.js (IndexedDB)
- **PWA**: Serwist (Service Worker)

## Commands

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Production build
pnpm start            # Start production server
pnpm lint             # Run ESLint
pnpm type-check       # Run TypeScript check

# Supabase
pnpm supabase:start   # Start local Supabase
pnpm supabase:stop    # Stop local Supabase
pnpm supabase:db:push # Push migrations to remote
pnpm supabase:gen     # Generate TypeScript types
pnpm supabase:functions:serve  # Serve Edge Functions locally

# Testing
pnpm test             # Run tests
pnpm test:e2e         # Run Playwright E2E tests
```

## Project Structure

```
store-management-pwa/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Auth routes (login, verify)
│   ├── (main)/              # Protected app routes
│   ├── api/                 # API routes (if needed)
│   ├── layout.tsx           # Root layout
│   └── globals.css          # Global styles
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── auth/                # Auth components
│   ├── mobile/              # Mobile-specific components
│   ├── pos/                 # POS components
│   └── reports/             # Report components
├── lib/
│   ├── supabase/            # Supabase clients
│   ├── stores/              # Zustand stores
│   ├── hooks/               # Custom hooks
│   ├── offline/             # IndexedDB/Dexie
│   └── utils.ts             # Utility functions
├── types/                   # TypeScript types
├── supabase/
│   ├── migrations/          # SQL migrations
│   └── functions/           # Edge Functions
└── public/                  # Static assets
```

## Coding Conventions

### TypeScript
- Use strict mode
- Prefer `interface` over `type` for objects
- Use `z.infer<typeof schema>` for form types
- No `any` - use `unknown` if needed

### React/Next.js
- Use Server Components by default
- Add `'use client'` only when needed (hooks, events)
- Use `@/` path alias for imports
- Colocate related files

### Naming
- Components: PascalCase (`ProductCard.tsx`)
- Utilities: camelCase (`formatCurrency.ts`)
- Constants: SCREAMING_SNAKE_CASE
- Database columns: snake_case
- TypeScript types: PascalCase

### Styling
- Mobile-first approach
- Use Tailwind utilities
- Avoid custom CSS unless necessary
- Follow shadcn/ui patterns

### Supabase
- NEVER query database directly from client
- ALL data access through Edge Functions
- Use RLS as secondary protection
- Edge Functions use service_role key

## Vietnamese-Specific

### Currency
- Use INTEGER for VND amounts (no decimals)
- Format: `123,456,789đ` or `123.456.789 VND`

### VAT Rates
- Default: 8% (reduced rate until end 2026)
- Standard: 10%
- Exempt: 0%

### Phone Numbers
- Format: 0xxx xxx xxx (10 digits)
- Store with country code: +84
- Validate: starts with 03, 05, 07, 08, 09

### Tax Code (MST)
- Individual: 10 digits (legacy) or 12 digits (CCCD-based, per Circular 86/2024/TT-BTC)
- Business: 13 digits (10 + 3 branch code)

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Git Workflow
- Branch naming: `feature/`, `fix/`, `chore/`
- Commit messages: conventional commits
- PR required for main branch

## Beads Issue Tracking

This project uses **Beads** for AI-native issue tracking. Issues live in `.beads/` directory.

### Beads Commands
```bash
bd list                    # View all issues
bd show <issue-id>         # View issue details
bd create "Title"          # Create new issue
bd update <id> --status in_progress   # Start working
bd update <id> --status done          # Complete issue
bd sync                    # Sync with git remote
```

### Amp Custom Commands
Use these slash commands in Amp for issue-driven development:
- `/issue-create` - Create a new well-structured issue
- `/issue-start` - Pick an issue and start working (creates branch, plans work)
- `/issue-done` - Complete current issue (runs checks, updates status)
- `/issues` - View and summarize current issues

### Recommended Workflow
1. Create issues with `/issue-create` or `bd create`
2. Start work with `/issue-start` (creates feature branch)
3. Implement with Amp assistance
4. Complete with `/issue-done` (validates and closes)

BEFORE ANYTHING ELSE: run 'bd onboard' and follow the instructions
