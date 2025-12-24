# Store Management PWA - Agent Guidelines

## Commands
```bash
pnpm dev                         # Start dev server
pnpm build && pnpm lint          # Build + lint (run before commits)
pnpm type-check                  # TypeScript check
pnpm test                        # Run vitest
pnpm test -- path/to/file.test.ts  # Run single test file
pnpm test:e2e                    # Playwright E2E tests
pnpm test:e2e -- e2e/auth.spec.ts  # Run single E2E test
```

## Code Style
- **TypeScript**: Strict mode, no `any`, use `unknown` if needed. Prefer `interface` over `type`.
- **Imports**: Use `@/` path alias (e.g., `import { cn } from '@/lib/utils'`)
- **Components**: PascalCase files, Server Components by default, `'use client'` only when needed
- **Naming**: camelCase utils, SCREAMING_SNAKE_CASE constants, snake_case DB columns
- **Styling**: Tailwind CSS, mobile-first, follow shadcn/ui patterns
- **Supabase**: ALL data access through Edge Functions, never query DB directly from client
- **Forms**: Use react-hook-form + zod, derive types with `z.infer<typeof schema>`
- **Vietnamese**: VND as INTEGER (no decimals), format `123.456.789 VND`, VAT default 8%

## Issue Tracking
Use `bd` (beads) for ALL task tracking. Run `bd ready --json` to find work, `bd close <id>` when done.
