// Regular chart components (direct imports)
export { SalesLineChart } from './SalesLineChart'
export { CategoryPieChart } from './CategoryPieChart'
export { TopProductsBarChart } from './TopProductsBarChart'
export { PaymentMethodsPieChart } from './PaymentMethodsPieChart'
export { RevenueExpenseChart } from './RevenueExpenseChart'

// Dynamic imports for code splitting
export {
  DynamicSalesLineChart,
  DynamicCategoryPieChart,
  DynamicTopProductsBarChart,
  DynamicPaymentMethodsPieChart,
  DynamicRevenueExpenseChart,
} from './dynamic'

// Lazy loading wrappers with Intersection Observer
export {
  LazyChartWrapper,
  LazySalesLineChart,
  LazyCategoryPieChart,
  LazyTopProductsBarChart,
  LazyPaymentMethodsPieChart,
  LazyRevenueExpenseChart,
  useLazyChartRender,
} from './LazyChartWrapper'
