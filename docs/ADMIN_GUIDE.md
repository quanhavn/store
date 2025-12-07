# HUONG DAN QUAN TRI HE THONG
## Admin Guide - Store Management PWA

**Phien ban:** 1.0
**Cap nhat:** Thang 12/2024

---

## MUC LUC

1. [Tong quan he thong](#1-tong-quan-he-thong)
2. [Cau hinh he thong](#2-cau-hinh-he-thong)
3. [Quan ly nguoi dung](#3-quan-ly-nguoi-dung)
4. [Quan ly co so du lieu](#4-quan-ly-co-so-du-lieu)
5. [Sao luu va phuc hoi](#5-sao-luu-va-phuc-hoi)
6. [Bao mat](#6-bao-mat)
7. [Giam sat va Log](#7-giam-sat-va-log)
8. [Xu ly su co](#8-xu-ly-su-co)
9. [Nang cap he thong](#9-nang-cap-he-thong)

---

## 1. TONG QUAN HE THONG

### 1.1 Kien truc

```
+------------------+     +------------------+     +------------------+
|   Client (PWA)   | --> |   Edge Functions | --> |    PostgreSQL    |
|   Next.js 14     |     |   Supabase       |     |    Supabase      |
+------------------+     +------------------+     +------------------+
         |                        |
         v                        v
+------------------+     +------------------+
|   IndexedDB      |     |   Storage        |
|   Offline Cache  |     |   (Images)       |
+------------------+     +------------------+
```

### 1.2 Cong nghe su dung

| Tang | Cong nghe | Muc dich |
|------|-----------|----------|
| Frontend | Next.js 14, TypeScript | Ung dung web PWA |
| UI Framework | Ant Design, Tailwind CSS | Giao dien nguoi dung |
| State | Zustand, TanStack Query | Quan ly trang thai |
| Backend | Supabase Edge Functions | API serverless |
| Database | PostgreSQL (Supabase) | Luu tru du lieu |
| Auth | Supabase Auth | Xac thuc nguoi dung |
| Storage | Supabase Storage | Luu tru file/hinh anh |
| Offline | IndexedDB (Dexie.js) | Cache offline |
| Monitoring | Sentry | Theo doi loi |
| Analytics | Google Analytics | Phan tich su dung |

### 1.3 Yeu cau he thong

**Server/Hosting:**
- Vercel (Frontend) - Free tier hoac Pro
- Supabase (Backend) - Free tier hoac Pro ($25/thang)

**Client:**
- Trinh duyet hien dai: Chrome 80+, Safari 14+, Firefox 80+, Edge 80+
- Ho tro JavaScript
- Ho tro IndexedDB
- Ho tro Service Worker

---

## 2. CAU HINH HE THONG

### 2.1 Bien moi truong (Environment Variables)

**File `.env.local` (Development):**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...your-anon-key

# Sentry (Error Tracking)
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=your-sentry-auth-token

# Google Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

**Bien moi truong tren Vercel:**

1. Truy cap Vercel Dashboard
2. Chon Project > Settings > Environment Variables
3. Them cac bien tuong ung cho moi moi truong (Production, Preview, Development)

### 2.2 Cau hinh Supabase

**Truy cap Supabase Dashboard:**
- URL: https://app.supabase.com
- Dang nhap bang tai khoan Supabase

**Cac cau hinh quan trong:**

1. **Authentication > Settings:**
   - Bat/tat cac phuong thuc dang nhap
   - Cau hinh JWT expiry (mac dinh: 3600s)
   - Cau hinh refresh token rotation

2. **Database > Settings:**
   - Connection pooling mode: Transaction (khuyen nghi)
   - SSL mode: Require

3. **Edge Functions > Secrets:**
   - Them cac secret can thiet cho functions

### 2.3 Cau hinh PWA

**File `public/manifest.json`:**

```json
{
  "name": "Quan Ly Cua Hang",
  "short_name": "CuaHang",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1890ff",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 2.4 Cau hinh CORS

Edge Functions tu dong xu ly CORS. De tuy chinh:

```typescript
// supabase/functions/_shared/supabase.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Hoac domain cu the
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

---

## 3. QUAN LY NGUOI DUNG

### 3.1 Phan quyen

He thong co 3 cap do quyen:

| Role | Quyen han |
|------|-----------|
| **owner** | Toan quyen: CRUD tat ca, cau hinh, xem bao cao, quan ly nguoi dung |
| **manager** | Quan ly: Ban hang, kho, tai chinh, xem bao cao |
| **staff** | Nhan vien: Ban hang, xem ton kho |

### 3.2 Tao nguoi dung moi (qua Dashboard)

1. Truy cap Supabase Dashboard
2. Vao Authentication > Users
3. Nhan "Add User"
4. Nhap email (dang phone@phone.local) va password
5. Sau khi tao, them vao bang `users` voi `store_id` va `role`

**SQL de them user:**

```sql
-- Them nguoi dung vao store
INSERT INTO users (id, store_id, name, phone, role)
VALUES (
  'user-uuid-from-auth',
  'store-uuid',
  'Ten Nhan Vien',
  '0912345678',
  'staff'
);
```

### 3.3 Vo hieu hoa nguoi dung

**Cach 1: Qua Supabase Dashboard**
1. Vao Authentication > Users
2. Tim user
3. Nhan menu > Ban user

**Cach 2: Qua SQL**
```sql
UPDATE users SET active = false WHERE id = 'user-uuid';
```

### 3.4 Reset mat khau

1. Truy cap Supabase Dashboard
2. Vao Authentication > Users
3. Tim user
4. Nhan "Send Password Reset Email"

**Luu y:** Hien tai he thong dung phone@phone.local nen can tuy chinh flow reset password.

---

## 4. QUAN LY CO SO DU LIEU

### 4.1 Cau truc database

**Cac bang chinh:**

| Bang | Mo ta |
|------|-------|
| `stores` | Thong tin cua hang |
| `users` | Nguoi dung he thong |
| `categories` | Danh muc san pham |
| `products` | San pham |
| `sales` | Don hang |
| `sale_items` | Chi tiet don hang |
| `payments` | Thanh toan |
| `cash_book` | So tien mat |
| `bank_book` | So ngan hang |
| `bank_accounts` | Tai khoan ngan hang |
| `expenses` | Chi phi |
| `expense_categories` | Danh muc chi phi |
| `inventory_logs` | Nhat ky kho |
| `employees` | Nhan vien |
| `attendance` | Cham cong |
| `salary_records` / `payroll` | Bang luong |
| `e_invoices` | Hoa don dien tu |
| `tax_obligations` | Nghia vu thue |
| `sync_queue` | Hang doi dong bo |

### 4.2 Row Level Security (RLS)

Tat ca cac bang deu bat RLS de dam bao bao mat:

```sql
-- Vi du policy cho bang products
CREATE POLICY "Users can view store products" ON products
FOR ALL USING (
  store_id IN (
    SELECT store_id FROM users WHERE id = auth.uid()
  )
);
```

**Kiem tra RLS:**
```sql
-- Xem cac policy tren bang
SELECT * FROM pg_policies WHERE tablename = 'products';
```

### 4.3 Chay Migration

**Dung Supabase CLI:**

```bash
# Cai dat CLI
npm install -g supabase

# Dang nhap
supabase login

# Link project
supabase link --project-ref your-project-ref

# Chay migration moi
supabase db push

# Tao migration moi
supabase migration new ten_migration
```

### 4.4 Backup Database

**Backup tu dong (Supabase Pro):**
- Backup hang ngay tu dong
- Luu tru 7 ngay

**Backup thu cong:**

```bash
# Export du lieu
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql

# Hoac dung Supabase Dashboard
# Database > Backups > Download
```

### 4.5 Toi uu hoa Database

**Index quan trong:**

```sql
-- Da co san trong migration
CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_sales_store_date ON sales(store_id, created_at DESC);
CREATE INDEX idx_inventory_logs_product ON inventory_logs(product_id, created_at DESC);
```

**Kiem tra performance:**

```sql
-- Xem cac query cham
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;

-- Analyze bang
ANALYZE products;
ANALYZE sales;
```

---

## 5. SAO LUU VA PHUC HOI

### 5.1 Chien luoc backup

| Loai | Tan suat | Luu tru | Cong cu |
|------|----------|---------|---------|
| Database | Hang ngay | 30 ngay | Supabase / pg_dump |
| Storage | Hang tuan | 90 ngay | Supabase / rclone |
| Code | Moi commit | Vinh vien | GitHub |
| Config | Moi thay doi | 90 ngay | Git / Vercel |

### 5.2 Backup Database

**Backup tu dong bang script:**

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/path/to/backups"

# Dump database
pg_dump -h db.xxx.supabase.co -U postgres -d postgres \
  -F c -f "$BACKUP_DIR/db_$DATE.dump"

# Upload to S3 (tuy chon)
aws s3 cp "$BACKUP_DIR/db_$DATE.dump" s3://your-bucket/backups/

# Xoa backup cu hon 30 ngay
find $BACKUP_DIR -name "db_*.dump" -mtime +30 -delete
```

**Dat lich chay:**
```bash
# Chay luc 2h sang moi ngay
0 2 * * * /path/to/backup.sh
```

### 5.3 Phuc hoi Database

**Tu file backup:**

```bash
# Phuc hoi tu dump file
pg_restore -h db.xxx.supabase.co -U postgres -d postgres backup.dump

# Hoac tu SQL file
psql -h db.xxx.supabase.co -U postgres -d postgres < backup.sql
```

**Tu Supabase Dashboard (Pro plan):**
1. Vao Database > Backups
2. Chon thoi diem can phuc hoi
3. Nhan "Restore"

### 5.4 Backup Storage

```bash
# Dung Supabase CLI
supabase storage download --project-ref xxx -o ./storage-backup/

# Hoac dung rclone
rclone sync supabase:bucket-name ./storage-backup/
```

---

## 6. BAO MAT

### 6.1 Checklist bao mat

- [ ] RLS duoc bat tren tat ca cac bang
- [ ] API keys duoc luu trong environment variables
- [ ] HTTPS duoc bat (Vercel tu dong)
- [ ] Password policy: toi thieu 6 ky tu
- [ ] JWT expiry duoc cau hinh hop ly
- [ ] CORS duoc cau hinh dung
- [ ] Rate limiting duoc bat
- [ ] Logging duoc cau hinh

### 6.2 Quan ly API Keys

**Cac loai key:**

| Key | Su dung | Bao mat |
|-----|---------|---------|
| `anon` | Client-side, public | An toan, bi gioi han boi RLS |
| `service_role` | Server-side only | KHONG BAO GIO expose ra client |

**Rotate keys:**
1. Vao Supabase Dashboard > Settings > API
2. Tao key moi
3. Cap nhat environment variables
4. Deploy lai ung dung
5. Xoa key cu

### 6.3 Audit Log

**Xem log hoat dong:**

```sql
-- Log dang nhap gan day
SELECT * FROM auth.audit_log_entries
ORDER BY created_at DESC
LIMIT 100;

-- Log thay doi du lieu (can setup trigger)
SELECT * FROM audit_log
WHERE created_at > NOW() - INTERVAL '24 hours';
```

**Tao audit trigger:**

```sql
-- Tao bang audit
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT,
  record_id UUID,
  action TEXT,
  old_data JSONB,
  new_data JSONB,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tao function
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, user_id)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Ap dung cho bang
CREATE TRIGGER audit_products
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
```

### 6.4 Rate Limiting

**Cau hinh trong Supabase:**
- API Rate Limit: 1000 requests/hour (Free tier)
- Upgrade len Pro de tang limit

**Custom rate limiting trong Edge Function:**

```typescript
const RATE_LIMIT = 100 // requests per minute
const rateLimit = new Map<string, { count: number; timestamp: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userLimit = rateLimit.get(userId)

  if (!userLimit || now - userLimit.timestamp > 60000) {
    rateLimit.set(userId, { count: 1, timestamp: now })
    return true
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false
  }

  userLimit.count++
  return true
}
```

---

## 7. GIAM SAT VA LOG

### 7.1 Sentry (Error Tracking)

**Xem loi:**
1. Truy cap https://sentry.io
2. Chon project
3. Xem Issues tab

**Filter loi:**
- Theo environment: production, development
- Theo user
- Theo thoi gian
- Theo severity

### 7.2 Supabase Logs

**Xem trong Dashboard:**
1. Vao Supabase Dashboard
2. Chon Logs
3. Filter theo:
   - API logs
   - Auth logs
   - Database logs
   - Edge Function logs

**Query logs:**
```sql
-- Xem slow queries
SELECT * FROM pg_stat_statements
WHERE mean_time > 1000 -- > 1 second
ORDER BY mean_time DESC;
```

### 7.3 Vercel Logs

1. Truy cap Vercel Dashboard
2. Chon Project
3. Vao Logs tab
4. Filter theo:
   - Runtime logs
   - Build logs
   - Edge logs

### 7.4 Monitoring Metrics

**Cac metric quan trong:**

| Metric | Nguong canh bao | Cong cu |
|--------|-----------------|---------|
| API Response Time | > 2s | Sentry, Vercel |
| Error Rate | > 1% | Sentry |
| Database Connections | > 80% | Supabase |
| Storage Usage | > 80% | Supabase |
| Edge Function Invocations | Gan limit | Supabase |

---

## 8. XU LY SU CO

### 8.1 Cac loi thuong gap

**LOI: "Unauthorized" khi goi API**

Nguyen nhan:
- Token het han
- RLS chan truy cap

Cach xu ly:
1. Kiem tra token trong request header
2. Verify token con hieu luc
3. Kiem tra RLS policies
4. Refresh token neu can

**LOI: "Database connection failed"**

Nguyen nhan:
- Qua nhieu connection
- Network issue

Cach xu ly:
1. Kiem tra connection pool
2. Restart Edge Functions
3. Kiem tra Supabase status

**LOI: "Edge Function timeout"**

Nguyen nhan:
- Query cham
- Logic phuc tap

Cach xu ly:
1. Optimize query (them index)
2. Chia nho logic
3. Tang timeout (neu can)

### 8.2 Rollback deployment

**Rollback tren Vercel:**
1. Vao Deployments
2. Tim deployment can rollback
3. Nhan menu > Promote to Production

**Rollback database:**
1. Dung backup gan nhat
2. Chay pg_restore
3. Verify du lieu

### 8.3 Emergency Contacts

| Vai tro | Lien he |
|---------|---------|
| Tech Lead | tech-lead@company.com |
| DevOps | devops@company.com |
| Supabase Support | support@supabase.io |
| Vercel Support | support@vercel.com |

### 8.4 Incident Response

1. **Phat hien**: Tu monitoring hoac bao cao nguoi dung
2. **Danh gia**: Xac dinh muc do nghiem trong
3. **Thong bao**: Bao cao stakeholders
4. **Xu ly**: Fix hoac rollback
5. **Xac nhan**: Test lai he thong
6. **Post-mortem**: Ghi nhan va rut kinh nghiem

---

## 9. NANG CAP HE THONG

### 9.1 Quy trinh deploy

```
1. Development (local)
   |
2. Preview (Vercel preview)
   |
3. Staging (optional)
   |
4. Production
```

### 9.2 Deploy len Production

**Tu dong qua GitHub:**
1. Push code len main branch
2. Vercel tu dong build va deploy
3. Kiem tra preview deployment
4. Promote len production

**Thu cong:**
```bash
# Build
npm run build

# Deploy (dung Vercel CLI)
vercel --prod
```

### 9.3 Database Migration

1. Tao migration file moi:
```bash
supabase migration new ten_migration
```

2. Viet SQL trong file migration

3. Test o local:
```bash
supabase db reset
```

4. Apply len production:
```bash
supabase db push
```

### 9.4 Rollback Migration

```bash
# Xem danh sach migrations
supabase migration list

# Rollback migration cuoi
supabase migration repair --status reverted [version]

# Chay lai migration
supabase db push
```

### 9.5 Zero-downtime Deployment

1. Deploy Edge Functions truoc (backward compatible)
2. Chay database migration
3. Deploy frontend
4. Monitor loi
5. Rollback neu can

---

## PHU LUC

### A. Cac lenh CLI thuong dung

```bash
# Supabase
supabase start          # Khoi dong local
supabase stop           # Dung local
supabase db reset       # Reset database local
supabase db push        # Apply migrations
supabase functions serve # Chay functions local

# Vercel
vercel                  # Deploy preview
vercel --prod           # Deploy production
vercel logs             # Xem logs

# Next.js
npm run dev             # Development
npm run build           # Build production
npm run start           # Start production
npm run lint            # Check lint
```

### B. Cau hinh mau

**File `next.config.js`:**
```javascript
module.exports = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['xxx.supabase.co'],
  },
}
```

### C. Tai lieu tham khao

- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Sentry Docs](https://docs.sentry.io)

---

*Tai lieu nay danh cho quan tri vien he thong Quan ly Cua hang PWA phien ban 1.0*
