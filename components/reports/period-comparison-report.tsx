'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Equal,
  GitCompare
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { HierarchyComparisonResult } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PeriodComparisonReportProps {
  comparisonData: HierarchyComparisonResult[];
  currentLabel: string;
  previousLabel: string;
  className?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatPercentage(percentage: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(percentage / 100);
}

interface VarianceIndicatorProps {
  trend: 'up' | 'down' | 'flat';
  variance: number;
  variancePercentage: number;
  type: 'income' | 'expenditure' | 'capital';
}

function VarianceIndicator({ trend, variance, variancePercentage, type }: VarianceIndicatorProps) {
  // For income: up is good (green), down is bad (red)
  // For expenditure: up is bad (red), down is good (green)
  const isPositiveChange = type === 'income' ? trend === 'up' : trend === 'down';
  const isNegativeChange = type === 'income' ? trend === 'down' : trend === 'up';

  const colorClass = trend === 'flat' ? 'text-gray-500' :
    isPositiveChange ? 'text-green-600' :
    isNegativeChange ? 'text-red-600' : 'text-gray-500';

  const bgColorClass = trend === 'flat' ? 'bg-gray-50' :
    isPositiveChange ? 'bg-green-50' :
    isNegativeChange ? 'bg-red-50' : 'bg-gray-50';

  const Icon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Equal;

  return (
    <div className={cn('flex items-center gap-2 px-2 py-1 rounded-md', bgColorClass)}>
      <Icon className={cn('h-4 w-4', colorClass)} />
      <div className={cn('font-semibold', colorClass)}>
        {formatCurrency(Math.abs(variance))}
      </div>
      <div className={cn('text-sm', colorClass)}>
        ({formatPercentage(variancePercentage)})
      </div>
    </div>
  );
}

interface ComparisonRowProps {
  name: string;
  type: 'income' | 'expenditure' | 'capital';
  current: number;
  previous: number;
  variance: number;
  variancePercentage: number;
  trend: 'up' | 'down' | 'flat';
  isCategory?: boolean;
  color?: string;
  isExpanded?: boolean;
  onToggle?: () => void;
  hasChildren?: boolean;
}

function ComparisonRow({
  name,
  type,
  current,
  previous,
  variance,
  variancePercentage,
  trend,
  isCategory = false,
  color,
  isExpanded,
  onToggle,
  hasChildren = false
}: ComparisonRowProps) {
  const bgColor = !isCategory
    ? type === 'income' ? 'bg-green-50/50 hover:bg-green-100/50' :
      type === 'expenditure' ? 'bg-red-50/50 hover:bg-red-100/50' :
      'bg-purple-50/50 hover:bg-purple-100/50'
    : 'bg-white hover:bg-gray-50';

  const textColor = !isCategory
    ? type === 'income' ? 'text-green-900' :
      type === 'expenditure' ? 'text-red-900' :
      'text-purple-900'
    : 'text-gray-900';

  return (
    <div
      className={cn(
        'grid grid-cols-6 gap-4 p-3 rounded-lg transition-colors border',
        bgColor,
        isCategory && 'ml-6',
        !isCategory && 'font-semibold',
        hasChildren && 'cursor-pointer'
      )}
      onClick={hasChildren ? onToggle : undefined}
    >
      <div className={cn('col-span-2 flex items-center gap-2', textColor)}>
        {hasChildren && (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )
        )}
        {isCategory && color && (
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
        <span>{name}</span>
      </div>

      <div className="text-right">
        {formatCurrency(Math.abs(current))}
      </div>

      <div className="text-right text-gray-600">
        {formatCurrency(Math.abs(previous))}
      </div>

      <div className="col-span-2 flex justify-end">
        <VarianceIndicator
          trend={trend}
          variance={variance}
          variancePercentage={variancePercentage}
          type={type}
        />
      </div>
    </div>
  );
}

export function PeriodComparisonReport({
  comparisonData,
  currentLabel,
  previousLabel,
  className
}: PeriodComparisonReportProps) {
  const [expandedHierarchies, setExpandedHierarchies] = useState<Set<string>>(new Set());

  const toggleHierarchy = (hierarchyId: string) => {
    setExpandedHierarchies(prev => {
      const next = new Set(prev);
      if (next.has(hierarchyId)) {
        next.delete(hierarchyId);
      } else {
        next.add(hierarchyId);
      }
      return next;
    });
  };

  // Group by type
  const incomeData = comparisonData.filter(h => h.type === 'income');
  const expenditureData = comparisonData.filter(h => h.type === 'expenditure');
  const capitalData = comparisonData.filter(h => h.type === 'capital');

  // Calculate totals
  const totalIncomeCurrent = incomeData.reduce((sum, h) => sum + h.current, 0);
  const totalIncomePrevious = incomeData.reduce((sum, h) => sum + h.previous, 0);
  const incomeVariance = totalIncomeCurrent - totalIncomePrevious;
  const incomeVariancePercentage = totalIncomePrevious !== 0
    ? (incomeVariance / Math.abs(totalIncomePrevious)) * 100
    : 0;

  const totalExpenditureCurrent = expenditureData.reduce((sum, h) => sum + Math.abs(h.current), 0);
  const totalExpenditurePrevious = expenditureData.reduce((sum, h) => sum + Math.abs(h.previous), 0);
  const expenditureVariance = totalExpenditureCurrent - totalExpenditurePrevious;
  const expenditureVariancePercentage = totalExpenditurePrevious !== 0
    ? (expenditureVariance / Math.abs(totalExpenditurePrevious)) * 100
    : 0;

  const netProfitCurrent = totalIncomeCurrent - totalExpenditureCurrent;
  const netProfitPrevious = totalIncomePrevious - totalExpenditurePrevious;
  const netProfitVariance = netProfitCurrent - netProfitPrevious;
  const netProfitVariancePercentage = netProfitPrevious !== 0
    ? (netProfitVariance / Math.abs(netProfitPrevious)) * 100
    : 0;

  const renderHierarchy = (hierarchy: HierarchyComparisonResult) => {
    const isExpanded = expandedHierarchies.has(hierarchy.hierarchyId || '');
    const hasCategories = hierarchy.categories && hierarchy.categories.length > 0;

    return (
      <div key={hierarchy.hierarchyId} className="space-y-1">
        <ComparisonRow
          name={hierarchy.name}
          type={hierarchy.type}
          current={hierarchy.current}
          previous={hierarchy.previous}
          variance={hierarchy.variance}
          variancePercentage={hierarchy.variancePercentage}
          trend={hierarchy.trend}
          isExpanded={isExpanded}
          onToggle={() => toggleHierarchy(hierarchy.hierarchyId || '')}
          hasChildren={hasCategories}
        />

        {isExpanded && hasCategories && (
          <div className="space-y-1">
            {hierarchy.categories.map((category) => (
              <ComparisonRow
                key={category.categoryId}
                name={category.name}
                type={category.type}
                current={category.current}
                previous={category.previous}
                variance={category.variance}
                variancePercentage={category.variancePercentage}
                trend={category.trend}
                isCategory
                color={category.color}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className={cn('p-6', className)}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <GitCompare className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Period Comparison Analysis</h3>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full" />
            <span>Current: {currentLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-400 rounded-full" />
            <span>Previous: {previousLabel}</span>
          </div>
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-6 gap-4 p-3 mb-2 bg-gray-50 rounded-lg text-sm font-semibold text-gray-700">
        <div className="col-span-2">Category / Hierarchy</div>
        <div className="text-right">Current Period</div>
        <div className="text-right">Previous Period</div>
        <div className="col-span-2 text-right">Variance</div>
      </div>

      {/* Income Section */}
      {incomeData.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-green-800 mb-2 uppercase tracking-wide">
            Income
          </h4>
          <div className="space-y-1">
            {incomeData.map(renderHierarchy)}
          </div>
        </div>
      )}

      {/* Expenditure Section */}
      {expenditureData.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-red-800 mb-2 uppercase tracking-wide">
            Expenditure
          </h4>
          <div className="space-y-1">
            {expenditureData.map(renderHierarchy)}
          </div>
        </div>
      )}

      {/* Capital Section */}
      {capitalData.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-purple-800 mb-2 uppercase tracking-wide">
            Capital Movements
          </h4>
          <div className="space-y-1">
            {capitalData.map(renderHierarchy)}
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="border-t-2 pt-4 mt-6 space-y-3">
        <ComparisonRow
          name="Total Income"
          type="income"
          current={totalIncomeCurrent}
          previous={totalIncomePrevious}
          variance={incomeVariance}
          variancePercentage={incomeVariancePercentage}
          trend={incomeVariance > 0 ? 'up' : incomeVariance < 0 ? 'down' : 'flat'}
        />

        <ComparisonRow
          name="Total Expenditure"
          type="expenditure"
          current={totalExpenditureCurrent}
          previous={totalExpenditurePrevious}
          variance={expenditureVariance}
          variancePercentage={expenditureVariancePercentage}
          trend={expenditureVariance > 0 ? 'up' : expenditureVariance < 0 ? 'down' : 'flat'}
        />

        <div className="border-t-2 pt-3">
          <ComparisonRow
            name="Net Operating Profit"
            type="income"
            current={netProfitCurrent}
            previous={netProfitPrevious}
            variance={netProfitVariance}
            variancePercentage={netProfitVariancePercentage}
            trend={netProfitVariance > 0 ? 'up' : netProfitVariance < 0 ? 'down' : 'flat'}
          />
        </div>
      </div>
    </Card>
  );
}
