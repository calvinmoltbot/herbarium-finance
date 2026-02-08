'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardStats } from '@/hooks/use-dashboard-stats';

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
            <div className="w-32 h-32 bg-gray-200 rounded-full animate-pulse" />
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
          <p className="text-gray-500 text-center py-8">No financial data available</p>
        </CardContent>
      </Card>
    );
  }

  const incomePercentage = (income / total) * 100;
  const expenditurePercentage = (expenditure / total) * 100;

  // Create SVG path for pie segments
  const createPath = (startAngle: number, endAngle: number, radius = 70) => {
    const centerX = 100;
    const centerY = 100;
    
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;
    
    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    const x2 = centerX + radius * Math.cos(endAngleRad);
    const y2 = centerY + radius * Math.sin(endAngleRad);
    
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    
    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  const incomeAngle = (incomePercentage / 100) * 360;
  const expenditureAngle = (expenditurePercentage / 100) * 360;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income vs Expenditure</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Pie Chart */}
          <div className="flex justify-center">
            <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
              {/* Income Segment */}
              {income > 0 && (
                <path
                  d={createPath(0, incomeAngle)}
                  fill="#10b981"
                  stroke="white"
                  strokeWidth="3"
                  className="hover:opacity-80 transition-opacity"
                />
              )}
              {/* Expenditure Segment */}
              {expenditure > 0 && (
                <path
                  d={createPath(incomeAngle, 360)}
                  fill="#ef4444"
                  stroke="white"
                  strokeWidth="3"
                  className="hover:opacity-80 transition-opacity"
                />
              )}
            </svg>
          </div>

          {/* Legend */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-green-500 rounded-full" />
                <span className="text-sm font-medium">Income</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-green-600">
                  £{income.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-gray-500">
                  {incomePercentage.toFixed(1)}%
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-red-500 rounded-full" />
                <span className="text-sm font-medium">Expenditure</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-red-600">
                  £{expenditure.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-gray-500">
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
