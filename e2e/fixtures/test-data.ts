/**
 * Test data constants for E2E tests
 */

// Valid test user credentials
export const TEST_USER = {
  phone: '0912345678',
  password: 'testpassword123',
  storeName: 'Test Store',
}

// Invalid credentials for testing error scenarios
export const INVALID_USER = {
  phone: '0999999999',
  password: 'wrongpassword',
}

// Test products for POS flow
export const TEST_PRODUCTS = [
  {
    name: 'Test Product 1',
    price: 50000,
    quantity: 10,
    sku: 'SKU001',
  },
  {
    name: 'Test Product 2',
    price: 75000,
    quantity: 5,
    sku: 'SKU002',
  },
  {
    name: 'Test Product 3',
    price: 100000,
    quantity: 20,
    sku: 'SKU003',
  },
]

// Test categories
export const TEST_CATEGORIES = [
  { name: 'Thuc pham', slug: 'food' },
  { name: 'Do uong', slug: 'beverage' },
  { name: 'Gia dung', slug: 'household' },
]

// Reports - 7 books as per requirements
export const REPORT_TYPES = [
  { key: 'revenue', title: 'So doanh thu' },
  { key: 'cash', title: 'So tiền mặt' },
  { key: 'bank', title: 'So tien gui' },
  { key: 'expense', title: 'So chi phi' },
  { key: 'inventory', title: 'So ton kho' },
  { key: 'tax', title: 'So nghia vu thue' },
  { key: 'salary', title: 'So luong' },
]

// Page routes
export const ROUTES = {
  login: '/login',
  dashboard: '/',
  pos: '/pos',
  products: '/products',
  inventory: '/inventory',
  finance: '/finance',
  reports: '/reports',
  tax: '/tax',
  hr: '/hr',
  settings: '/settings',
}

// Common timeouts
export const TIMEOUTS = {
  short: 3000,
  medium: 5000,
  long: 10000,
  navigation: 15000,
}

// Test payment methods
export const PAYMENT_METHODS = {
  cash: 'Tiền mặt',
  bank: 'Chuyen khoan',
  mixed: 'Ket hop',
}

// Inventory adjustment types
export const ADJUSTMENT_TYPES = {
  import: 'Nhap kho',
  export: 'Xuat kho',
}

// Low stock threshold for testing
export const LOW_STOCK_THRESHOLD = 5
