'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryHierarchyWithCategories } from '@/hooks/use-category-hierarchies';
import { useDashboardStats } from '@/hooks/use-dashboard-stats';

interface PLPreviewProps {
  incomeHierarchies: CategoryHierarchyWithCategories[];
  expenditureHierarchies: CategoryHierarchyWithCategories[];
}

export function PLPreview({ incomeHierarchies, expenditureHierarchies }: PLPreviewProps) {
  const { data: stats } = useDashboardStats();

  // For now, we'll show a simplified preview with placeholder amounts
  // In a real implementation, you'd want to fetch actual category totals
  const totalIncome = stats?.totalIncome || 0;
  const totalExpenditure = stats?.totalExpenditure || 0;
  const netProfit = stats?.netBalance || 0;

  // Distribute totals evenly across hierarchies for preview purposes
  const avgIncomePerHierarchy = incomeHierarchies.length > 0 ? totalIncome / incomeHierarchies.length : 0;
  const avgExpenditurePerHierarchy = expenditureHierarchies.length > 0 ? totalExpenditure / expenditureHierarchies.length : 0;

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>📊</span>
          <span>Live P&L Preview</span>
        </CardTitle>
        <CardDescription>
          How your P&L report will look with current hierarchy order
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 font-mono text-sm">
          {/* Income Section */}
          <div>
            <h3 className="font-bold text-green-700 mb-2 border-b border-green-200 pb-1">
              INCOME
            </h3>
            <div className="space-y-1 ml-2">
              {incomeHierarchies.map((hierarchy, index) => (
                <div key={`income-${hierarchy.id}-${index}`} className="flex justify-between">
                  <span className="text-gray-700">
                    {index + 1}. {hierarchy.name}
                  </span>
                  <span className="font-medium text-green-600">
                    £{avgIncomePerHierarchy.toLocaleString()}
                  </span>
                </div>
              ))}
              <div className="flex justify-between border-t border-green-200 pt-1 mt-2 font-bold">
                <span className="text-green-700">TOTAL INCOME</span>
                <span className="text-green-600">
                  £{totalIncome.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Expenditure Section */}
          <div>
            <h3 className="font-bold text-red-700 mb-2 border-b border-red-200 pb-1">
              EXPENDITURE
            </h3>
            <div className="space-y-1 ml-2">
              {expenditureHierarchies.map((hierarchy, index) => (
                <div key={`expenditure-${hierarchy.id}-${index}`} className="flex justify-between">
                  <span className="text-gray-700">
                    {index + 1}. {hierarchy.name}
                  </span>
                  <span className="font-medium text-red-600">
                    £{avgExpenditurePerHierarchy.toLocaleString()}
                  </span>
                </div>
              ))}
              <div className="flex justify-between border-t border-red-200 pt-1 mt-2 font-bold">
                <span className="text-red-700">TOTAL EXPENDITURE</span>
                <span className="text-red-600">
                  £{totalExpenditure.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Net Profit */}
          <div className="border-t-2 border-gray-400 pt-2">
            <div className={`flex justify-between font-bold text-lg ${
              netProfit >= 0 ? 'text-green-700' : 'text-red-700'
            }`}>
              <span>NET PROFIT</span>
              <span>
                £{netProfit.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Helpful Tips */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-1">💡 Tips:</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Drag hierarchies to reorder them</li>
              <li>• This preview updates in real-time</li>
              <li>• Your P&L reports will use this exact layout</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
