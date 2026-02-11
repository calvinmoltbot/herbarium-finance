'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Expand,
  Minimize,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  Table
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  reportDataEngine,
  HierarchicalPLData,
  HierarchySection,
  FlexibleReportConfig
} from '@/lib/reports-data-engine';
import { CSVExporter } from '@/lib/csv-export';
import { DateRangePicker } from '@/components/reports/date-range-picker';
import { ComparisonSelector } from '@/components/reports/comparison-selector';
import { PeriodComparisonReport } from '@/components/reports/period-comparison-report';
import { TransactionDrillDown } from '@/components/reports/transaction-drill-down';
import { getPresetDateRange, formatDateRange } from '@/lib/date-range-utils';
import type { CustomDateRange, PeriodComparisonConfig, HierarchyComparisonResult } from '@/lib/types';
import type { DrillDownContext } from '@/lib/reports-types';
import { toast } from 'sonner';

interface HierarchicalPLReportProps {
  className?: string;
}

interface HierarchyItemProps {
  hierarchy: HierarchySection;
  isExpanded: boolean;
  onToggleExpand: (hierarchyId: string, expanded: boolean) => void;
  onHierarchyClick: (hierarchyId: string, hierarchyName: string, type: 'income' | 'expenditure' | 'capital') => void;
  onCategoryClick: (categoryId: string, categoryName: string, hierarchyName: string, type: 'income' | 'expenditure' | 'capital') => void;
  type: 'income' | 'expenditure' | 'capital';
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  }).format(amount);
}

function HierarchyItem({ hierarchy, isExpanded, onToggleExpand, onHierarchyClick, onCategoryClick, type }: HierarchyItemProps) {
  const hasCategories = hierarchy.categories && hierarchy.categories.length > 0;
  const isUncategorized = hierarchy.id.startsWith('uncategorized-');

  const bgColorClass = isUncategorized
    ? 'bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-950/60 border-2 border-orange-200 dark:border-orange-800'
    : type === 'income'
      ? 'bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50'
      : type === 'expenditure'
        ? 'bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-800/50'
        : 'bg-violet-50 dark:bg-violet-950/30 hover:bg-violet-100 dark:hover:bg-violet-950/50 border border-violet-200 dark:border-violet-800/50';

  const textColorClass = isUncategorized
    ? 'text-orange-800 dark:text-orange-300'
    : type === 'income'
      ? 'text-emerald-800 dark:text-emerald-300'
      : type === 'expenditure'
        ? 'text-rose-800 dark:text-rose-300'
        : 'text-violet-800 dark:text-violet-300';

  const borderLeftClass = type === 'income'
    ? 'border-l-emerald-400 dark:border-l-emerald-600'
    : type === 'expenditure'
      ? 'border-l-rose-400 dark:border-l-rose-600'
      : 'border-l-violet-400 dark:border-l-violet-600';

  const amount = Math.abs(hierarchy.total_amount);
  const isNegative = hierarchy.total_amount < 0;

  const handleHierarchyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.detail === 2) {
      onHierarchyClick(hierarchy.id, hierarchy.name, type);
    } else if (hasCategories) {
      onToggleExpand(hierarchy.id, !isExpanded);
    }
  };

  return (
    <div className="space-y-1">
      {/* Hierarchy Header */}
      <div
        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors border-l-4 ${borderLeftClass} ${bgColorClass}`}
        onClick={handleHierarchyClick}
        title="Double-click to view transactions"
      >
        <div className="flex items-center space-x-3">
          {hasCategories ? (
            isExpanded ? (
              <ChevronDown className={`h-4 w-4 ${textColorClass} opacity-60`} />
            ) : (
              <ChevronRight className={`h-4 w-4 ${textColorClass} opacity-60`} />
            )
          ) : (
            <div className="w-4 h-4" />
          )}
          <span className={`font-semibold ${textColorClass}`}>
            {hierarchy.name}
          </span>
          {hasCategories && (
            <Badge variant="secondary" className="text-xs">
              {hierarchy.categories.length} categories
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {isNegative && <Minus className="h-4 w-4 text-red-500" />}
          <span className={`font-bold text-lg tabular-nums ${textColorClass}`}>
            {formatCurrency(amount)}
          </span>
        </div>
      </div>

      {/* Category Details (Collapsible) */}
      {hasCategories && isExpanded && (
        <div className={`ml-6 space-y-1.5 border-l-2 pl-4 ${
          type === 'income' ? 'border-emerald-200 dark:border-emerald-800' :
          type === 'expenditure' ? 'border-rose-200 dark:border-rose-800' :
          'border-violet-200 dark:border-violet-800'
        }`}>
          {hierarchy.categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between py-2 px-3 bg-card rounded border border-border cursor-pointer hover:bg-muted transition-colors"
              onClick={() => onCategoryClick(category.id, category.name, hierarchy.name, type)}
              title="Click to view transactions"
            >
              <div className="flex items-center space-x-3">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: category.color || '#6B7280' }}
                />
                <span className="text-foreground font-medium">{category.name}</span>
                <Badge variant="outline" className="text-xs">
                  {category.transaction_count} txns
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                {category.total_amount < 0 && <Minus className="h-3 w-3 text-red-500" />}
                <span className="font-semibold text-foreground tabular-nums">
                  {formatCurrency(Math.abs(category.total_amount))}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function HierarchicalPLReport({ className }: HierarchicalPLReportProps) {
  // Initialize with "Last Month" preset
  const [dateRange, setDateRange] = useState<CustomDateRange>(() =>
    getPresetDateRange('last_month')
  );
  const [plData, setPLData] = useState<HierarchicalPLData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedHierarchies, setExpandedHierarchies] = useState<Record<string, boolean>>({});

  // Comparison state
  const [comparisonConfig, setComparisonConfig] = useState<PeriodComparisonConfig | null>(null);
  const [comparisonData, setComparisonData] = useState<HierarchyComparisonResult[] | null>(null);

  // Drill-down state
  const [drillDownContext, setDrillDownContext] = useState<DrillDownContext | null>(null);

  const loadPLData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const config: FlexibleReportConfig = {
        name: 'Hierarchical P&L Report',
        dateRange: {
          start: dateRange.start,
          end: dateRange.end,
          period: 'monthly',
        },
        groupBy: 'hierarchy',
        includeTypes: ['income', 'expenditure', 'capital'],
        visualizations: ['table'],
      };

      // Load standard P&L data
      const data = await reportDataEngine.getHierarchicalPLData(config);
      setPLData(data);

      // Load comparison data if comparison is enabled
      if (comparisonConfig) {
        const previousConfig: FlexibleReportConfig = {
          name: 'Comparison Period',
          dateRange: {
            start: comparisonConfig.comparisonPeriod.start,
            end: comparisonConfig.comparisonPeriod.end,
            period: 'monthly',
          },
          groupBy: 'hierarchy',
          includeTypes: ['income', 'expenditure', 'capital'],
          visualizations: ['table'],
        };

        const comparisonResult = await reportDataEngine.getHierarchicalPLComparison(
          config,
          previousConfig
        );
        setComparisonData(comparisonResult.comparison);
      } else {
        setComparisonData(null);
      }
    } catch (err) {
      console.error('Error loading P&L data:', err);
      setError('Failed to load P&L data. Please try again.');
      toast.error('Failed to load P&L data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPLData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.start, dateRange.end, comparisonConfig]);

  const handleToggleExpand = (hierarchyId: string, expanded: boolean) => {
    setExpandedHierarchies(prev => ({
      ...prev,
      [hierarchyId]: expanded
    }));
  };

  const handleExpandAll = () => {
    if (!plData) return;
    const newState: Record<string, boolean> = {};
    [...plData.income, ...plData.expenditure, ...plData.capital].forEach(hierarchy => {
      newState[hierarchy.id] = true;
    });
    setExpandedHierarchies(newState);
  };

  const handleCollapseAll = () => {
    setExpandedHierarchies({});
  };

  const handleHierarchyClick = (hierarchyId: string, hierarchyName: string, type: 'income' | 'expenditure' | 'capital') => {
    setDrillDownContext({
      hierarchyId,
      hierarchyName,
      dateRange: {
        start: dateRange.start,
        end: dateRange.end,
      },
      type,
    });
  };

  const handleCategoryClick = (categoryId: string, categoryName: string, hierarchyName: string, type: 'income' | 'expenditure' | 'capital') => {
    setDrillDownContext({
      categoryId,
      categoryName,
      hierarchyName,
      dateRange: {
        start: dateRange.start,
        end: dateRange.end,
      },
      type,
    });
  };

  const handleCloseDrillDown = () => {
    setDrillDownContext(null);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Standard Hierarchical P&L</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading P&L data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-600">
            <TrendingDown className="h-5 w-5" />
            <span>Error Loading P&L</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadPLData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!plData) {
    return null;
  }

  const { totals } = plData;
  const isProfit = totals.profit_after_capital_movements >= 0;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <span>Standard Hierarchical P&L</span>
              </CardTitle>
              <CardDescription>
                Professional P&L with collapsible hierarchies • {plData.dateRange.label}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                className="w-64"
              />
              <Button variant="outline" size="sm" onClick={handleExpandAll}>
                <Expand className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleCollapseAll}>
                <Minimize className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      try {
                        CSVExporter.exportPLSummary(plData, plData.dateRange.label);
                        toast.success('P&L Summary exported successfully');
                      } catch {
                        toast.error('Failed to export P&L Summary');
                      }
                    }}
                  >
                    <Table className="h-4 w-4 mr-2" />
                    Export Summary CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      try {
                        CSVExporter.exportPLDetailed(plData, plData.dateRange.label);
                        toast.success('P&L Detailed export completed successfully');
                      } catch {
                        toast.error('Failed to export detailed P&L');
                      }
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Export Detailed CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Period Comparison Selector */}
          <ComparisonSelector
            currentPeriod={dateRange}
            comparisonConfig={comparisonConfig}
            onChange={setComparisonConfig}
          />
        </div>
      </CardHeader>
      <CardContent>
        {/* Show Comparison Report if comparison is enabled and data is loaded */}
        {comparisonConfig && comparisonData ? (
          <PeriodComparisonReport
            comparisonData={comparisonData}
            currentLabel={dateRange.label || formatDateRange(dateRange.start, dateRange.end)}
            previousLabel={comparisonConfig.comparisonPeriod.label || formatDateRange(comparisonConfig.comparisonPeriod.start, comparisonConfig.comparisonPeriod.end)}
          />
        ) : (
          <div className="space-y-8 font-mono text-sm">
            {/* ═══════════════ INCOME SECTION ═══════════════ */}
            <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800/60 overflow-hidden">
              {/* Income Section Header */}
              <div className="flex items-center justify-between px-5 py-3 bg-emerald-600 dark:bg-emerald-800">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="h-5 w-5 text-white" />
                  <h3 className="font-bold text-white text-lg tracking-wide">INCOME</h3>
                </div>
                <span className="text-xs text-emerald-100">
                  {plData.income.length} {plData.income.length === 1 ? 'hierarchy' : 'hierarchies'}
                </span>
              </div>
              {/* Income Body */}
              <div className="p-4 space-y-2 bg-emerald-50/50 dark:bg-emerald-950/20">
                {plData.income.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    No income hierarchies for this period
                  </div>
                ) : (
                  plData.income.map((hierarchy) => (
                    <HierarchyItem
                      key={hierarchy.id}
                      hierarchy={hierarchy}
                      isExpanded={expandedHierarchies[hierarchy.id] || false}
                      onToggleExpand={handleToggleExpand}
                      onHierarchyClick={handleHierarchyClick}
                      onCategoryClick={handleCategoryClick}
                      type="income"
                    />
                  ))
                )}
              </div>
              {/* Income Total */}
              <div className="flex items-center justify-between px-5 py-3 bg-emerald-100 dark:bg-emerald-900/50 border-t-2 border-emerald-300 dark:border-emerald-700">
                <span className="text-emerald-800 dark:text-emerald-200 font-bold text-lg">TOTAL INCOME</span>
                <span className="text-emerald-800 dark:text-emerald-200 font-bold text-xl tabular-nums">
                  {formatCurrency(totals.total_income)}
                </span>
              </div>
            </div>

            {/* ═══════════════ EXPENDITURE SECTION ═══════════════ */}
            <div className="rounded-xl border-2 border-rose-200 dark:border-rose-800/60 overflow-hidden">
              {/* Expenditure Section Header */}
              <div className="flex items-center justify-between px-5 py-3 bg-rose-600 dark:bg-rose-800">
                <div className="flex items-center space-x-3">
                  <TrendingDown className="h-5 w-5 text-white" />
                  <h3 className="font-bold text-white text-lg tracking-wide">EXPENDITURE</h3>
                </div>
                <span className="text-xs text-rose-100">
                  {plData.expenditure.length} {plData.expenditure.length === 1 ? 'hierarchy' : 'hierarchies'}
                </span>
              </div>
              {/* Expenditure Body */}
              <div className="p-4 space-y-2 bg-rose-50/50 dark:bg-rose-950/20">
                {plData.expenditure.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    No expenditure hierarchies for this period
                  </div>
                ) : (
                  plData.expenditure.map((hierarchy) => (
                    <HierarchyItem
                      key={hierarchy.id}
                      hierarchy={hierarchy}
                      isExpanded={expandedHierarchies[hierarchy.id] || false}
                      onToggleExpand={handleToggleExpand}
                      onHierarchyClick={handleHierarchyClick}
                      onCategoryClick={handleCategoryClick}
                      type="expenditure"
                    />
                  ))
                )}
              </div>
              {/* Expenditure Total */}
              <div className="flex items-center justify-between px-5 py-3 bg-rose-100 dark:bg-rose-900/50 border-t-2 border-rose-300 dark:border-rose-700">
                <span className="text-rose-800 dark:text-rose-200 font-bold text-lg">TOTAL EXPENDITURE</span>
                <span className="text-rose-800 dark:text-rose-200 font-bold text-xl tabular-nums">
                  {formatCurrency(totals.total_expenditure)}
                </span>
              </div>
            </div>

            {/* ═══════════════ NET OPERATING PROFIT/LOSS ═══════════════ */}
            <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-5 rounded-xl border-2 ${
              totals.net_operating_profit >= 0
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700'
            }`}>
              <div className="flex items-center space-x-3">
                {totals.net_operating_profit >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                )}
                <span className={`font-bold text-lg sm:text-xl ${
                  totals.net_operating_profit >= 0
                    ? 'text-emerald-800 dark:text-emerald-200'
                    : 'text-rose-800 dark:text-rose-200'
                }`}>
                  {totals.net_operating_profit >= 0 ? 'NET OPERATING PROFIT' : 'NET OPERATING LOSS'}
                </span>
              </div>
              <span className={`font-bold text-xl sm:text-2xl tabular-nums ${
                totals.net_operating_profit >= 0
                  ? 'text-emerald-800 dark:text-emerald-200'
                  : 'text-rose-800 dark:text-rose-200'
              }`}>
                {formatCurrency(Math.abs(totals.net_operating_profit))}
              </span>
            </div>

            {/* ═══════════════ CAPITAL MOVEMENTS SECTION ═══════════════ */}
            {plData.capital.length > 0 && (
              <div className="rounded-xl border-2 border-violet-200 dark:border-violet-800/60 overflow-hidden">
                {/* Capital Section Header */}
                <div className="flex items-center justify-between px-5 py-3 bg-violet-600 dark:bg-violet-800">
                  <div className="flex items-center space-x-3">
                    <Minus className="h-5 w-5 text-white" />
                    <h3 className="font-bold text-white text-lg tracking-wide">CAPITAL MOVEMENTS</h3>
                  </div>
                  <span className="text-xs text-violet-100">
                    {plData.capital.length} {plData.capital.length === 1 ? 'hierarchy' : 'hierarchies'}
                  </span>
                </div>
                {/* Capital Body */}
                <div className="p-4 space-y-2 bg-violet-50/50 dark:bg-violet-950/20">
                  {plData.capital.map((hierarchy) => (
                    <HierarchyItem
                      key={hierarchy.id}
                      hierarchy={hierarchy}
                      isExpanded={expandedHierarchies[hierarchy.id] || false}
                      onToggleExpand={handleToggleExpand}
                      onHierarchyClick={handleHierarchyClick}
                      onCategoryClick={handleCategoryClick}
                      type="capital"
                    />
                  ))}
                </div>
                {/* Capital Total */}
                <div className="flex items-center justify-between px-5 py-3 bg-violet-100 dark:bg-violet-900/50 border-t-2 border-violet-300 dark:border-violet-700">
                  <span className="text-violet-800 dark:text-violet-200 font-bold text-lg">TOTAL CAPITAL MOVEMENTS</span>
                  <div className="flex items-center space-x-2">
                    {totals.total_capital_movements < 0 && <Minus className="h-4 w-4 text-red-500" />}
                    <span className="text-violet-800 dark:text-violet-200 font-bold text-xl tabular-nums">
                      {formatCurrency(Math.abs(totals.total_capital_movements))}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════ NET BANK POSITION ═══════════════ */}
            <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-6 rounded-xl border-4 ${
              isProfit
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 dark:border-emerald-600'
                : 'bg-rose-50 dark:bg-rose-950/50 border-rose-400 dark:border-rose-600'
            }`}>
              <div className="flex items-center space-x-3">
                {isProfit ? (
                  <TrendingUp className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <TrendingDown className="h-7 w-7 text-rose-600 dark:text-rose-400" />
                )}
                <span className={`font-bold text-xl sm:text-2xl ${
                  isProfit ? 'text-emerald-800 dark:text-emerald-200' : 'text-rose-800 dark:text-rose-200'
                }`}>
                  NET BANK POSITION
                </span>
              </div>
              <span className={`font-bold text-2xl sm:text-3xl tabular-nums ${
                isProfit ? 'text-emerald-800 dark:text-emerald-200' : 'text-rose-800 dark:text-rose-200'
              }`}>
                {formatCurrency(Math.abs(totals.profit_after_capital_movements))}
              </span>
            </div>

            {/* ═══════════════ REPORT SUMMARY ═══════════════ */}
            <div className="p-4 bg-muted/50 dark:bg-muted/20 rounded-xl border border-border">
              <h4 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wider">Report Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">Period</span>
                  <p className="text-foreground mt-0.5">{plData.dateRange.label}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Hierarchies</span>
                  <p className="text-foreground mt-0.5">{plData.income.length + plData.expenditure.length + plData.capital.length}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Operating Margin</span>
                  <p className="text-foreground mt-0.5">
                    {totals.total_income > 0
                      ? `${((totals.net_operating_profit / totals.total_income) * 100).toFixed(1)}%`
                      : 'N/A'
                    }
                  </p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Result</span>
                  <p className={`mt-0.5 font-semibold ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {isProfit ? 'Profit' : 'Loss'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Transaction Drill-Down */}
      <TransactionDrillDown
        context={drillDownContext}
        onClose={handleCloseDrillDown}
      />
    </Card>
  );
}
