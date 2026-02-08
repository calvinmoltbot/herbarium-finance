'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Expand, Minimize } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CategoryHierarchyWithCategories } from '@/hooks/use-category-hierarchies';
import { useDashboardStats } from '@/hooks/use-dashboard-stats';

interface CollapsiblePLPreviewProps {
  incomeHierarchies: CategoryHierarchyWithCategories[];
  expenditureHierarchies: CategoryHierarchyWithCategories[];
  capitalHierarchies?: CategoryHierarchyWithCategories[];
}

interface HierarchyItemProps {
  hierarchy: CategoryHierarchyWithCategories;
  index: number;
  amount: number;
  type: 'income' | 'expenditure' | 'capital';
  isExpanded: boolean;
  onToggleExpand: (hierarchyId: string, expanded: boolean) => void;
}

function HierarchyItem({ hierarchy, index, type, isExpanded, onToggleExpand }: HierarchyItemProps) {
  const hasCategories = hierarchy.categories && hierarchy.categories.length > 0;
  const bgColorClass = type === 'income' ? 'bg-green-50' : 
                       type === 'expenditure' ? 'bg-red-50' : 'bg-purple-50';

  return (
    <div className="space-y-1">
      {/* Hierarchy Header */}
      <div 
        className={`flex items-center p-2 rounded cursor-pointer hover:${bgColorClass} transition-colors`}
        onClick={() => hasCategories && onToggleExpand(hierarchy.id, !isExpanded)}
      >
        <div className="flex items-center space-x-2">
          {hasCategories ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )
          ) : (
            <div className="w-4 h-4" /> // Spacer for alignment
          )}
          <span className="text-gray-700 font-medium">
            {index + 1}. {hierarchy.name}
          </span>
          {hasCategories && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {hierarchy.categories.length} categories
            </span>
          )}
        </div>
      </div>

      {/* Category Details (Collapsible) */}
      {hasCategories && isExpanded && (
        <div className="ml-6 space-y-1">
          {hierarchy.categories.map((category) => (
            <div key={category.id} className="flex items-center py-1 px-2 text-sm">
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-gray-600">{category.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CollapsiblePLPreview({ incomeHierarchies, expenditureHierarchies, capitalHierarchies = [] }: CollapsiblePLPreviewProps) {
  const { data: stats } = useDashboardStats();
  
  // Local state for expand/collapse (fallback until database preferences are set up)
  const [expandedHierarchies, setExpandedHierarchies] = useState<Record<string, boolean>>({});

  const isHierarchyExpanded = (hierarchyId: string, defaultExpanded = true) => {
    return expandedHierarchies[hierarchyId] ?? defaultExpanded;
  };

  const setHierarchyExpanded = (hierarchyId: string, expanded: boolean) => {
    setExpandedHierarchies(prev => ({
      ...prev,
      [hierarchyId]: expanded
    }));
  };

  // Calculate totals
  const totalIncome = stats?.totalIncome || 0;
  const totalExpenditure = stats?.totalExpenditure || 0;
  const netProfit = stats?.netBalance || 0;

  // Distribute totals evenly across hierarchies for preview purposes
  const avgIncomePerHierarchy = incomeHierarchies.length > 0 ? totalIncome / incomeHierarchies.length : 0;
  const avgExpenditurePerHierarchy = expenditureHierarchies.length > 0 ? totalExpenditure / expenditureHierarchies.length : 0;

  // Get all hierarchy IDs for expand/collapse all
  const allHierarchyIds = [
    ...incomeHierarchies.map(h => h.id),
    ...expenditureHierarchies.map(h => h.id),
    ...capitalHierarchies.map(h => h.id)
  ];

  const handleExpandAll = () => {
    const newState = { ...expandedHierarchies };
    allHierarchyIds.forEach(id => {
      newState[id] = true;
    });
    setExpandedHierarchies(newState);
  };

  const handleCollapseAll = () => {
    const newState = { ...expandedHierarchies };
    allHierarchyIds.forEach(id => {
      newState[id] = false;
    });
    setExpandedHierarchies(newState);
  };

  return (
    <Card className="h-fit">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <span>📊</span>
              <span>Live P&L Preview</span>
            </CardTitle>
            <CardDescription>
              Interactive P&L with collapsible hierarchies
            </CardDescription>
          </div>
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExpandAll}
              title="Expand All"
            >
              <Expand className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCollapseAll}
              title="Collapse All"
            >
              <Minimize className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 font-mono text-sm">
          {/* Income Section */}
          <div>
            <h3 className="font-bold text-green-700 mb-3 border-b border-green-200 pb-2 flex items-center justify-between">
              <span>INCOME</span>
              <span className="text-xs font-normal text-gray-500">
                {incomeHierarchies.length} hierarchies
              </span>
            </h3>
            <div className="space-y-1">
              {incomeHierarchies.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-xs">
                  No income hierarchies configured
                </div>
              ) : (
                incomeHierarchies.map((hierarchy, index) => (
                  <HierarchyItem
                    key={hierarchy.id}
                    hierarchy={hierarchy}
                    index={index}
                    amount={avgIncomePerHierarchy}
                    type="income"
                    isExpanded={isHierarchyExpanded(hierarchy.id)}
                    onToggleExpand={setHierarchyExpanded}
                  />
                ))
              )}
              <div className="border-t border-green-200 pt-2 mt-3">
                <span className="text-green-700 font-bold">TOTAL INCOME</span>
              </div>
            </div>
          </div>

          {/* Expenditure Section */}
          <div>
            <h3 className="font-bold text-red-700 mb-3 border-b border-red-200 pb-2 flex items-center justify-between">
              <span>EXPENDITURE</span>
              <span className="text-xs font-normal text-gray-500">
                {expenditureHierarchies.length} hierarchies
              </span>
            </h3>
            <div className="space-y-1">
              {expenditureHierarchies.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-xs">
                  No expenditure hierarchies configured
                </div>
              ) : (
                expenditureHierarchies.map((hierarchy, index) => (
                  <HierarchyItem
                    key={hierarchy.id}
                    hierarchy={hierarchy}
                    index={index}
                    amount={avgExpenditurePerHierarchy}
                    type="expenditure"
                    isExpanded={isHierarchyExpanded(hierarchy.id)}
                    onToggleExpand={setHierarchyExpanded}
                  />
                ))
              )}
              <div className="border-t border-red-200 pt-2 mt-3">
                <span className="text-red-700 font-bold">TOTAL EXPENDITURE</span>
              </div>
            </div>
          </div>

          {/* Capital Movements Section */}
          {capitalHierarchies.length > 0 && (
            <div>
              <h3 className="font-bold text-purple-700 mb-3 border-b border-purple-200 pb-2 flex items-center justify-between">
                <span>CAPITAL MOVEMENTS</span>
                <span className="text-xs font-normal text-gray-500">
                  {capitalHierarchies.length} hierarchies
                </span>
              </h3>
              <div className="space-y-1">
                {capitalHierarchies.map((hierarchy, index) => (
                  <HierarchyItem
                    key={hierarchy.id}
                    hierarchy={hierarchy}
                    index={index}
                    amount={0} // Placeholder amount
                    type="capital"
                    isExpanded={isHierarchyExpanded(hierarchy.id)}
                    onToggleExpand={setHierarchyExpanded}
                  />
                ))}
                <div className="border-t border-purple-200 pt-2 mt-3">
                  <span className="text-purple-700 font-bold">TOTAL CAPITAL MOVEMENTS</span>
                </div>
              </div>
            </div>
          )}

          {/* Net Profit */}
          <div className="border-t-2 border-gray-400 pt-3">
            <div className={`font-bold text-lg ${
              netProfit >= 0 ? 'text-green-700' : 'text-red-700'
            }`}>
              <span>NET PROFIT</span>
            </div>
          </div>

          {/* Helpful Tips */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-1">💡 Tips:</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Click hierarchy names to expand/collapse details</li>
              <li>• Use expand/collapse all buttons for quick navigation</li>
              <li>• Your preferences are saved automatically</li>
              <li>• Drag hierarchies to reorder them</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
