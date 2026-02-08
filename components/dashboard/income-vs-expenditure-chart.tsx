'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLastThreeMonths } from '@/hooks/use-last-three-months';

export function IncomeVsExpenditureChart() {
  const { data: monthlyData, isLoading, error } = useLastThreeMonths();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Last 3 Months</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-6 text-sm">
              <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-64 bg-gray-100 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Income vs. Expenditure</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">Error loading chart data: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!monthlyData || monthlyData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Income vs. Expenditure</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">No data available for chart</p>
        </CardContent>
      </Card>
    );
  }

  const maxValue = Math.max(
    ...monthlyData.map(d => Math.max(d.income, d.expenditure))
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income vs. Expenditure</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Chart Legend */}
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Income</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Expenditure</span>
            </div>
          </div>

          {/* Chart - More Compact */}
          <div className="h-40 flex items-end justify-between space-x-3">
            {monthlyData.map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center space-y-2">
                <div className="w-full flex items-end justify-center space-x-1 h-32">
                  {/* Income Bar */}
                  <div 
                    className="bg-green-500 rounded-t w-6 min-h-[3px] transition-all hover:bg-green-600"
                    style={{ 
                      height: `${maxValue > 0 ? (data.income / maxValue) * 100 : 0}%` 
                    }}
                    title={`Income: £${data.income.toLocaleString()}`}
                  ></div>
                  {/* Expenditure Bar */}
                  <div 
                    className="bg-red-500 rounded-t w-6 min-h-[3px] transition-all hover:bg-red-600"
                    style={{ 
                      height: `${maxValue > 0 ? (data.expenditure / maxValue) * 100 : 0}%` 
                    }}
                    title={`Expenditure: £${data.expenditure.toLocaleString()}`}
                  ></div>
                </div>
                <span className="text-xs text-gray-600 font-medium">{data.month}</span>
              </div>
            ))}
          </div>

          {/* Y-axis labels */}
          <div className="flex justify-between text-xs text-gray-500 mt-3 px-2">
            <span>£0</span>
            <span>£{maxValue.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
