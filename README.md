# Store Management PWA

Ứng dụng quản lý cửa hàng bán lẻ - Tuân thủ thuế Việt Nam 2026

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Auth**: Supabase Auth (Magic Link)
- **State**: Zustand + TanStack Query
- **Offline**: Dexie.js (IndexedDB)

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Supabase CLI

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd store-management-pwa
```

2. Install dependencies:
```bash
pnpm install
```

3. Copy environment variables:
```bash
cp .env.example .env.local
```

4. Update `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

5. Start development server:
```bash
pnpm dev
```

### Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. Link your project:
```bash
npx supabase link --project-ref your-project-ref
```

3. Push database migrations:
```bash
pnpm supabase:db:push
```

4. Deploy Edge Functions:
```bash
npx supabase functions deploy
```

## Commands

```bash
pnpm dev              # Start development server
pnpm build            # Production build
pnpm lint             # Run ESLint
pnpm type-check       # Run TypeScript check
pnpm supabase:start   # Start local Supabase
pnpm supabase:db:push # Push migrations
pnpm supabase:gen     # Generate TypeScript types
```

## Project Structure

```
store-management-pwa/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth routes
│   ├── (main)/            # Protected routes
│   └── auth/callback/     # Auth callback
├── components/
│   ├── ui/                # shadcn/ui components
│   └── mobile/            # Mobile layout
├── lib/
│   ├── supabase/          # Supabase clients
│   └── utils.ts           # Utilities
├── supabase/
│   ├── migrations/        # SQL migrations
│   └── functions/         # Edge Functions
└── types/                 # TypeScript types
```

## Features (Roadmap)

- [x] Phase 1: Setup & Auth
- [ ] Phase 2: Core POS
- [ ] Phase 3: Inventory
- [ ] Phase 4: Finance
- [ ] Phase 5: Tax Compliance
- [ ] Phase 6: HR & Payroll
- [ ] Phase 7: Reports
- [ ] Phase 8: Launch

## License

Private - All rights reserved
