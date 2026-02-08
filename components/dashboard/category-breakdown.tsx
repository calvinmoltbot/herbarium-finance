'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useCategoryBreakdown } from '@/hooks/use-category-breakdown';

export function CategoryBreakdown() {
  const { data: categoryData, isLoading, error } = useCategoryBreakdown();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="space-y-2">
                    <div className="flex justify-between">
                      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                      <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="h-2 w-full bg-gray-200 rounded animate-pulse" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Category Breakdown</h2>
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">Error loading category data: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { income = [], expenditure = [] } = categoryData || {};
  const totalIncome = income.reduce((sum, cat) => sum + cat.amount, 0);
  const totalExpenditure = expenditure.reduce((sum, cat) => sum + cat.amount, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Category Breakdown</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Income by Category</span>
              <span className="text-sm font-normal text-gray-500">
                Total: £{totalIncome.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {income.length > 0 ? income.slice(0, 5).map((category, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{category.category}</span>
                  <span className="text-gray-600">
                    £{category.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <Progress 
                  value={category.percentage} 
                  className="h-2"
                  style={{
                    '--progress-background': category.color,
                  } as React.CSSProperties}
                />
              </div>
            )) : (
              <p className="text-gray-500 text-center py-4">No income categories found</p>
            )}
            {income.length > 5 && (
              <p className="text-xs text-gray-500 text-center pt-2">
                Showing top 5 of {income.length} categories
              </p>
            )}
          </CardContent>
        </Card>

        {/* Expenditure by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Expenditure by Category</span>
              <span className="text-sm font-normal text-gray-500">
                Total: £{totalExpenditure.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {expenditure.length > 0 ? expenditure.slice(0, 5).map((category, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{category.category}</span>
                  <span className="text-gray-600">
                    £{category.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <Progress 
                  value={category.percentage} 
                  className="h-2"
                  style={{
                    '--progress-background': category.color,
                  } as React.CSSProperties}
                />
              </div>
            )) : (
              <p className="text-gray-500 text-center py-4">No expenditure categories found</p>
            )}
            {expenditure.length > 5 && (
              <p className="text-xs text-gray-500 text-center pt-2">
                Showing top 5 of {expenditure.length} categories
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
