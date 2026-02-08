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
  CategoryInHierarchy,
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
    ? 'bg-orange-50 hover:bg-orange-100 border-2 border-orange-200'
    : type === 'income' ? 'bg-green-50 hover:bg-green-100' :
      type === 'expenditure' ? 'bg-red-50 hover:bg-red-100' :
      'bg-purple-50 hover:bg-purple-100';

  const textColorClass = isUncategorized
    ? 'text-orange-800'
    : type === 'income' ? 'text-green-800' :
      type === 'expenditure' ? 'text-red-800' :
      'text-purple-800';

  const amount = Math.abs(hierarchy.total_amount);
  const isNegative = hierarchy.total_amount < 0;

  const handleHierarchyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.detail === 2) {
      // Double-click opens drill-down
      onHierarchyClick(hierarchy.id, hierarchy.name, type);
    } else if (hasCategories) {
      // Single-click toggles expand
      onToggleExpand(hierarchy.id, !isExpanded);
    }
  };

  return (
    <div className="space-y-1">
      {/* Hierarchy Header */}
      <div
        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${bgColorClass}`}
        onClick={handleHierarchyClick}
        title="Double-click to view transactions"
      >
        <div className="flex items-center space-x-3">
          {hasCategories ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
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
          <span className={`font-bold text-lg ${textColorClass}`}>
            {formatCurrency(amount)}
          </span>
        </div>
      </div>

      {/* Category Details (Collapsible) */}
      {hasCategories && isExpanded && (
        <div className="ml-6 space-y-2 border-l-2 border-gray-200 pl-4">
          {hierarchy.categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between py-2 px-3 bg-white rounded border cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => onCategoryClick(category.id, category.name, hierarchy.name, type)}
              title="Click to view transactions"
            >
              <div className="flex items-center space-x-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: category.color || '#6B7280' }}
                />
                <span className="text-gray-700 font-medium">{category.name}</span>
                <Badge variant="outline" className="text-xs">
                  {category.transaction_count} transactions
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                {category.total_amount < 0 && <Minus className="h-3 w-3 text-red-500" />}
                <span className="font-semibold text-gray-900">
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
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading P&L data...</span>
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <span>Standard Hierarchical P&L</span>
              </CardTitle>
              <CardDescription>
                Professional P&L with collapsible hierarchies • {plData.dateRange.label}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
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
                      } catch (error) {
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
                      } catch (error) {
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
          <div className="space-y-6 font-mono text-sm">
            {/* Income Section */}
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-green-200">
              <h3 className="font-bold text-green-700 text-lg">INCOME</h3>
              <span className="text-xs text-gray-500">
                {plData.income.length} hierarchies
              </span>
            </div>
            <div className="space-y-2">
              {plData.income.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
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
              <div className="border-t-2 border-green-300 pt-3 mt-4">
                <div className="flex items-center justify-between p-3 bg-green-100 rounded-lg">
                  <span className="text-green-800 font-bold text-lg">TOTAL INCOME</span>
                  <span className="text-green-800 font-bold text-xl">
                    {formatCurrency(totals.total_income)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Expenditure Section */}
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-red-200">
              <h3 className="font-bold text-red-700 text-lg">EXPENDITURE</h3>
              <span className="text-xs text-gray-500">
                {plData.expenditure.length} hierarchies
              </span>
            </div>
            <div className="space-y-2">
              {plData.expenditure.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
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
              <div className="border-t-2 border-red-300 pt-3 mt-4">
                <div className="flex items-center justify-between p-3 bg-red-100 rounded-lg">
                  <span className="text-red-800 font-bold text-lg">TOTAL EXPENDITURE</span>
                  <span className="text-red-800 font-bold text-xl">
                    {formatCurrency(totals.total_expenditure)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Operating Profit/Loss */}
          <div className="border-t-4 border-gray-400 pt-4">
            <div className={`flex items-center justify-between p-4 rounded-lg ${
              totals.net_operating_profit >= 0 ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'
            }`}>
              <div className="flex items-center space-x-2">
                <span className={`font-bold text-xl ${
                  totals.net_operating_profit >= 0 ? 'text-green-800' : 'text-red-800'
                }`}>
                  {totals.net_operating_profit >= 0 ? 'NET OPERATING PROFIT' : 'NET OPERATING LOSS'}
                </span>
                {totals.net_operating_profit >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
              </div>
              <span className={`font-bold text-2xl ${
                totals.net_operating_profit >= 0 ? 'text-green-800' : 'text-red-800'
              }`}>
                {formatCurrency(Math.abs(totals.net_operating_profit))}
              </span>
            </div>
          </div>

          {/* Capital Movements Section */}
          {plData.capital.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-purple-200">
                <h3 className="font-bold text-purple-700 text-lg">CAPITAL MOVEMENTS</h3>
                <span className="text-xs text-gray-500">
                  {plData.capital.length} hierarchies
                </span>
              </div>
              <div className="space-y-2">
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
                <div className="border-t-2 border-purple-300 pt-3 mt-4">
                  <div className="flex items-center justify-between p-3 bg-purple-100 rounded-lg">
                    <span className="text-purple-800 font-bold text-lg">TOTAL CAPITAL MOVEMENTS</span>
                    <div className="flex items-center space-x-2">
                      {totals.total_capital_movements < 0 && <Minus className="h-4 w-4 text-red-500" />}
                      <span className="text-purple-800 font-bold text-xl">
                        {formatCurrency(Math.abs(totals.total_capital_movements))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Final Result */}
          <div className="border-t-4 border-gray-600 pt-4">
            <div className={`flex items-center justify-between p-6 rounded-lg border-4 ${
              isProfit ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
            }`}>
              <div className="flex items-center space-x-3">
                <span className={`font-bold text-2xl ${
                  isProfit ? 'text-green-800' : 'text-red-800'
                }`}>
                  NET BANK POSITION
                </span>
                {isProfit ? (
                  <TrendingUp className="h-6 w-6 text-green-600" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-600" />
                )}
              </div>
              <span className={`font-bold text-3xl ${
                isProfit ? 'text-green-800' : 'text-red-800'
              }`}>
                {formatCurrency(Math.abs(totals.profit_after_capital_movements))}
              </span>
            </div>
          </div>

          {/* Summary Info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">📊 Report Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-blue-700">
              <div>
                <span className="font-medium">Period:</span>
                <br />
                {plData.dateRange.label}
              </div>
              <div>
                <span className="font-medium">Total Hierarchies:</span>
                <br />
                {plData.income.length + plData.expenditure.length + plData.capital.length}
              </div>
              <div>
                <span className="font-medium">Operating Margin:</span>
                <br />
                {totals.total_income > 0 
                  ? `${((totals.net_operating_profit / totals.total_income) * 100).toFixed(1)}%`
                  : 'N/A'
                }
              </div>
              <div>
                <span className="font-medium">Final Result:</span>
                <br />
                <span className={isProfit ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>
                  {isProfit ? 'Profit' : 'Loss'}
                </span>
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
