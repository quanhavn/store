# 📦 PHASE 1: PROJECT SETUP
## Thời gian: 2 tuần (10 ngày làm việc)

---

## 🎯 MỤC TIÊU PHASE

- [x] Khởi tạo dự án Next.js với TypeScript
- [x] Setup Supabase project và database schema
- [x] Implement authentication với Phone/Password (số điện thoại làm username)
- [x] Tạo Edge Functions boilerplate
- [x] Setup CI/CD pipeline
- [x] PWA configuration

---

## 📅 TUẦN 1: FOUNDATION

### Ngày 1: Project Initialization

| Task ID | Task | Giờ | Acceptance Criteria |
|---------|------|-----|---------------------|
| 1.1.1 | Tạo Supabase project | 1h | Project created, API keys obtained |
| 1.1.2 | Init Next.js 14 với TypeScript | 1h | `npx create-next-app@latest` chạy thành công |
| 1.1.3 | Install dependencies cơ bản | 1h | package.json có đủ deps |
| 1.1.4 | Setup Tailwind CSS | 1h | Tailwind classes hoạt động |
| 1.1.5 | Install shadcn/ui | 2h | Button, Input components hoạt động |

**Dependencies:**
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.x",
    "@supabase/ssr": "^0.x",
    "@tanstack/react-query": "^5.x",
    "zustand": "^4.x",
    "lucide-react": "^0.x",
    "dexie": "^3.x",
    "zod": "^3.x"
  }
}
```

**Checklist Ngày 1:**
- [ ] Supabase project URL và keys lưu trong `.env.local`
- [ ] Next.js app chạy được ở localhost:3000
- [ ] Tailwind classes render đúng
- [ ] shadcn Button component hoạt động

---

### Ngày 2: Supabase Client & Auth Setup

| Task ID | Task | Giờ | Acceptance Criteria |
|---------|------|-----|---------------------|
| 1.2.1 | Tạo Supabase client cho browser | 1h | `lib/supabase/client.ts` |
| 1.2.2 | Tạo Supabase client cho server | 1h | `lib/supabase/server.ts` |
| 1.2.3 | Setup middleware auth | 2h | Protected routes redirect to login |
| 1.2.4 | Tạo auth context/provider | 2h | useAuth hook hoạt động |

**Files cần tạo:**
```
lib/
├── supabase/
│   ├── client.ts      # Browser client (auth only)
│   ├── server.ts      # Server client
│   └── middleware.ts  # Auth middleware
```

**Checklist Ngày 2:**
- [ ] `createBrowserClient()` hoạt động
- [ ] `createServerClient()` hoạt động
- [ ] Middleware redirect unauthenticated users
- [ ] `useAuth()` hook trả về user/session

---

### Ngày 3: Phone/Password Authentication

| Task ID | Task | Giờ | Acceptance Criteria |
|---------|------|-----|---------------------|
| 1.3.1 | UI Login page (mobile-first) | 2h | Phone/Password form responsive |
| 1.3.2 | UI Registration with store setup | 2h | Register + create store flow |
| 1.3.3 | Integrate Supabase Auth (phone as username) | 2h | Sign up/Sign in hoạt động |
| 1.3.4 | Handle auth callbacks | 1h | Redirect sau login |

**UI Components:**
```tsx
// app/(auth)/login/page.tsx  # Login + Register tabs (phone number as username)
```

**Checklist Ngày 3:**
- [x] Form đăng nhập với số điện thoại/password
- [x] Form đăng ký với tạo store
- [x] Redirect to dashboard sau login
- [x] Error handling
- [x] Loading states

---

### Ngày 4: Database Schema - Core Tables

| Task ID | Task | Giờ | Acceptance Criteria |
|---------|------|-----|---------------------|
| 1.4.1 | Migration: stores, users tables | 2h | Tables created in Supabase |
| 1.4.2 | Migration: products, categories | 2h | Indexes created |
| 1.4.3 | Migration: sales, sale_items, payments | 2h | Foreign keys correct |
| 1.4.4 | Setup Supabase CLI locally | 1h | `supabase db push` works |

**Migration file:**
```sql
-- supabase/migrations/001_core_tables.sql
```

**Checklist Ngày 4:**
- [ ] Supabase CLI installed và linked
- [ ] `supabase db push` thành công
- [ ] Tables visible trong Supabase Dashboard
- [ ] Foreign keys và indexes đúng

---

### Ngày 5: Database Schema - Supporting Tables

| Task ID | Task | Giờ | Acceptance Criteria |
|---------|------|-----|---------------------|
| 1.5.1 | Migration: cash_book, bank_book | 2h | Finance tables ready |
| 1.5.2 | Migration: expenses, expense_categories | 1h | Expense tracking ready |
| 1.5.3 | Migration: inventory_logs | 1h | Inventory tracking ready |
| 1.5.4 | Migration: employees, salary_records | 2h | HR tables ready |
| 1.5.5 | Migration: e_invoices, tax_obligations | 1h | Tax tables ready |

**Checklist Ngày 5:**
- [ ] Tất cả 15+ tables đã tạo
- [ ] Relationships đúng
- [ ] Sample data cho testing

---

## 📅 TUẦN 2: SECURITY & INFRASTRUCTURE

### Ngày 6: Row Level Security (RLS)

| Task ID | Task | Giờ | Acceptance Criteria |
|---------|------|-----|---------------------|
| 1.6.1 | Enable RLS trên tất cả tables | 1h | RLS enabled |
| 1.6.2 | Policies cho stores, users | 2h | User chỉ thấy store của mình |
| 1.6.3 | Policies cho products, sales | 2h | CRUD chỉ trong store |
| 1.6.4 | Policies cho finance tables | 2h | Secure finance data |

**Checklist Ngày 6:**
- [ ] RLS enabled on all tables
- [ ] Test: User A không thấy data User B
- [ ] Service role vẫn bypass được RLS

---

### Ngày 7: Edge Functions Boilerplate

| Task ID | Task | Giờ | Acceptance Criteria |
|---------|------|-----|---------------------|
| 1.7.1 | Tạo shared utilities | 2h | `_shared/` folder |
| 1.7.2 | Function: health-check | 1h | Test function works |
| 1.7.3 | Function: get-user-store | 2h | Returns store info |
| 1.7.4 | Setup CORS và error handling | 2h | Consistent responses |

**Files:**
```
supabase/functions/
├── _shared/
│   ├── supabase.ts    # Client helpers
│   ├── cors.ts        # CORS headers
│   └── response.ts    # Response helpers
├── health-check/
│   └── index.ts
└── get-user-store/
    └── index.ts
```

**Checklist Ngày 7:**
- [ ] `supabase functions serve` chạy local
- [ ] health-check trả về 200
- [ ] get-user-store trả về store data
- [ ] CORS headers đúng

---

### Ngày 8: Client API Layer

| Task ID | Task | Giờ | Acceptance Criteria |
|---------|------|-----|---------------------|
| 1.8.1 | Tạo function caller utility | 2h | `lib/supabase/functions.ts` |
| 1.8.2 | Setup TanStack Query | 2h | QueryClient configured |
| 1.8.3 | Error handling global | 1h | Toast notifications |
| 1.8.4 | Type definitions | 2h | `types/` folder |

**Checklist Ngày 8:**
- [ ] `callFunction()` helper hoạt động
- [ ] React Query devtools visible
- [ ] Error toast hiển thị
- [ ] TypeScript types cho DB

---

### Ngày 9: PWA Configuration

| Task ID | Task | Giờ | Acceptance Criteria |
|---------|------|-----|---------------------|
| 1.9.1 | Tạo manifest.json | 1h | PWA manifest valid |
| 1.9.2 | Setup Service Worker | 2h | SW registered |
| 1.9.3 | Tạo app icons (các sizes) | 1h | Icons cho iOS/Android |
| 1.9.4 | Setup next-pwa hoặc serwist | 2h | Offline caching works |
| 1.9.5 | Test install trên mobile | 1h | Add to Home Screen works |

**Checklist Ngày 9:**
- [ ] Lighthouse PWA score > 90
- [ ] Install prompt xuất hiện
- [ ] App icon đúng trên home screen
- [ ] Offline page hiển thị khi mất mạng

---

### Ngày 10: CI/CD & Documentation

| Task ID | Task | Giờ | Acceptance Criteria |
|---------|------|-----|---------------------|
| 1.10.1 | Setup GitHub repository | 1h | Repo created, .gitignore correct |
| 1.10.2 | GitHub Actions: lint & test | 2h | CI runs on PR |
| 1.10.3 | Vercel deployment | 1h | Auto deploy on main |
| 1.10.4 | Supabase Edge Functions deploy | 1h | Functions deployed |
| 1.10.5 | Update README & AGENTS.md | 2h | Documentation complete |

**GitHub Actions:**
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm type-check
```

**Checklist Ngày 10:**
- [ ] GitHub repo với proper .gitignore
- [ ] CI chạy lint + typecheck
- [ ] Vercel preview deployments
- [ ] Edge Functions deployed to production
- [ ] README có setup instructions

---

## 📊 TỔNG KẾT PHASE 1

### Deliverables

| Deliverable | Status |
|-------------|--------|
| Next.js project với TypeScript | ✅ |
| Supabase project với full schema | ✅ |
| Phone/Password authentication | ✅ |
| RLS policies | ✅ |
| Edge Functions boilerplate | ✅ |
| PWA configuration | ✅ |
| CI/CD pipeline | ✅ |

### Metrics

| Metric | Target |
|--------|--------|
| Lighthouse Performance | > 90 |
| Lighthouse PWA | > 90 |
| TypeScript strict mode | ✅ |
| ESLint errors | 0 |

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| RLS policies quá strict | Test kỹ với multiple users |
| PWA không hoạt động trên iOS | Test trên Safari sớm |

---

## 📁 CẤU TRÚC THƯ MỤC SAU PHASE 1

```
store-management-pwa/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx    # Login + Register (Email/Password)
│   ├── (main)/
│   │   └── page.tsx           # Dashboard placeholder
│   ├── layout.tsx
│   ├── manifest.ts
│   └── globals.css
├── components/
│   └── ui/                    # UI components
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   ├── middleware.ts
│   │   └── functions.ts
│   └── utils.ts
├── types/
│   ├── database.ts
│   └── index.ts
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   └── 002_rls_policies.sql
│   └── functions/
│       ├── _shared/
│       ├── health-check/
│       └── get-user-store/
├── public/
│   ├── icons/
│   └── manifest.json
├── .github/
│   └── workflows/
│       └── ci.yml
├── docs/
├── .env.local
├── .env.example
├── README.md
└── AGENTS.md
```

---

*Phase 1 Completion Target: 2 weeks*
