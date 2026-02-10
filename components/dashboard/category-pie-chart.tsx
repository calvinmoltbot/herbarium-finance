'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardStats } from '@/hooks/use-dashboard-stats';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

function formatGBP(value: number): string {
  return `£${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { fill: string } }> }) {
  if (!active || !payload?.[0]) return null;
  const entry = payload[0];
  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium" style={{ color: entry.payload.fill }}>
        {entry.name}: {formatGBP(entry.value)}
      </p>
    </div>
  );
}

export function IncomeExpenditurePieChart() {
  const { data: stats, isLoading, error } = useDashboardStats();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Income vs Expenditure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <div className="w-32 h-32 bg-muted rounded-full animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Income vs Expenditure</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">Error loading data</p>
        </CardContent>
      </Card>
    );
  }

  const income = stats?.totalIncome || 0;
  const expenditure = stats?.totalExpenditure || 0;
  const total = income + expenditure;

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Income vs Expenditure</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No financial data available</p>
        </CardContent>
      </Card>
    );
  }

  const incomePercentage = (income / total) * 100;
  const expenditurePercentage = (expenditure / total) * 100;

  const data = [
    { name: 'Income', value: income, fill: '#10b981' },
    { name: 'Expenditure', value: expenditure, fill: '#f43f5e' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income vs Expenditure</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                stroke="hsl(var(--background))"
                strokeWidth={3}
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-emerald-500 rounded-full" />
                <span className="text-sm font-medium">Income</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatGBP(income)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {incomePercentage.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-rose-500 rounded-full" />
                <span className="text-sm font-medium">Expenditure</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                  {formatGBP(expenditure)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {expenditurePercentage.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
