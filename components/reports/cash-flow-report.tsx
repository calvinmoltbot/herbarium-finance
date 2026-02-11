'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Wallet,
  RefreshCw,
  Download,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  reportDataEngine,
  FlexibleReportConfig,
  CashFlowData,
} from '@/lib/reports-data-engine';
import { DateRangePicker } from '@/components/reports/date-range-picker';
import { getPresetDateRange } from '@/lib/date-range-utils';
import type { CustomDateRange } from '@/lib/types';
import { toast } from 'sonner';

interface CashFlowReportProps {
  className?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

function formatDateFull(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Custom tooltip for the chart
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload || !label) return null;

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-foreground mb-2">{formatDateFull(label)}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
          </div>
          <span className="font-medium tabular-nums text-foreground">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// Skeleton loader
function CashFlowSkeleton() {
  return (
    <div className="space-y-6">
      {/* Date picker skeleton */}
      <div className="h-10 w-64 bg-muted rounded animate-pulse" />

      {/* Chart skeleton */}
      <Card>
        <CardHeader>
          <div className="h-5 w-40 bg-muted rounded animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-[350px] bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>

      {/* Summary cards skeleton */}
      <div className="grid gap-4 md:grid-cols-4">
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

      {/* Table skeleton */}
      <Card>
        <CardHeader>
          <div className="h-5 w-40 bg-muted rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function CashFlowReport({ className }: CashFlowReportProps) {
  const [dateRange, setDateRange] = useState<CustomDateRange>(() =>
    getPresetDateRange('last_month')
  );
  const [data, setData] = useState<CashFlowData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const config: FlexibleReportConfig = {
        name: 'Cash Flow Statement',
        dateRange: {
          start: dateRange.start,
          end: dateRange.end,
          period: 'monthly',
        },
        groupBy: 'category',
        includeTypes: ['income', 'expenditure', 'capital'],
        visualizations: ['table', 'line_chart'],
      };

      const cashFlowData = await reportDataEngine.getCashFlowData(config);
      setData(cashFlowData);
    } catch (err) {
      console.error('Error fetching cash flow data:', err);
      setError('Failed to load cash flow data. Please try again.');
      toast.error('Failed to load cash flow data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const handleDateRangeChange = (range: CustomDateRange) => {
    setDateRange(range);
  };

  const handleRefresh = () => {
    fetchData();
    toast.success('Report refreshed');
  };

  // Calculate summary values
  const totalInflows = data.reduce((sum, d) => sum + d.income, 0);
  const totalOutflows = data.reduce((sum, d) => sum + d.expenditure, 0);
  const netCashFlow = totalInflows - totalOutflows;
  const endBalance = data.length > 0 ? data[data.length - 1].running_balance : 0;

  // Export to CSV
  const handleExport = () => {
    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Date', 'Income', 'Expenditure', 'Net Flow', 'Running Balance'];
    const rows = data.map((d) => [
      formatDateFull(d.date),
      d.income.toFixed(2),
      d.expenditure.toFixed(2),
      d.net_flow.toFixed(2),
      d.running_balance.toFixed(2),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cash-flow-statement-${dateRange.start.toISOString().split('T')[0]}-to-${dateRange.end.toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Cash flow statement exported');
  };

  if (isLoading) {
    return <CashFlowSkeleton />;
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

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-full sm:w-80">
          <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Inflows
                </p>
                <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalInflows)}
                </p>
              </div>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950/50 rounded-lg">
                <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Outflows
                </p>
                <p className="text-2xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
                  {formatCurrency(totalOutflows)}
                </p>
              </div>
              <div className="p-3 bg-rose-100 dark:bg-rose-950/50 rounded-lg">
                <TrendingDown className="h-6 w-6 text-rose-600 dark:text-rose-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Net Cash Flow
                </p>
                <p
                  className={`text-2xl font-bold tabular-nums ${
                    netCashFlow >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatCurrency(netCashFlow)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-950/50 rounded-lg">
                <ArrowUpDown className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  End Balance
                </p>
                <p
                  className={`text-2xl font-bold tabular-nums ${
                    endBalance >= 0
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatCurrency(endBalance)}
                </p>
              </div>
              <div className="p-3 bg-violet-100 dark:bg-violet-950/50 rounded-lg">
                <Wallet className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Area Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Over Time</CardTitle>
          <CardDescription>
            Daily income, expenditure, and running balance for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="flex items-center justify-center h-[350px] text-muted-foreground">
              No transactions found for the selected period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart
                data={data}
                margin={{ top: 10, right: 30, left: 20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpenditure" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateLabel}
                  className="text-xs fill-muted-foreground"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={(value) =>
                    new Intl.NumberFormat('en-GB', {
                      style: 'currency',
                      currency: 'GBP',
                      notation: 'compact',
                      minimumFractionDigits: 0,
                    }).format(value)
                  }
                  className="text-xs fill-muted-foreground"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorIncome)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="expenditure"
                  name="Expenditure"
                  stroke="#f43f5e"
                  fillOpacity={1}
                  fill="url(#colorExpenditure)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="running_balance"
                  name="Running Balance"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorBalance)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Daily Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Breakdown</CardTitle>
          <CardDescription>
            {data.length} day{data.length !== 1 ? 's' : ''} with transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found for the selected period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                      Income
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                      Expenditure
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                      Net Flow
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                      Running Balance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, index) => (
                    <tr
                      key={row.date}
                      className={`border-b border-border/50 hover:bg-muted/50 transition-colors ${
                        index % 2 === 0 ? 'bg-transparent' : 'bg-muted/20'
                      }`}
                    >
                      <td className="py-3 px-4 font-medium text-foreground">
                        {formatDateFull(row.date)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                        {row.income > 0 ? formatCurrency(row.income) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-rose-600 dark:text-rose-400">
                        {row.expenditure > 0
                          ? formatCurrency(row.expenditure)
                          : '-'}
                      </td>
                      <td
                        className={`py-3 px-4 text-right tabular-nums font-medium ${
                          row.net_flow >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {formatCurrency(row.net_flow)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right tabular-nums font-medium ${
                          row.running_balance >= 0
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {formatCurrency(row.running_balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/30">
                    <td className="py-3 px-4 font-bold text-foreground">
                      Total
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(totalInflows)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-bold text-rose-600 dark:text-rose-400">
                      {formatCurrency(totalOutflows)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right tabular-nums font-bold ${
                        netCashFlow >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatCurrency(netCashFlow)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right tabular-nums font-bold ${
                        endBalance >= 0
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatCurrency(endBalance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
