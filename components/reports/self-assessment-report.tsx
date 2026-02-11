'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
  Printer,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Calculator,
  PoundSterling,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  reportDataEngine,
  FlexibleReportConfig,
  HierarchicalPLData,
  HierarchySection,
  CategoryInHierarchy,
} from '@/lib/reports-data-engine';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SelfAssessmentReportProps {
  className?: string;
}

interface TaxYear {
  label: string; // e.g. "2024-25"
  start: Date;   // 6 April of start year
  end: Date;     // 5 April of end year
}

// ---------------------------------------------------------------------------
// Tax year helpers
// ---------------------------------------------------------------------------

function buildTaxYear(startYear: number): TaxYear {
  return {
    label: `${startYear}-${String(startYear + 1).slice(2)}`,
    start: new Date(startYear, 3, 6),  // 6 April
    end: new Date(startYear + 1, 3, 5), // 5 April
  };
}

function getCurrentTaxYear(): TaxYear {
  const today = new Date();
  // If before 6 April we are still in the previous tax year
  const startYear =
    today.getMonth() > 3 || (today.getMonth() === 3 && today.getDate() >= 6)
      ? today.getFullYear()
      : today.getFullYear() - 1;
  return buildTaxYear(startYear);
}

function getAvailableTaxYears(): TaxYear[] {
  const current = getCurrentTaxYear();
  const startYear = parseInt(current.label.split('-')[0], 10);
  const years: TaxYear[] = [];
  // Current year + 4 previous years
  for (let i = 0; i < 5; i++) {
    years.push(buildTaxYear(startYear - i));
  }
  return years;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// UK Tax calculation (2024-25 rates, hardcoded)
// ---------------------------------------------------------------------------

interface TaxEstimate {
  personalAllowance: number;
  basicRate: number;
  higherRate: number;
  additionalRate: number;
  totalIncomeTax: number;
  class4Nics: number;
  class2Nics: number;
  totalTax: number;
}

function calculateTaxEstimate(netProfit: number): TaxEstimate {
  const profit = Math.max(0, netProfit);

  // Personal allowance tapering: reduced by 1 for every 2 above 100,000
  let personalAllowance = 12570;
  if (profit > 100000) {
    personalAllowance = Math.max(0, 12570 - Math.floor((profit - 100000) / 2));
  }

  // Income tax
  let basicRate = 0;
  let higherRate = 0;
  let additionalRate = 0;

  const taxable = Math.max(0, profit - personalAllowance);

  if (taxable > 0) {
    const basicBand = Math.min(taxable, 50270 - personalAllowance);
    basicRate = Math.max(0, basicBand) * 0.2;

    const higherBand = Math.min(
      Math.max(0, taxable - (50270 - personalAllowance)),
      125140 - 50270
    );
    higherRate = higherBand * 0.4;

    const additionalBand = Math.max(0, taxable - (125140 - personalAllowance));
    additionalRate = additionalBand * 0.45;
  }

  const totalIncomeTax = basicRate + higherRate + additionalRate;

  // Class 4 NICs
  let class4Nics = 0;
  if (profit > 12570) {
    const lowerBand = Math.min(profit, 50270) - 12570;
    class4Nics += lowerBand * 0.09;
    if (profit > 50270) {
      class4Nics += (profit - 50270) * 0.02;
    }
  }

  // Class 2 NICs — 3.45/week if profits above threshold, ~179.40/year
  const class2Nics = profit > 12570 ? 179.40 : 0;

  return {
    personalAllowance,
    basicRate,
    higherRate,
    additionalRate,
    totalIncomeTax,
    class4Nics,
    class2Nics,
    totalTax: totalIncomeTax + class4Nics + class2Nics,
  };
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function SelfAssessmentSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-64 bg-muted rounded animate-pulse" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-8 w-32 bg-muted rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-5 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-72 bg-muted rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="h-10 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible section row
// ---------------------------------------------------------------------------

function HierarchySectionRow({
  section,
  colorClass,
}: {
  section: HierarchySection;
  colorClass: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="py-2 px-4 font-medium text-foreground flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
          {section.name}
        </td>
        <td className="py-2 px-4 text-right tabular-nums text-muted-foreground">
          {section.categories.reduce((s, c) => s + c.transaction_count, 0)}
        </td>
        <td className={`py-2 px-4 text-right font-semibold tabular-nums ${colorClass}`}>
          {formatCurrency(Math.abs(section.total_amount))}
        </td>
      </tr>
      {expanded &&
        section.categories.map((cat) => (
          <CategoryRow key={cat.id} category={cat} colorClass={colorClass} />
        ))}
    </>
  );
}

function CategoryRow({
  category,
  colorClass,
}: {
  category: CategoryInHierarchy;
  colorClass: string;
}) {
  return (
    <tr className="bg-muted/30">
      <td className="py-1.5 px-4 pl-12 text-sm text-muted-foreground">
        {category.name}
      </td>
      <td className="py-1.5 px-4 text-right tabular-nums text-sm text-muted-foreground">
        {category.transaction_count}
      </td>
      <td className={`py-1.5 px-4 text-right tabular-nums text-sm ${colorClass}`}>
        {formatCurrency(Math.abs(category.total_amount))}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SelfAssessmentReport({ className }: SelfAssessmentReportProps) {
  const taxYears = useMemo(() => getAvailableTaxYears(), []);
  const [selectedYear, setSelectedYear] = useState<string>(taxYears[0].label);
  const [data, setData] = useState<HierarchicalPLData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeTaxYear = useMemo(
    () => taxYears.find((y) => y.label === selectedYear) || taxYears[0],
    [selectedYear, taxYears],
  );

  // ------ Fetch data -------------------------------------------------------

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const config: FlexibleReportConfig = {
        name: 'Self Assessment Tax Summary',
        dateRange: {
          start: activeTaxYear.start,
          end: activeTaxYear.end,
          period: 'annual',
        },
        groupBy: 'hierarchy',
        includeTypes: ['income', 'expenditure', 'capital'],
        visualizations: ['table'],
      };

      const plData = await reportDataEngine.getHierarchicalPLData(config);
      setData(plData);
    } catch (err) {
      console.error('Error fetching self-assessment data:', err);
      setError('Failed to load self-assessment data. Please try again.');
      toast.error('Failed to load self-assessment data');
    } finally {
      setIsLoading(false);
    }
  }, [activeTaxYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ------ Derived values ---------------------------------------------------

  const taxEstimate = useMemo(() => {
    if (!data) return null;
    return calculateTaxEstimate(data.totals.net_operating_profit);
  }, [data]);

  // Capital breakdown
  const capitalBreakdown = useMemo(() => {
    if (!data) return { injections: 0, drawings: 0 };

    let injections = 0;
    let drawings = 0;

    data.capital.forEach((hierarchy) => {
      hierarchy.categories.forEach((cat) => {
        if (cat.capital_movement_type === 'drawing') {
          drawings += Math.abs(cat.total_amount);
        } else {
          injections += Math.abs(cat.total_amount);
        }
      });
    });

    return { injections, drawings };
  }, [data]);

  // ------ CSV export -------------------------------------------------------

  const handleExport = useCallback(() => {
    if (!data) {
      toast.error('No data to export');
      return;
    }

    const rows: string[] = [];
    rows.push(`Self Assessment Tax Summary - Tax Year ${activeTaxYear.label}`);
    rows.push(`Period: ${formatDate(activeTaxYear.start)} to ${formatDate(activeTaxYear.end)}`);
    rows.push('');

    // Income
    rows.push('INCOME (SA103 Trading Income)');
    rows.push('Hierarchy,Category,Transactions,Amount');
    data.income.forEach((h) => {
      h.categories.forEach((c) => {
        rows.push(
          `"${h.name}","${c.name}",${c.transaction_count},${Math.abs(c.total_amount).toFixed(2)}`,
        );
      });
    });
    rows.push(`,,Total Income,${data.totals.total_income.toFixed(2)}`);
    rows.push('');

    // Expenses
    rows.push('ALLOWABLE EXPENSES (SA103 Expenses)');
    rows.push('Hierarchy,Category,Transactions,Amount');
    data.expenditure.forEach((h) => {
      h.categories.forEach((c) => {
        rows.push(
          `"${h.name}","${c.name}",${c.transaction_count},${Math.abs(c.total_amount).toFixed(2)}`,
        );
      });
    });
    rows.push(`,,Total Expenses,${data.totals.total_expenditure.toFixed(2)}`);
    rows.push('');

    // Net Profit
    rows.push(`Net Profit/Loss,,,"${data.totals.net_operating_profit.toFixed(2)}"`);
    rows.push('');

    // Capital
    rows.push('CAPITAL MOVEMENTS');
    rows.push('Type,Amount');
    rows.push(`Injections,${capitalBreakdown.injections.toFixed(2)}`);
    rows.push(`Drawings,${capitalBreakdown.drawings.toFixed(2)}`);
    rows.push('');

    // Tax estimate
    if (taxEstimate) {
      rows.push('TAX ESTIMATE (informational only - 2024-25 rates)');
      rows.push('Item,Amount');
      rows.push(`Personal Allowance,${taxEstimate.personalAllowance.toFixed(2)}`);
      rows.push(`Income Tax (Basic Rate 20%),${taxEstimate.basicRate.toFixed(2)}`);
      rows.push(`Income Tax (Higher Rate 40%),${taxEstimate.higherRate.toFixed(2)}`);
      rows.push(`Income Tax (Additional Rate 45%),${taxEstimate.additionalRate.toFixed(2)}`);
      rows.push(`Total Income Tax,${taxEstimate.totalIncomeTax.toFixed(2)}`);
      rows.push(`Class 4 NICs,${taxEstimate.class4Nics.toFixed(2)}`);
      rows.push(`Class 2 NICs,${taxEstimate.class2Nics.toFixed(2)}`);
      rows.push(`Total Estimated Tax,${taxEstimate.totalTax.toFixed(2)}`);
    }

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `self-assessment-${activeTaxYear.label}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Self Assessment report exported');
  }, [data, activeTaxYear, capitalBreakdown, taxEstimate]);

  // ------ Print handler ----------------------------------------------------

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleRefresh = useCallback(() => {
    fetchData();
    toast.success('Report refreshed');
  }, [fetchData]);

  // ------ Render -----------------------------------------------------------

  if (isLoading) {
    return <SelfAssessmentSkeleton />;
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-destructive font-medium mb-2">{error}</p>
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 print:hidden">
        <div className="w-full sm:w-56">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger>
              <SelectValue placeholder="Select tax year" />
            </SelectTrigger>
            <SelectContent>
              {taxYears.map((ty) => (
                <SelectItem key={ty.label} value={ty.label}>
                  {ty.label} ({formatDate(ty.start)} &ndash; {formatDate(ty.end)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 sm:ml-auto">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Print header (only visible when printing) */}
      <div className="hidden print:block print:mb-6">
        <h1 className="text-2xl font-bold">Self Assessment Tax Summary</h1>
        <p className="text-sm text-muted-foreground">
          Tax Year {activeTaxYear.label} &mdash; {formatDate(activeTaxYear.start)} to{' '}
          {formatDate(activeTaxYear.end)}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Income</p>
                <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(data.totals.total_income)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">SA103 Turnover</p>
              </div>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950/50 rounded-lg print:bg-emerald-100">
                <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
                  {formatCurrency(data.totals.total_expenditure)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">SA103 Allowable Expenses</p>
              </div>
              <div className="p-3 bg-rose-100 dark:bg-rose-950/50 rounded-lg print:bg-rose-100">
                <TrendingDown className="h-6 w-6 text-rose-600 dark:text-rose-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Profit/Loss</p>
                <p
                  className={`text-2xl font-bold tabular-nums ${
                    data.totals.net_operating_profit >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatCurrency(data.totals.net_operating_profit)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Tax return figure</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-950/50 rounded-lg print:bg-blue-100">
                <PoundSterling className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Est. Tax Due</p>
                <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  {taxEstimate ? formatCurrency(taxEstimate.totalTax) : '---'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Income tax + NICs</p>
              </div>
              <div className="p-3 bg-amber-100 dark:bg-amber-950/50 rounded-lg print:bg-amber-100">
                <Calculator className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Income Section (SA103 Trading Income) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <TrendingUp className="h-5 w-5" />
            Income &mdash; SA103 Trading Income
          </CardTitle>
          <CardDescription>
            Total turnover / income for the tax year. Maps to Box 10&ndash;15 on the SA103.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.income.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No income recorded for this tax year.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 px-4 text-left font-medium text-muted-foreground">Category</th>
                    <th className="py-2 px-4 text-right font-medium text-muted-foreground">Txns</th>
                    <th className="py-2 px-4 text-right font-medium text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {data.income.map((section) => (
                    <HierarchySectionRow
                      key={section.id}
                      section={section}
                      colorClass="text-emerald-600 dark:text-emerald-400"
                    />
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border font-bold">
                    <td className="py-3 px-4 text-foreground">Total Income</td>
                    <td />
                    <td className="py-3 px-4 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(data.totals.total_income)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expenses Section (SA103 Allowable Expenses) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
            <TrendingDown className="h-5 w-5" />
            Allowable Expenses &mdash; SA103 Expenses
          </CardTitle>
          <CardDescription>
            Total allowable expenses for the tax year. Review category breakdown and assign to the
            appropriate SA103 boxes when completing your return.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.expenditure.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No expenses recorded for this tax year.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 px-4 text-left font-medium text-muted-foreground">Category</th>
                    <th className="py-2 px-4 text-right font-medium text-muted-foreground">Txns</th>
                    <th className="py-2 px-4 text-right font-medium text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {data.expenditure.map((section) => (
                    <HierarchySectionRow
                      key={section.id}
                      section={section}
                      colorClass="text-rose-600 dark:text-rose-400"
                    />
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border font-bold">
                    <td className="py-3 px-4 text-foreground">Total Expenses</td>
                    <td />
                    <td className="py-3 px-4 text-right tabular-nums text-rose-600 dark:text-rose-400">
                      {formatCurrency(data.totals.total_expenditure)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Net Profit/Loss */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PoundSterling className="h-5 w-5 text-primary" />
            Net Profit / Loss
          </CardTitle>
          <CardDescription>
            Turnover minus allowable expenses. This is the figure for your tax return (SA103 Box 29
            or Box 31).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-4">
            <span
              className={`text-4xl font-bold tabular-nums ${
                data.totals.net_operating_profit >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrency(data.totals.net_operating_profit)}
            </span>
            <span className="text-sm text-muted-foreground">
              ({formatCurrency(data.totals.total_income)} income &minus;{' '}
              {formatCurrency(data.totals.total_expenditure)} expenses)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Capital Movements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-violet-700 dark:text-violet-400">
            <Wallet className="h-5 w-5" />
            Capital Movements
          </CardTitle>
          <CardDescription>
            Owner injections and drawings for the tax year. These do not affect your tax calculation
            but are needed for your accounts and balance sheet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.capital.length === 0 &&
          capitalBreakdown.injections === 0 &&
          capitalBreakdown.drawings === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No capital movements recorded for this tax year.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between p-4 rounded-lg bg-violet-50 dark:bg-violet-950/30 print:bg-violet-50">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Capital Injections</p>
                    <p className="text-xl font-bold tabular-nums text-violet-600 dark:text-violet-400">
                      {formatCurrency(capitalBreakdown.injections)}
                    </p>
                  </div>
                  <TrendingUp className="h-5 w-5 text-violet-500" />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-violet-50 dark:bg-violet-950/30 print:bg-violet-50">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Drawings</p>
                    <p className="text-xl font-bold tabular-nums text-violet-600 dark:text-violet-400">
                      {formatCurrency(capitalBreakdown.drawings)}
                    </p>
                  </div>
                  <TrendingDown className="h-5 w-5 text-violet-500" />
                </div>
              </div>

              {/* Detailed capital breakdown */}
              {data.capital.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 px-4 text-left font-medium text-muted-foreground">Category</th>
                        <th className="py-2 px-4 text-right font-medium text-muted-foreground">Txns</th>
                        <th className="py-2 px-4 text-right font-medium text-muted-foreground">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {data.capital.map((section) => (
                        <HierarchySectionRow
                          key={section.id}
                          section={section}
                          colorClass="text-violet-600 dark:text-violet-400"
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tax Estimate */}
      {taxEstimate && (
        <Card className="border-amber-200 dark:border-amber-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Calculator className="h-5 w-5" />
              Tax Estimate (2024&ndash;25 Rates)
            </CardTitle>
            <CardDescription>
              Estimated tax liability based on net profit using 2024&ndash;25 UK tax rates. This is
              for informational purposes only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Income Tax breakdown */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Income Tax</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Personal Allowance (0%)
                    </span>
                    <span className="tabular-nums text-foreground">
                      {formatCurrency(taxEstimate.personalAllowance)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Basic Rate (20% up to {formatCurrency(50270)})
                    </span>
                    <span className="tabular-nums text-foreground">
                      {formatCurrency(taxEstimate.basicRate)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Higher Rate (40% up to {formatCurrency(125140)})
                    </span>
                    <span className="tabular-nums text-foreground">
                      {formatCurrency(taxEstimate.higherRate)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Additional Rate (45% above)</span>
                    <span className="tabular-nums text-foreground">
                      {formatCurrency(taxEstimate.additionalRate)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold border-t border-border pt-1 mt-1">
                    <span className="text-foreground">Total Income Tax</span>
                    <span className="tabular-nums text-amber-600 dark:text-amber-400">
                      {formatCurrency(taxEstimate.totalIncomeTax)}
                    </span>
                  </div>
                </div>
              </div>

              {/* NICs breakdown */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">
                  National Insurance Contributions
                </h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Class 4 NICs (9% on {formatCurrency(12570)}&ndash;{formatCurrency(50270)}, 2%
                      above)
                    </span>
                    <span className="tabular-nums text-foreground">
                      {formatCurrency(taxEstimate.class4Nics)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Class 2 NICs ({formatCurrency(3.45)}/week)
                    </span>
                    <span className="tabular-nums text-foreground">
                      {formatCurrency(taxEstimate.class2Nics)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-baseline border-t-2 border-border pt-3">
                <span className="text-lg font-bold text-foreground">
                  Total Estimated Tax
                </span>
                <span className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  {formatCurrency(taxEstimate.totalTax)}
                </span>
              </div>

              {/* Disclaimer */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 print:bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  This is an estimate only based on 2024&ndash;25 UK tax rates. It does not account
                  for other income sources, reliefs, or allowances. Consult your accountant for
                  actual tax liability.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
