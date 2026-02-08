'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Calendar, 
  Table as TableIcon,
  RefreshCw
} from 'lucide-react';
import { 
  FlexibleReportConfig,
  DateUtils
} from '@/lib/reports-data-engine';
import { useReportData, usePeriodComparison } from '@/hooks/use-report-data';

interface FlexibleReportViewerProps {
  reportId: string;
  initialConfig?: Partial<FlexibleReportConfig>;
}

export function FlexibleReportViewer({ initialConfig }: FlexibleReportViewerProps) {
  // Default configuration
  const [config, setConfig] = useState<FlexibleReportConfig>({
    name: 'Financial Report',
    dateRange: {
      start: DateUtils.getLastMonth().start,
      end: DateUtils.getLastMonth().end,
      period: 'monthly',
    },
    comparison: {
      enabled: true,
      previousPeriod: true,
    },
    groupBy: 'hierarchy',
    includeTypes: ['income', 'expenditure'],
    visualizations: ['table', 'bar_chart'],
    ...initialConfig,
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'breakdown' | 'trends' | 'comparison'>('overview');

  // Fetch data using our hooks
  const { 
    categoryBreakdown,
    monthlyTrends,
    plStructure,
    isLoading,
    isError 
  } = useReportData(config);

  const periodComparison = usePeriodComparison(config);

  // Quick date range presets
  const datePresets = [
    { label: 'Last Month', value: 'lastMonth', range: DateUtils.getLastMonth() },
    { label: 'Last Quarter', value: 'lastQuarter', range: DateUtils.getLastQuarter() },
    { label: 'Year to Date', value: 'ytd', range: DateUtils.getYearToDate() },
    { label: 'Last Year', value: 'lastYear', range: DateUtils.getLastYear() },
  ];

  // Handle date preset change
  const handleDatePresetChange = (preset: string) => {
    const selectedPreset = datePresets.find(p => p.value === preset);
    if (selectedPreset) {
      setConfig(prev => ({
        ...prev,
        dateRange: {
          ...selectedPreset.range,
          period: preset === 'lastMonth' ? 'monthly' : 
                 preset === 'lastQuarter' ? 'quarterly' : 'annual',
        },
      }));
    }
  };

  // Toggle comparison
  const toggleComparison = () => {
    setConfig(prev => ({
      ...prev,
      comparison: {
        enabled: !prev.comparison?.enabled,
        previousPeriod: prev.comparison?.previousPeriod ?? true,
      },
    }));
  };

  // Summary calculations
  const summary = useMemo(() => {
    if (!monthlyTrends.data) return null;
    
    const totalIncome = monthlyTrends.data.reduce((sum, month) => sum + month.income_total, 0);
    const totalExpenditure = monthlyTrends.data.reduce((sum, month) => sum + month.expenditure_total, 0);
    const netPosition = totalIncome - totalExpenditure;
    const transactionCount = categoryBreakdown.data?.reduce((sum, cat) => sum + cat.transaction_count, 0) || 0;

    return {
      totalIncome,
      totalExpenditure,
      netPosition,
      transactionCount,
    };
  }, [monthlyTrends.data, categoryBreakdown.data]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-3 text-lg">Loading report data...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardHeader>
          <CardTitle className="text-red-900">Error Loading Report</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-700">
            There was an error loading the report data. Please try refreshing the page or contact support.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Report Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Financial Report
              </CardTitle>
              <CardDescription>
                {DateUtils.formatDateRange(config.dateRange.start, config.dateRange.end)}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select onValueChange={handleDatePresetChange}>
                <SelectTrigger className="w-40">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  {datePresets.map(preset => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={toggleComparison}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                {config.comparison?.enabled ? 'Hide' : 'Show'} Comparison
              </Button>
              
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                £{summary.totalIncome.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenditure</CardTitle>
              <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                £{summary.totalExpenditure.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Position</CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.netPosition >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                £{summary.netPosition.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <TableIcon className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.transactionCount.toLocaleString('en-GB')}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Tabs */}
      <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as 'overview' | 'breakdown' | 'trends' | 'comparison')}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="breakdown">Category Breakdown</TabsTrigger>
          <TabsTrigger value="trends">Monthly Trends</TabsTrigger>
          <TabsTrigger value="comparison">Period Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* P&L Structure */}
            <Card>
              <CardHeader>
                <CardTitle>P&L Structure</CardTitle>
                <CardDescription>Income and expenditure by hierarchy</CardDescription>
              </CardHeader>
              <CardContent>
                {plStructure.data && plStructure.data.length > 0 ? (
                  <div className="space-y-3">
                    {plStructure.data.map((item) => (
                      <div key={item.hierarchy_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{item.hierarchy_name}</p>
                          <p className="text-sm text-gray-600">{item.transaction_count} transactions</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${item.total_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            £{Math.abs(item.total_amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-sm text-gray-600">
                            {item.percentage_of_total.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No P&L data available for this period</p>
                )}
              </CardContent>
            </Card>

            {/* Top Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Top Categories</CardTitle>
                <CardDescription>Highest spending categories</CardDescription>
              </CardHeader>
              <CardContent>
                {categoryBreakdown.data && categoryBreakdown.data.length > 0 ? (
                  <div className="space-y-3">
                    {categoryBreakdown.data.slice(0, 5).map((item) => (
                      <div key={item.category_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{item.category_name}</p>
                          <p className="text-sm text-gray-600">{item.transaction_count} transactions</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">
                            £{Math.abs(item.total_amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-sm text-gray-600">
                            {item.percentage_of_total.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No category data available for this period</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
              <CardDescription>Detailed breakdown by category</CardDescription>
            </CardHeader>
            <CardContent>
              {categoryBreakdown.data && categoryBreakdown.data.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Category</th>
                        <th className="text-left p-2">Hierarchy</th>
                        <th className="text-right p-2">Amount</th>
                        <th className="text-right p-2">Transactions</th>
                        <th className="text-right p-2">Average</th>
                        <th className="text-right p-2">% of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryBreakdown.data.map((item) => (
                        <tr key={item.category_id} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-medium">{item.category_name}</td>
                          <td className="p-2 text-gray-600">{item.hierarchy_name || '-'}</td>
                          <td className="p-2 text-right font-mono">
                            £{Math.abs(item.total_amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2 text-right">{item.transaction_count}</td>
                          <td className="p-2 text-right font-mono">
                            £{Math.abs(item.average_amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2 text-right">{item.percentage_of_total.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No category breakdown data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Trends</CardTitle>
              <CardDescription>Income and expenditure trends over time</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyTrends.data && monthlyTrends.data.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Month</th>
                        <th className="text-right p-2">Income</th>
                        <th className="text-right p-2">Expenditure</th>
                        <th className="text-right p-2">Net Position</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyTrends.data.map((item) => (
                        <tr key={item.month_year} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-medium">{item.month} {item.year}</td>
                          <td className="p-2 text-right font-mono text-green-600">
                            £{item.income_total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2 text-right font-mono text-red-600">
                            £{item.expenditure_total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`p-2 text-right font-mono ${item.net_position >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            £{item.net_position.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No monthly trend data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-6">
          {config.comparison?.enabled ? (
            <Card>
              <CardHeader>
                <CardTitle>Period Comparison</CardTitle>
                <CardDescription>Current period vs previous period</CardDescription>
              </CardHeader>
              <CardContent>
                {periodComparison.data && periodComparison.data.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Category</th>
                          <th className="text-right p-2">Current Period</th>
                          <th className="text-right p-2">Previous Period</th>
                          <th className="text-right p-2">Variance</th>
                          <th className="text-right p-2">% Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {periodComparison.data.map((item, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-medium">
                              {item.hierarchy_name || item.category_name}
                            </td>
                            <td className="p-2 text-right font-mono">
                              £{Math.abs(item.current_period_total).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-2 text-right font-mono">
                              £{Math.abs(item.previous_period_total).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                            </td>
                            <td className={`p-2 text-right font-mono ${item.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              £{Math.abs(item.variance).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                            </td>
                            <td className={`p-2 text-right ${Math.abs(item.variance_percentage) > 10 ? 'font-bold' : ''} ${item.variance_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {item.variance_percentage > 0 ? '+' : ''}{item.variance_percentage.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No comparison data available</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <TrendingUp className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Period Comparison Disabled
                </h3>
                <p className="text-gray-500 mb-6">
                  Enable period comparison to see how this period compares to the previous one.
                </p>
                <Button onClick={toggleComparison}>
                  Enable Comparison
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
