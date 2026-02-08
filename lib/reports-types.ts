// Reports System Types
// Phase 2: Custom Report Writer Development
// Date: 08/07/2025

export interface Report {
  id: string;
  name: string;
  description?: string;
  config: ReportConfig;
  template_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  config: ReportConfig;
  is_system: boolean;
  created_at: string;
}

export interface ScheduledReport {
  id: string;
  report_id: string;
  schedule_config: ScheduleConfig;
  last_run?: string;
  next_run?: string;
  is_active: boolean;
  created_at: string;
}

export interface ReportConfig {
  type: ReportType;
  sections: ReportSection[];
  defaultFilters?: ReportFilters;
  formatting?: ReportFormatting;
  charts?: ChartConfig[];
}

export type ReportType = 
  | 'profit_loss'
  | 'cash_flow'
  | 'category_analysis'
  | 'transaction_detail'
  | 'custom';

export interface ReportSection {
  name: string;
  type: SectionType;
  groupBy?: GroupByOption;
  aggregation?: AggregationType;
  showSubtotals?: boolean;
  showPercentages?: boolean;
  sortBy?: SortOption;
  columns?: string[];
  formula?: string;
}

export type SectionType = 
  | 'income'
  | 'expenditure'
  | 'transactions'
  | 'calculation'
  | 'summary';

export type GroupByOption = 
  | 'category'
  | 'date'
  | 'type'
  | 'hierarchy'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export type AggregationType = 
  | 'sum'
  | 'average'
  | 'count'
  | 'min'
  | 'max';

export type SortOption = 
  | 'amount_asc'
  | 'amount_desc'
  | 'date_asc'
  | 'date_desc'
  | 'category_asc'
  | 'category_desc'
  | 'name_asc'
  | 'name_desc';

export interface ReportFilters {
  dateRange?: DateRangeOption | CustomDateRange;
  categories?: string[];
  transactionTypes?: TransactionType[];
  amountRange?: AmountRange;
  includeNotes?: boolean;
  includeMetadata?: boolean;
  groupBy?: GroupByOption;
  searchTerm?: string;
}

export type DateRangeOption = 
  | 'today'
  | 'yesterday'
  | 'last_week'
  | 'last_month'
  | 'last_quarter'
  | 'last_year'
  | 'last_three_months'
  | 'last_six_months'
  | 'year_to_date'
  | 'custom';

export interface CustomDateRange {
  startDate: string;
  endDate: string;
}

export type TransactionType = 'income' | 'expenditure' | 'capital';

export interface AmountRange {
  min?: number;
  max?: number;
}

export interface ReportFormatting {
  currency?: 'GBP' | 'USD' | 'EUR';
  dateFormat?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  showPercentages?: boolean;
  pageSize?: number;
  showRunningTotal?: boolean;
  decimalPlaces?: number;
}

export interface ChartConfig {
  type: ChartType;
  title: string;
  data?: string;
  xAxis?: string;
  yAxis?: string;
  colors?: string[];
}

export type ChartType = 
  | 'line'
  | 'bar'
  | 'pie'
  | 'area'
  | 'scatter';

export interface ScheduleConfig {
  frequency: ScheduleFrequency;
  time?: string; // HH:MM format
  dayOfWeek?: number; // 0-6, Sunday = 0
  dayOfMonth?: number; // 1-31
  timezone?: string;
  emailRecipients?: string[];
  format?: ExportFormat[];
}

export type ScheduleFrequency = 
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export type ExportFormat = 
  | 'pdf'
  | 'excel'
  | 'csv'
  | 'json';

// Report Data Types
export interface ReportData {
  sections: Record<string, ReportSectionData>;
  metadata: ReportMetadata;
  summary?: ReportSummary;
}

export interface ReportSectionData {
  data: TransactionData[] | CategoryData[] | CalculationData[];
  totals?: SectionTotals;
  charts?: ChartData[];
}

export interface TransactionData {
  id: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  type: TransactionType;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface CategoryData {
  category: string;
  amount: number;
  count: number;
  percentage?: number;
  transactions?: TransactionData[];
}

export interface CalculationData {
  label: string;
  value: number;
  formula?: string;
  breakdown?: Record<string, number>;
}

export interface SectionTotals {
  total: number;
  count: number;
  average?: number;
  min?: number;
  max?: number;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}

export interface ReportMetadata {
  generatedAt: string;
  filters: ReportFilters;
  totalTransactions: number;
  dateRange: {
    start: string;
    end: string;
  };
  currency: string;
}

export interface ReportSummary {
  totalIncome: number;
  totalExpenditure: number;
  netProfit: number;
  topCategories: {
    income: CategoryData[];
    expenditure: CategoryData[];
  };
  trends?: TrendData[];
}

export interface TrendData {
  period: string;
  income: number;
  expenditure: number;
  netProfit: number;
}

// Export Options
export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  includeCharts?: boolean;
  includeMetadata?: boolean;
  pageOrientation?: 'portrait' | 'landscape';
  pageSize?: 'A4' | 'A3' | 'Letter';
}

// Report Builder Types
export interface ReportBuilderState {
  name: string;
  description: string;
  sections: ReportSection[];
  filters: ReportFilters;
  formatting: ReportFormatting;
  charts: ChartConfig[];
  preview?: ReportData;
  isLoading: boolean;
  errors: string[];
}

export interface ReportBuilderAction {
  type: ReportBuilderActionType;
  payload?: any;
}

export type ReportBuilderActionType = 
  | 'SET_NAME'
  | 'SET_DESCRIPTION'
  | 'ADD_SECTION'
  | 'UPDATE_SECTION'
  | 'REMOVE_SECTION'
  | 'SET_FILTERS'
  | 'UPDATE_FILTER'
  | 'SET_FORMATTING'
  | 'ADD_CHART'
  | 'UPDATE_CHART'
  | 'REMOVE_CHART'
  | 'SET_PREVIEW'
  | 'SET_LOADING'
  | 'SET_ERROR'
  | 'CLEAR_ERRORS'
  | 'RESET';

// API Response Types
export interface ReportsResponse {
  data: Report[];
  count: number;
  error?: string;
}

export interface ReportTemplatesResponse {
  data: ReportTemplate[];
  count: number;
  error?: string;
}

export interface ReportDataResponse {
  data: ReportData;
  error?: string;
}

export interface CreateReportRequest {
  name: string;
  description?: string;
  config: ReportConfig;
  template_id?: string;
}

export interface UpdateReportRequest {
  id: string;
  name?: string;
  description?: string;
  config?: ReportConfig;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  config: ReportConfig;
}

export interface ScheduleReportRequest {
  report_id: string;
  schedule_config: ScheduleConfig;
}

// Utility Types
export type ReportField = keyof Report;
export type ReportTemplateField = keyof ReportTemplate;
export type ScheduledReportField = keyof ScheduledReport;

// Default Configurations
export const DEFAULT_REPORT_FORMATTING: ReportFormatting = {
  currency: 'GBP',
  dateFormat: 'DD/MM/YYYY',
  showPercentages: true,
  pageSize: 50,
  showRunningTotal: false,
  decimalPlaces: 2,
};

export const DEFAULT_REPORT_FILTERS: ReportFilters = {
  dateRange: 'last_month',
  includeNotes: false,
  includeMetadata: false,
};

export const DATE_RANGE_OPTIONS: { value: DateRangeOption; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_quarter', label: 'Last Quarter' },
  { value: 'last_year', label: 'Last Year' },
  { value: 'last_three_months', label: 'Last 3 Months' },
  { value: 'last_six_months', label: 'Last 6 Months' },
  { value: 'year_to_date', label: 'Year to Date' },
  { value: 'custom', label: 'Custom Range' },
];

export const CHART_TYPE_OPTIONS: { value: ChartType; label: string }[] = [
  { value: 'line', label: 'Line Chart' },
  { value: 'bar', label: 'Bar Chart' },
  { value: 'pie', label: 'Pie Chart' },
  { value: 'area', label: 'Area Chart' },
  { value: 'scatter', label: 'Scatter Plot' },
];

export const EXPORT_FORMAT_OPTIONS: { value: ExportFormat; label: string }[] = [
  { value: 'pdf', label: 'PDF' },
  { value: 'excel', label: 'Excel' },
  { value: 'csv', label: 'CSV' },
  { value: 'json', label: 'JSON' },
];

// Sprint 3: Transaction Drill-Down Types
// Added: 2025-01-24
// Purpose: Support drill-down from P&L categories/hierarchies to transaction detail

export interface DrillDownContext {
  hierarchyId?: string;
  categoryId?: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  type: 'income' | 'expenditure' | 'capital';
  hierarchyName?: string;
  categoryName?: string;
}

export interface DrillDownData {
  summary: {
    total: number;
    count: number;
    average: number;
  };
  transactions: TransactionDetail[];
  pagination: {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalCount: number;
  };
}

export interface TransactionDetail {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  categoryId: string;
  hierarchy: string;
  hierarchyId: string;
  type: 'income' | 'expenditure' | 'capital';
  metadata?: TransactionMetadata;
}

export interface TransactionMetadata {
  [key: string]: any;
}

export interface DrillDownFilters {
  dateRange?: { start: Date; end: Date };
  amountRange?: { min?: number; max?: number };
  searchText?: string;
}
