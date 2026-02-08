import { useQuery } from '@tanstack/react-query';
import { 
  reportDataEngine, 
  FlexibleReportConfig, 
  CategoryBreakdownData, 
  PeriodComparisonData, 
  MonthlyTrendData, 
  CashFlowData 
} from '@/lib/reports-data-engine';

// Hook for category breakdown data
export function useCategoryBreakdown(config: FlexibleReportConfig) {
  return useQuery<CategoryBreakdownData[]>({
    queryKey: ['categoryBreakdown', config],
    queryFn: () => reportDataEngine.getCategoryBreakdown(config),
    enabled: !!config.dateRange.start && !!config.dateRange.end,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for period comparison data
export function usePeriodComparison(config: FlexibleReportConfig) {
  return useQuery<PeriodComparisonData[]>({
    queryKey: ['periodComparison', config],
    queryFn: () => reportDataEngine.getPeriodComparison(config),
    enabled: !!config.comparison?.enabled && !!config.dateRange.start && !!config.dateRange.end,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for monthly trends
export function useMonthlyTrends(config: FlexibleReportConfig) {
  return useQuery<MonthlyTrendData[]>({
    queryKey: ['monthlyTrends', config],
    queryFn: () => reportDataEngine.getMonthlyTrends(config),
    enabled: !!config.dateRange.start && !!config.dateRange.end,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for cash flow data
export function useCashFlowData(config: FlexibleReportConfig) {
  return useQuery<CashFlowData[]>({
    queryKey: ['cashFlow', config],
    queryFn: () => reportDataEngine.getCashFlowData(config),
    enabled: !!config.dateRange.start && !!config.dateRange.end,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for P&L structure
export function usePLStructure(config: FlexibleReportConfig) {
  return useQuery<CategoryBreakdownData[]>({
    queryKey: ['plStructure', config],
    queryFn: () => reportDataEngine.getPLStructure(config),
    enabled: !!config.dateRange.start && !!config.dateRange.end,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Combined hook for all report data
export function useReportData(config: FlexibleReportConfig) {
  const categoryBreakdown = useCategoryBreakdown(config);
  const periodComparison = usePeriodComparison(config);
  const monthlyTrends = useMonthlyTrends(config);
  const cashFlow = useCashFlowData(config);
  const plStructure = usePLStructure(config);

  return {
    categoryBreakdown,
    periodComparison,
    monthlyTrends,
    cashFlow,
    plStructure,
    isLoading: categoryBreakdown.isLoading || monthlyTrends.isLoading || cashFlow.isLoading,
    isError: categoryBreakdown.isError || monthlyTrends.isError || cashFlow.isError,
    error: categoryBreakdown.error || monthlyTrends.error || cashFlow.error,
  };
}

// Hook for real-time report preview (for report builder)
export function useReportPreview(config: FlexibleReportConfig | null) {
  return useQuery<{
    categoryBreakdown: CategoryBreakdownData[];
    monthlyTrends: MonthlyTrendData[];
    summary: {
      totalIncome: number;
      totalExpenditure: number;
      netPosition: number;
      transactionCount: number;
    };
  }>({
    queryKey: ['reportPreview', config],
    queryFn: async () => {
      if (!config) throw new Error('No config provided');
      
      const [categoryBreakdown, monthlyTrends] = await Promise.all([
        reportDataEngine.getCategoryBreakdown(config),
        reportDataEngine.getMonthlyTrends(config),
      ]);

      // Calculate summary statistics
      const totalIncome = monthlyTrends.reduce((sum, month) => sum + month.income_total, 0);
      const totalExpenditure = monthlyTrends.reduce((sum, month) => sum + month.expenditure_total, 0);
      const netPosition = totalIncome - totalExpenditure;
      const transactionCount = categoryBreakdown.reduce((sum, cat) => sum + cat.transaction_count, 0);

      return {
        categoryBreakdown,
        monthlyTrends,
        summary: {
          totalIncome,
          totalExpenditure,
          netPosition,
          transactionCount,
        },
      };
    },
    enabled: !!config?.dateRange.start && !!config?.dateRange.end,
    staleTime: 30 * 1000, // 30 seconds for preview (more frequent updates)
  });
}
