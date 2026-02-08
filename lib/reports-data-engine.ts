import { createClient } from '@/supabase/client';
import type { HierarchyComparisonResult, CategoryComparisonResult } from './types';

// Core Report Configuration Types
export interface FlexibleReportConfig {
  name: string;
  dateRange: {
    start: Date;
    end: Date;
    period: 'monthly' | 'quarterly' | 'annual';
  };
  comparison?: {
    enabled: boolean;
    previousPeriod: boolean; // vs same period last year
  };
  groupBy: 'category' | 'hierarchy' | 'month' | 'quarter';
  includeTypes: ('income' | 'expenditure' | 'capital')[];
  visualizations: ('table' | 'bar_chart' | 'line_chart' | 'pie_chart')[];
  filters?: {
    categoryIds?: string[];
    hierarchyIds?: string[];
    minAmount?: number;
    maxAmount?: number;
  };
}

// Report Data Types
export interface CategoryBreakdownData {
  category_name: string;
  category_id: string;
  hierarchy_name?: string;
  hierarchy_id?: string;
  total_amount: number;
  transaction_count: number;
  average_amount: number;
  percentage_of_total: number;
}

export interface PeriodComparisonData {
  period_label: string;
  category_name?: string;
  hierarchy_name?: string;
  current_period_total: number;
  previous_period_total: number;
  variance: number;
  variance_percentage: number;
}

export interface MonthlyTrendData {
  month: string;
  year: number;
  month_year: string;
  income_total: number;
  expenditure_total: number;
  capital_total: number;
  net_position: number;
}

export interface CashFlowData {
  date: string;
  income: number;
  expenditure: number;
  net_flow: number;
  running_balance: number;
}

// Hierarchical P&L Data Types
export interface HierarchicalPLData {
  income: HierarchySection[];
  expenditure: HierarchySection[];
  capital: HierarchySection[];
  totals: PLTotals;
  dateRange: {
    start: string;
    end: string;
    label: string;
  };
}

export interface HierarchySection {
  id: string;
  name: string;
  type: 'income' | 'expenditure' | 'capital';
  total_amount: number;
  categories: CategoryInHierarchy[];
  display_order: number;
}

export interface CategoryInHierarchy {
  id: string;
  name: string;
  color?: string;
  total_amount: number;
  transaction_count: number;
  transactions: TransactionInCategory[];
}

export interface TransactionInCategory {
  id: string;
  amount: number;
  date: string;
  description: string;
  type: string;
}

export interface PLTotals {
  total_income: number;
  total_expenditure: number;
  net_operating_profit: number;
  total_capital_movements: number;
  profit_after_capital_movements: number;
}

// Report Data Engine Class
export class ReportDataEngine {
  private supabase = createClient();

  // Get Category Breakdown (P&L Structure)
  async getCategoryBreakdown(config: FlexibleReportConfig): Promise<CategoryBreakdownData[]> {
    const { dateRange, includeTypes, groupBy, filters } = config;
    
    try {
      let query = this.supabase
        .from('transactions')
        .select(`
          id,
          amount,
          type,
          category_id,
          transaction_date,
          categories!inner(
            id,
            name,
            type
          )
        `)
        .gte('transaction_date', dateRange.start.toISOString().split('T')[0])
        .lte('transaction_date', dateRange.end.toISOString().split('T')[0]);

      // Apply type filters
      if (includeTypes.length > 0) {
        query = query.in('type', includeTypes);
      }

      // Apply category filters
      if (filters?.categoryIds?.length) {
        query = query.in('category_id', filters.categoryIds);
      }

      // Apply amount filters
      if (filters?.minAmount !== undefined) {
        query = query.gte('amount', filters.minAmount);
      }
      if (filters?.maxAmount !== undefined) {
        query = query.lte('amount', filters.maxAmount);
      }

      const { data: transactions, error } = await query;
      
      if (error) {
        console.error('Error fetching category breakdown:', error);
        throw error;
      }

      if (!transactions || transactions.length === 0) {
        return [];
      }

      // If grouping by hierarchy, fetch hierarchy data separately
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let hierarchyData: any[] = [];
      if (groupBy === 'hierarchy') {
        const categoryIds = [...new Set(transactions.map(t => t.category_id))];
        const { data: hierarchies, error: hierarchyError } = await this.supabase
          .from('category_hierarchy_assignments')
          .select(`
            category_id,
            category_hierarchies!inner(
              id,
              name,
              type
            )
          `)
          .in('category_id', categoryIds);

        if (hierarchyError) {
          console.error('Error fetching hierarchy data:', hierarchyError);
        } else {
          hierarchyData = hierarchies || [];
        }
      }

      // Process and aggregate data - cast needed because Supabase returns joins as arrays
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const aggregated = this.aggregateCategoryData(transactions as any, groupBy, hierarchyData);
      return this.calculatePercentages(aggregated);
    } catch (error) {
      console.error('Error in getCategoryBreakdown:', error);
      throw error;
    }
  }

  // Get Period Comparison Data
  async getPeriodComparison(config: FlexibleReportConfig): Promise<PeriodComparisonData[]> {
    if (!config.comparison?.enabled) {
      return [];
    }

    const currentPeriodData = await this.getCategoryBreakdown(config);
    
    // Calculate previous period dates
    const previousConfig = this.getPreviousPeriodConfig(config);
    const previousPeriodData = await this.getCategoryBreakdown(previousConfig);

    return this.comparePeriods(currentPeriodData, previousPeriodData, config.groupBy);
  }

  // Get Monthly Trend Data
  async getMonthlyTrends(config: FlexibleReportConfig): Promise<MonthlyTrendData[]> {
    const { dateRange, includeTypes } = config;
    
    const { data, error } = await this.supabase
      .from('transactions')
      .select(`
        amount,
        type,
        transaction_date
      `)
      .gte('transaction_date', dateRange.start.toISOString().split('T')[0])
      .lte('transaction_date', dateRange.end.toISOString().split('T')[0])
      .in('type', includeTypes.length > 0 ? includeTypes : ['income', 'expenditure', 'capital']);

    if (error) {
      console.error('Error fetching monthly trends:', error);
      throw error;
    }

    return this.aggregateMonthlyData(data || []);
  }

  // Get Cash Flow Data
  async getCashFlowData(config: FlexibleReportConfig): Promise<CashFlowData[]> {
    const { dateRange } = config;
    
    const { data, error } = await this.supabase
      .from('transactions')
      .select(`
        amount,
        type,
        transaction_date
      `)
      .gte('transaction_date', dateRange.start.toISOString().split('T')[0])
      .lte('transaction_date', dateRange.end.toISOString().split('T')[0])
      .order('transaction_date', { ascending: true });

    if (error) {
      console.error('Error fetching cash flow data:', error);
      throw error;
    }

    return this.calculateCashFlow(data || []);
  }

  // Get P&L Structure (Hierarchy-based)
  async getPLStructure(config: FlexibleReportConfig): Promise<CategoryBreakdownData[]> {
    const { dateRange, includeTypes } = config;
    
    const { data, error } = await this.supabase
      .from('category_hierarchies')
      .select(`
        id,
        name,
        type,
        display_order,
        category_hierarchy_assignments(
          categories(
            id,
            name,
            transactions(
              amount,
              transaction_date
            )
          )
        )
      `)
      .in('type', includeTypes.length > 0 ? includeTypes : ['income', 'expenditure', 'capital'])
      .order('type', { ascending: true })
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching P&L structure:', error);
      throw error;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.processPLStructure((data || []) as any, dateRange);
  }

  // Get Hierarchical P&L Data (Enhanced for Standard P&L Report)
  async getHierarchicalPLData(config: FlexibleReportConfig): Promise<HierarchicalPLData> {
    const { dateRange } = config;
    
    try {
      // Get all hierarchies with their categories and transactions
      const { data: hierarchies, error } = await this.supabase
        .from('category_hierarchies')
        .select(`
          id,
          name,
          type,
          display_order,
          category_hierarchy_assignments(
            categories(
              id,
              name,
              color,
              transactions(
                id,
                amount,
                transaction_date,
                description,
                type
              )
            )
          )
        `)
        .order('type', { ascending: true })
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching hierarchical P&L data:', error);
        throw error;
      }

      // Get uncategorized transactions
      const { data: uncategorizedTransactions, error: uncategorizedError } = await this.supabase
        .from('transactions')
        .select(`
          id,
          amount,
          transaction_date,
          description,
          type
        `)
        .is('category_id', null)
        .gte('transaction_date', dateRange.start.toISOString().split('T')[0])
        .lte('transaction_date', dateRange.end.toISOString().split('T')[0]);

      if (uncategorizedError) {
        console.error('Error fetching uncategorized transactions:', uncategorizedError);
        throw uncategorizedError;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return this.processHierarchicalPLData((hierarchies || []) as any, dateRange, uncategorizedTransactions || []);
    } catch (error) {
      console.error('Error in getHierarchicalPLData:', error);
      throw error;
    }
  }

  // Private helper methods
  private aggregateCategoryData(transactions: { category_id: string; amount: string | number; categories: { id: string; name: string; type: string } }[], groupBy: string, hierarchyData: { category_id: string; category_hierarchies: { id: string; name: string; type: string } }[] = []): CategoryBreakdownData[] {
    const aggregated = new Map<string, CategoryBreakdownData>();

    // Create a map of category to hierarchy for quick lookup
    const categoryToHierarchy = new Map();
    hierarchyData.forEach(item => {
      categoryToHierarchy.set(item.category_id, item.category_hierarchies);
    });

    transactions.forEach(transaction => {
      const category = transaction.categories;
      const hierarchy = categoryToHierarchy.get(transaction.category_id);
      
      const key = groupBy === 'hierarchy' && hierarchy 
        ? `hierarchy_${hierarchy.id}`
        : `category_${category.id}`;

      if (!aggregated.has(key)) {
        aggregated.set(key, {
          category_name: groupBy === 'hierarchy' && hierarchy ? hierarchy.name : category.name,
          category_id: groupBy === 'hierarchy' && hierarchy ? hierarchy.id : category.id,
          hierarchy_name: hierarchy?.name,
          hierarchy_id: hierarchy?.id,
          total_amount: 0,
          transaction_count: 0,
          average_amount: 0,
          percentage_of_total: 0,
        });
      }

      const item = aggregated.get(key)!;
      item.total_amount += parseFloat(String(transaction.amount));
      item.transaction_count += 1;
    });

    // Calculate averages
    aggregated.forEach(item => {
      item.average_amount = item.total_amount / item.transaction_count;
    });

    return Array.from(aggregated.values()).sort((a, b) => Math.abs(b.total_amount) - Math.abs(a.total_amount));
  }

  private calculatePercentages(data: CategoryBreakdownData[]): CategoryBreakdownData[] {
    const total = data.reduce((sum, item) => sum + Math.abs(item.total_amount), 0);
    
    return data.map(item => ({
      ...item,
      percentage_of_total: total > 0 ? (Math.abs(item.total_amount) / total) * 100 : 0,
    }));
  }

  private getPreviousPeriodConfig(config: FlexibleReportConfig): FlexibleReportConfig {
    const { dateRange } = config;
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);

    switch (dateRange.period) {
      case 'monthly':
        start.setMonth(start.getMonth() - 1);
        end.setMonth(end.getMonth() - 1);
        break;
      case 'quarterly':
        start.setMonth(start.getMonth() - 3);
        end.setMonth(end.getMonth() - 3);
        break;
      case 'annual':
        start.setFullYear(start.getFullYear() - 1);
        end.setFullYear(end.getFullYear() - 1);
        break;
    }

    return {
      ...config,
      dateRange: { ...dateRange, start, end },
      comparison: { enabled: false, previousPeriod: false },
    };
  }

  private comparePeriods(
    current: CategoryBreakdownData[], 
    previous: CategoryBreakdownData[], 
    groupBy: string
  ): PeriodComparisonData[] {
    const previousMap = new Map(
      previous.map(item => [
        groupBy === 'hierarchy' ? item.hierarchy_id : item.category_id,
        item.total_amount
      ])
    );

    return current.map(item => {
      const key = groupBy === 'hierarchy' ? item.hierarchy_id : item.category_id;
      const previousAmount = previousMap.get(key) || 0;
      const variance = item.total_amount - previousAmount;
      const variancePercentage = previousAmount !== 0 
        ? (variance / Math.abs(previousAmount)) * 100 
        : 0;

      return {
        period_label: 'Current vs Previous',
        category_name: item.category_name,
        hierarchy_name: item.hierarchy_name,
        current_period_total: item.total_amount,
        previous_period_total: previousAmount,
        variance,
        variance_percentage: variancePercentage,
      };
    });
  }

  private aggregateMonthlyData(transactions: { amount: string | number; type: string; transaction_date: string }[]): MonthlyTrendData[] {
    const monthly = new Map<string, MonthlyTrendData>();

    transactions.forEach(transaction => {
      const date = new Date(transaction.transaction_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthly.has(monthKey)) {
        monthly.set(monthKey, {
          month: date.toLocaleString('default', { month: 'long' }),
          year: date.getFullYear(),
          month_year: monthKey,
          income_total: 0,
          expenditure_total: 0,
          capital_total: 0,
          net_position: 0,
        });
      }

      const item = monthly.get(monthKey)!;
      const amount = parseFloat(String(transaction.amount));

      switch (transaction.type) {
        case 'income':
          item.income_total += amount;
          break;
        case 'expenditure':
          item.expenditure_total += Math.abs(amount);
          break;
        case 'capital':
          item.capital_total += amount;
          break;
      }
    });

    // Calculate net position
    monthly.forEach(item => {
      item.net_position = item.income_total - item.expenditure_total + item.capital_total;
    });

    return Array.from(monthly.values()).sort((a, b) => a.month_year.localeCompare(b.month_year));
  }

  private calculateCashFlow(transactions: { amount: string | number; type: string; transaction_date: string }[]): CashFlowData[] {
    const daily = new Map<string, { income: number; expenditure: number }>();

    transactions.forEach(transaction => {
      const date = transaction.transaction_date;
      
      if (!daily.has(date)) {
        daily.set(date, { income: 0, expenditure: 0 });
      }

      const item = daily.get(date)!;
      const amount = parseFloat(String(transaction.amount));

      if (transaction.type === 'income') {
        item.income += amount;
      } else {
        item.expenditure += Math.abs(amount);
      }
    });

    // Convert to array and calculate running balance
    const cashFlow: CashFlowData[] = [];
    let runningBalance = 0;

    Array.from(daily.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, { income, expenditure }]) => {
        const netFlow = income - expenditure;
        runningBalance += netFlow;

        cashFlow.push({
          date,
          income,
          expenditure,
          net_flow: netFlow,
          running_balance: runningBalance,
        });
      });

    return cashFlow;
  }

  private processPLStructure(hierarchies: { id: string; name: string; type: string; display_order: number; category_hierarchy_assignments: { categories: { id: string; name: string; transactions: { amount: string | number; transaction_date: string }[] } }[] }[], dateRange: { start: Date; end: Date }): CategoryBreakdownData[] {
    const startDate = dateRange.start.toISOString().split('T')[0];
    const endDate = dateRange.end.toISOString().split('T')[0];

    return hierarchies.map(hierarchy => {
      let totalAmount = 0;
      let transactionCount = 0;

      hierarchy.category_hierarchy_assignments?.forEach(assignment => {
        assignment.categories?.transactions?.forEach(transaction => {
          if (transaction.transaction_date >= startDate && transaction.transaction_date <= endDate) {
            totalAmount += parseFloat(String(transaction.amount));
            transactionCount += 1;
          }
        });
      });

      return {
        category_name: hierarchy.name,
        category_id: hierarchy.id,
        hierarchy_name: hierarchy.name,
        hierarchy_id: hierarchy.id,
        total_amount: totalAmount,
        transaction_count: transactionCount,
        average_amount: transactionCount > 0 ? totalAmount / transactionCount : 0,
        percentage_of_total: 0, // Will be calculated later
      };
    });
  }

  private processHierarchicalPLData(hierarchies: { id: string; name: string; type: string; display_order: number; category_hierarchy_assignments: { categories: { id: string; name: string; color?: string; transactions: { id: string; amount: string | number; transaction_date: string; description: string; type: string }[] } }[] }[], dateRange: { start: Date; end: Date }, uncategorizedTransactions: { id: string; amount: string | number; transaction_date: string; description: string; type: string }[] = []): HierarchicalPLData {
    const startDate = dateRange.start.toISOString().split('T')[0];
    const endDate = dateRange.end.toISOString().split('T')[0];

    const income: HierarchySection[] = [];
    const expenditure: HierarchySection[] = [];
    const capital: HierarchySection[] = [];

    let totalIncome = 0;
    let totalExpenditure = 0;
    let totalCapital = 0;

    hierarchies.forEach(hierarchy => {
      const categories: CategoryInHierarchy[] = [];
      let hierarchyTotal = 0;

      hierarchy.category_hierarchy_assignments?.forEach(assignment => {
        const category = assignment.categories;
        if (!category) return;

        const transactions: TransactionInCategory[] = [];
        let categoryTotal = 0;
        let transactionCount = 0;

        category.transactions?.forEach(transaction => {
          if (transaction.transaction_date >= startDate && transaction.transaction_date <= endDate) {
            const amount = parseFloat(String(transaction.amount));
            categoryTotal += amount;
            transactionCount += 1;

            transactions.push({
              id: transaction.id,
              amount: amount,
              date: transaction.transaction_date,
              description: transaction.description || '',
              type: transaction.type,
            });
          }
        });

        if (transactionCount > 0) {
          categories.push({
            id: category.id,
            name: category.name,
            color: category.color,
            total_amount: categoryTotal,
            transaction_count: transactionCount,
            transactions: transactions,
          });

          hierarchyTotal += categoryTotal;
        }
      });

      if (categories.length > 0) {
        const hierarchySection: HierarchySection = {
          id: hierarchy.id,
          name: hierarchy.name,
          type: hierarchy.type as 'income' | 'expenditure' | 'capital',
          total_amount: hierarchyTotal,
          categories: categories,
          display_order: hierarchy.display_order || 0,
        };

        switch (hierarchy.type) {
          case 'income':
            income.push(hierarchySection);
            totalIncome += hierarchyTotal;
            break;
          case 'expenditure':
            expenditure.push(hierarchySection);
            // Expenditure should be positive for display but subtracted in net calculation
            totalExpenditure += Math.abs(hierarchyTotal);
            break;
          case 'capital':
            capital.push(hierarchySection);
            totalCapital += hierarchyTotal;
            break;
        }
      }
    });

    // Process uncategorized transactions
    const uncategorizedByType = {
      income: [] as TransactionInCategory[],
      expenditure: [] as TransactionInCategory[],
      capital: [] as TransactionInCategory[]
    };

    let uncategorizedIncome = 0;
    let uncategorizedExpenditure = 0;
    let uncategorizedCapital = 0;

    uncategorizedTransactions.forEach(transaction => {
      const amount = parseFloat(String(transaction.amount));
      const transactionItem: TransactionInCategory = {
        id: transaction.id,
        amount: amount,
        date: transaction.transaction_date,
        description: transaction.description || '',
        type: transaction.type,
      };

      switch (transaction.type) {
        case 'income':
          uncategorizedByType.income.push(transactionItem);
          uncategorizedIncome += amount;
          break;
        case 'expenditure':
          uncategorizedByType.expenditure.push(transactionItem);
          uncategorizedExpenditure += Math.abs(amount);
          break;
        case 'capital':
          uncategorizedByType.capital.push(transactionItem);
          // For capital movements: positive = injection, negative = drawings
          // But we need to separate them for proper bank reconciliation
          uncategorizedCapital += amount;
          break;
      }
    });

    // Add uncategorized sections if there are uncategorized transactions
    if (uncategorizedByType.income.length > 0) {
      income.push({
        id: 'uncategorized-income',
        name: '🔍 Uncategorized Income',
        type: 'income',
        total_amount: uncategorizedIncome,
        categories: [{
          id: 'uncategorized-income-category',
          name: 'Uncategorized Income Items',
          color: '#FFA500',
          total_amount: uncategorizedIncome,
          transaction_count: uncategorizedByType.income.length,
          transactions: uncategorizedByType.income,
        }],
        display_order: 999, // Show at the end
      });
      totalIncome += uncategorizedIncome;
    }

    if (uncategorizedByType.expenditure.length > 0) {
      expenditure.push({
        id: 'uncategorized-expenditure',
        name: '🔍 Uncategorized Expenditure',
        type: 'expenditure',
        total_amount: uncategorizedExpenditure,
        categories: [{
          id: 'uncategorized-expenditure-category',
          name: 'Uncategorized Expenditure Items',
          color: '#FF6B6B',
          total_amount: uncategorizedExpenditure,
          transaction_count: uncategorizedByType.expenditure.length,
          transactions: uncategorizedByType.expenditure,
        }],
        display_order: 999, // Show at the end
      });
      totalExpenditure += uncategorizedExpenditure;
    }

    if (uncategorizedByType.capital.length > 0) {
      capital.push({
        id: 'uncategorized-capital',
        name: '🔍 Uncategorized Capital',
        type: 'capital',
        total_amount: uncategorizedCapital,
        categories: [{
          id: 'uncategorized-capital-category',
          name: 'Uncategorized Capital Items',
          color: '#9B59B6',
          total_amount: uncategorizedCapital,
          transaction_count: uncategorizedByType.capital.length,
          transactions: uncategorizedByType.capital,
        }],
        display_order: 999, // Show at the end
      });
      totalCapital += uncategorizedCapital;
    }

    // Sort by display order
    income.sort((a, b) => a.display_order - b.display_order);
    expenditure.sort((a, b) => a.display_order - b.display_order);
    capital.sort((a, b) => a.display_order - b.display_order);

    const netOperatingProfit = totalIncome - totalExpenditure;
    
    // For bank reconciliation, we need to handle capital movements correctly:
    // - Start with Net Operating Profit (can be negative = loss)
    // - Add Capital Injections (positive amounts)
    // - Subtract Director Drawings (positive amounts, but they reduce bank balance)
    
    // Separate capital injections from director drawings
    let capitalInjections = 0;
    let directorDrawings = 0;
    
    // Process categorized capital movements
    capital.forEach(hierarchy => {
      hierarchy.categories.forEach(category => {
        category.transactions.forEach(transaction => {
          const amount = transaction.amount;
          // Check if this is a Director Drawings category by name
          if (category.name.toLowerCase().includes('director') || category.name.toLowerCase().includes('drawing')) {
            // Director drawings should be subtracted from bank balance
            directorDrawings += Math.abs(amount);
          } else {
            // Capital injections should be added to bank balance
            capitalInjections += Math.abs(amount);
          }
        });
      });
    });
    
    // Calculate final bank position: Net Operating Profit + Capital Injections - Director Drawings
    const profitAfterCapitalMovements = netOperatingProfit + capitalInjections - directorDrawings;

    return {
      income,
      expenditure,
      capital,
      totals: {
        total_income: totalIncome,
        total_expenditure: totalExpenditure,
        net_operating_profit: netOperatingProfit,
        total_capital_movements: totalCapital,
        profit_after_capital_movements: profitAfterCapitalMovements,
      },
      dateRange: {
        start: startDate,
        end: endDate,
        label: DateUtils.formatDateRange(dateRange.start, dateRange.end),
      },
    };
  }

  // Period Comparison Methods
  async getHierarchicalPLComparison(
    currentConfig: FlexibleReportConfig,
    previousConfig: FlexibleReportConfig
  ): Promise<{
    current: HierarchicalPLData;
    previous: HierarchicalPLData;
    comparison: HierarchyComparisonResult[];
  }> {
    // Fetch both periods in parallel
    const [current, previous] = await Promise.all([
      this.getHierarchicalPLData(currentConfig),
      this.getHierarchicalPLData(previousConfig)
    ]);

    // Calculate comparisons
    const comparison = this.calculateHierarchyComparison(current, previous);

    return { current, previous, comparison };
  }

  // Sprint 3: Transaction Drill-Down Method
  // Added: 2025-01-24
  // Purpose: Fetch transaction details for a specific category or hierarchy
  async getDrillDownData(
    context: import('./reports-types').DrillDownContext,
    filters?: import('./reports-types').DrillDownFilters,
    page: number = 1,
    pageSize: number = 100
  ): Promise<import('./reports-types').DrillDownData> {
    try {
      // Build base query
      let query = this.supabase
        .from('transactions')
        .select(`
          id,
          transaction_date,
          description,
          amount,
          type,
          category_id,
          categories(
            id,
            name
          )
        `, { count: 'exact' })
        .gte('transaction_date', context.dateRange.start.toISOString().split('T')[0])
        .lte('transaction_date', context.dateRange.end.toISOString().split('T')[0]);

      // Filter by category OR hierarchy
      if (context.categoryId) {
        query = query.eq('category_id', context.categoryId);
      } else if (context.hierarchyId) {
        // For hierarchy, we need to get all categories in that hierarchy first
        const { data: categoryAssignments, error: catError } = await this.supabase
          .from('category_hierarchy_assignments')
          .select('category_id')
          .eq('hierarchy_id', context.hierarchyId);

        if (catError) throw catError;

        const categoryIds = categoryAssignments?.map(a => a.category_id) || [];
        if (categoryIds.length > 0) {
          query = query.in('category_id', categoryIds);
        } else {
          // No categories in this hierarchy
          return {
            summary: { total: 0, count: 0, average: 0 },
            transactions: [],
            pagination: { currentPage: page, totalPages: 0, pageSize, totalCount: 0 }
          };
        }
      }

      // Apply additional filters
      if (filters?.searchText) {
        query = query.ilike('description', `%${filters.searchText}%`);
      }
      if (filters?.amountRange?.min !== undefined) {
        query = query.gte('amount', filters.amountRange.min);
      }
      if (filters?.amountRange?.max !== undefined) {
        query = query.lte('amount', filters.amountRange.max);
      }
      if (filters?.dateRange) {
        query = query
          .gte('transaction_date', filters.dateRange.start.toISOString().split('T')[0])
          .lte('transaction_date', filters.dateRange.end.toISOString().split('T')[0]);
      }

      // Order by date (newest first)
      query = query.order('transaction_date', { ascending: false });

      // Pagination
      const start = (page - 1) * pageSize;
      query = query.range(start, start + pageSize - 1);

      // Execute query
      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching drill-down data:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return {
          summary: { total: 0, count: 0, average: 0 },
          transactions: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            pageSize,
            totalCount: count || 0
          }
        };
      }

      // Get hierarchy information for categories
      const categoryIds = [...new Set(data.map(tx => tx.category_id))];
      const hierarchyMap = new Map<string, { id: string; name: string }>();

      if (categoryIds.length > 0) {
        const { data: hierarchyData } = await this.supabase
          .from('category_hierarchy_assignments')
          .select(`
            category_id,
            hierarchy_id,
            category_hierarchies(id, name)
          `)
          .in('category_id', categoryIds);

        if (hierarchyData) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (hierarchyData as any[]).forEach((item: { category_id: string; hierarchy_id: string; category_hierarchies: { id: string; name: string } | null }) => {
            if (item.category_hierarchies) {
              hierarchyMap.set(item.category_id, {
                id: item.category_hierarchies.id,
                name: item.category_hierarchies.name
              });
            }
          });
        }
      }

      // Transform data to TransactionDetail format
      const transactions: import('./reports-types').TransactionDetail[] = data.map(tx => {
        const hierarchy = context.hierarchyName && context.hierarchyId
          ? { id: context.hierarchyId, name: context.hierarchyName }
          : hierarchyMap.get(tx.category_id) || { id: '', name: 'Unknown' };

        // Handle cases where category relationship might be null
        // Supabase returns relations as arrays - take first element
        const rawCategory = tx.categories;
        const category = (Array.isArray(rawCategory) ? rawCategory[0] : rawCategory) || { id: tx.category_id || '', name: 'Uncategorized' };

        return {
          id: tx.id,
          date: tx.transaction_date,
          description: tx.description || '',
          amount: parseFloat(tx.amount),
          category: category.name,
          categoryId: category.id,
          hierarchy: hierarchy.name,
          hierarchyId: hierarchy.id,
          type: tx.type as 'income' | 'expenditure' | 'capital',
        };
      });

      // Calculate summary stats
      const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
      const average = transactions.length > 0 ? total / transactions.length : 0;

      return {
        summary: {
          total,
          count: count || 0,
          average,
        },
        transactions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil((count || 0) / pageSize),
          pageSize,
          totalCount: count || 0,
        },
      };
    } catch (error) {
      console.error('Error in getDrillDownData:', error);
      throw error;
    }
  }

  private calculateHierarchyComparison(
    current: HierarchicalPLData,
    previous: HierarchicalPLData
  ): HierarchyComparisonResult[] {
    const results: HierarchyComparisonResult[] = [];

    // Helper to find matching hierarchy in previous period
    const findPreviousHierarchy = (currentHierarchy: HierarchySection) => {
      return previous.income.find(h => h.id === currentHierarchy.id) ||
             previous.expenditure.find(h => h.id === currentHierarchy.id) ||
             previous.capital.find(h => h.id === currentHierarchy.id);
    };

    // Helper to calculate variance
    const calculateVariance = (currentAmount: number, previousAmount: number) => {
      const variance = currentAmount - previousAmount;
      const variancePercentage = previousAmount !== 0
        ? (variance / Math.abs(previousAmount)) * 100
        : currentAmount !== 0 ? 100 : 0;

      let trend: 'up' | 'down' | 'flat' = 'flat';
      if (Math.abs(variancePercentage) < 0.01) trend = 'flat';
      else if (variance > 0) trend = 'up';
      else trend = 'down';

      return { variance, variancePercentage, trend };
    };

    // Process all hierarchies from current period
    const allHierarchies = [...current.income, ...current.expenditure, ...current.capital];

    allHierarchies.forEach(currentHierarchy => {
      const previousHierarchy = findPreviousHierarchy(currentHierarchy);
      const previousAmount = previousHierarchy?.total_amount || 0;
      const currentAmount = currentHierarchy.total_amount;

      const { variance, variancePercentage, trend } = calculateVariance(currentAmount, previousAmount);

      // Calculate category-level comparisons
      const categoryComparisons: CategoryComparisonResult[] = currentHierarchy.categories.map(currentCategory => {
        const previousCategory = previousHierarchy?.categories.find(c => c.id === currentCategory.id);
        const prevCategoryAmount = previousCategory?.total_amount || 0;
        const currCategoryAmount = currentCategory.total_amount;

        const catVariance = calculateVariance(currCategoryAmount, prevCategoryAmount);

        return {
          name: currentCategory.name,
          categoryId: currentCategory.id,
          type: currentHierarchy.type,
          current: currCategoryAmount,
          previous: prevCategoryAmount,
          variance: catVariance.variance,
          variancePercentage: catVariance.variancePercentage,
          trend: catVariance.trend,
          color: currentCategory.color,
          transactionCount: {
            current: currentCategory.transaction_count,
            previous: previousCategory?.transaction_count || 0
          }
        };
      });

      results.push({
        name: currentHierarchy.name,
        hierarchyId: currentHierarchy.id,
        type: currentHierarchy.type,
        current: currentAmount,
        previous: previousAmount,
        variance,
        variancePercentage,
        trend,
        categories: categoryComparisons
      });
    });

    return results;
  }
}

// Export singleton instance
export const reportDataEngine = new ReportDataEngine();

// Utility functions for date handling
export const DateUtils = {
  getLastMonth: () => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    return { start, end };
  },

  getLastQuarter: () => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 3);
    return { start, end };
  },

  getYearToDate: () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // Financial year runs April 1st to March 31st
    // If we're before April 1st, we're still in the previous financial year
    const financialYearStart = today.getMonth() >= 3 // April is month 3 (0-indexed)
      ? new Date(currentYear, 3, 1) // April 1st of current year
      : new Date(currentYear - 1, 3, 1); // April 1st of previous year
    
    return { start: financialYearStart, end: today };
  },

  getLastYear: () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // Financial year runs April 1st to March 31st
    // Determine the previous financial year
    const lastFinancialYearStart = today.getMonth() >= 3 // April is month 3 (0-indexed)
      ? new Date(currentYear - 1, 3, 1) // April 1st of previous year
      : new Date(currentYear - 2, 3, 1); // April 1st of year before previous
    
    const lastFinancialYearEnd = new Date(lastFinancialYearStart.getFullYear() + 1, 2, 31); // March 31st
    
    return { start: lastFinancialYearStart, end: lastFinancialYearEnd };
  },

  getAllToDate: () => {
    const end = new Date();
    // Set start date to a very early date to capture all transactions
    const start = new Date('2000-01-01');
    return { start, end };
  },

  formatDateRange: (start: Date, end: Date): string => {
    const options: Intl.DateTimeFormatOptions = { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    };
    return `${start.toLocaleDateString('en-GB', options)} - ${end.toLocaleDateString('en-GB', options)}`;
  },
};
