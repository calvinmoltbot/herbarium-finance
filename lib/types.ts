export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: 'income' | 'expenditure' | 'capital';
  color?: string;
  capital_movement_type?: 'injection' | 'drawing' | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  category_id?: string;
  amount: number;
  type: 'income' | 'expenditure' | 'capital';
  description?: string;
  transaction_date: string;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface DashboardStats {
  totalIncome: number;
  totalExpenditure: number;
  netBalance: number;
}

export interface MonthlyData {
  month: string;
  income: number;
  expenditure: number;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

// Enhanced Reporting Module Types

export interface CustomDateRange {
  start: Date;
  end: Date;
  label?: string;
  preset?: boolean;
}

export interface SavedReport {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  report_type: 'pl' | 'comparison' | 'capital' | 'drill_down' | 'custom';
  config: ReportConfig;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  last_viewed_at?: string;
}

export interface ReportConfig {
  dateRange: {
    start: string;
    end: string;
    label?: string;
  };
  comparison?: {
    comparisonPeriod: {
      start: string;
      end: string;
      label?: string;
    };
    comparisonType: 'previous_period' | 'same_period_last_year' | 'custom';
  };
  filters?: {
    hierarchyIds?: string[];
    categoryIds?: string[];
    includeTypes?: ('income' | 'expenditure' | 'capital')[];
  };
  display?: {
    showTransactions?: boolean;
    expandedHierarchies?: string[];
    sortBy?: 'name' | 'amount' | 'variance';
  };
}

export interface DateRangePreset {
  id: string;
  user_id: string;
  label: string;
  start_date: string;
  end_date: string;
  display_order: number;
  created_at: string;
}

// Period Comparison Types

export type ComparisonType = 'previous_period' | 'same_period_last_year' | 'custom';

export interface PeriodComparisonConfig {
  enabled: boolean;
  currentPeriod: CustomDateRange;
  comparisonPeriod: CustomDateRange;
  comparisonType: ComparisonType;
}

export interface ComparisonResult {
  name: string;
  hierarchyId?: string;
  categoryId?: string;
  type: 'income' | 'expenditure' | 'capital';
  current: number;
  previous: number;
  variance: number;
  variancePercentage: number;
  trend: 'up' | 'down' | 'flat';
}

export interface HierarchyComparisonResult extends ComparisonResult {
  categories: CategoryComparisonResult[];
}

export interface CategoryComparisonResult extends ComparisonResult {
  color?: string;
  transactionCount: {
    current: number;
    previous: number;
  };
}
