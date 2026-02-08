'use client';

import React, { useState } from 'react';
import { AlertTriangle, Plus, Check, X, Users, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUnallocatedCategories, useBulkAssignCategories, useQuickAssignCategory, useUnallocatedCategoriesStats } from '@/hooks/use-unallocated-categories';
import { useCategoryHierarchies } from '@/hooks/use-category-hierarchies';

interface UnallocatedCategoriesPanelProps {
  type?: 'income' | 'expenditure' | 'capital';
  className?: string;
}

export function UnallocatedCategoriesPanel({ type, className }: UnallocatedCategoriesPanelProps) {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [bulkAssignHierarchy, setBulkAssignHierarchy] = useState<string>('');
  const [quickAssignStates, setQuickAssignStates] = useState<Record<string, string>>({});

  const { data: unallocatedCategories = [], isLoading } = useUnallocatedCategories(type);
  const { data: stats } = useUnallocatedCategoriesStats();
  const { data: hierarchies = [] } = useCategoryHierarchies(type);
  
  const bulkAssign = useBulkAssignCategories();
  const quickAssign = useQuickAssignCategory();

  const handleSelectCategory = (categoryId: string) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId);
    } else {
      newSelected.add(categoryId);
    }
    setSelectedCategories(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedCategories.size === unallocatedCategories.length) {
      setSelectedCategories(new Set());
    } else {
      setSelectedCategories(new Set(unallocatedCategories.map(cat => cat.id)));
    }
  };

  const handleBulkAssign = async () => {
    if (selectedCategories.size === 0 || !bulkAssignHierarchy) return;

    try {
      await bulkAssign.mutateAsync({
        categoryIds: Array.from(selectedCategories),
        hierarchyId: bulkAssignHierarchy
      });
      setSelectedCategories(new Set());
      setBulkAssignHierarchy('');
    } catch (error) {
      console.error('Failed to bulk assign categories:', error);
    }
  };

  const handleQuickAssign = async (categoryId: string, hierarchyId: string) => {
    try {
      await quickAssign.mutateAsync({
        categoryId,
        hierarchyId
      });
      // Remove from quick assign states
      setQuickAssignStates(prev => {
        const newStates = { ...prev };
        delete newStates[categoryId];
        return newStates;
      });
    } catch (error) {
      console.error('Failed to quick assign category:', error);
    }
  };

  const handleQuickAssignChange = (categoryId: string, hierarchyId: string) => {
    setQuickAssignStates(prev => ({
      ...prev,
      [categoryId]: hierarchyId
    }));
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (unallocatedCategories.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center text-green-600">
            <Check className="h-5 w-5 mr-2" />
            All Categories Assigned
          </CardTitle>
          <CardDescription>
            All {type || 'categories'} are properly assigned to hierarchies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-3 text-green-300" />
            <p className="font-medium">Perfect organization!</p>
            <p className="text-sm">No unallocated categories found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const typeIcon = type === 'income' ? TrendingUp : 
                  type === 'expenditure' ? TrendingDown : 
                  type === 'capital' ? Wallet : AlertTriangle;
  const typeColor = type === 'income' ? 'text-green-600' : 
                   type === 'expenditure' ? 'text-red-600' : 
                   type === 'capital' ? 'text-purple-600' : 'text-orange-600';

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className={`flex items-center ${typeColor}`}>
          {React.createElement(typeIcon, { className: "h-5 w-5 mr-2" })}
          Unallocated {type ? type.charAt(0).toUpperCase() + type.slice(1) : ''} Categories
          <Badge variant="destructive" className="ml-2">
            {unallocatedCategories.length}
          </Badge>
        </CardTitle>
        <CardDescription>
          Categories not assigned to any hierarchy - assign them to organize your P&L reports
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bulk Assignment Controls */}
        {unallocatedCategories.length > 1 && (
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedCategories.size === unallocatedCategories.length ? 'Deselect All' : 'Select All'}
              </Button>
              <span className="text-sm text-gray-600">
                {selectedCategories.size} of {unallocatedCategories.length} selected
              </span>
            </div>
            
            {selectedCategories.size > 0 && (
              <div className="flex gap-2">
                <Select value={bulkAssignHierarchy} onValueChange={setBulkAssignHierarchy}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select hierarchy..." />
                  </SelectTrigger>
                  <SelectContent>
                    {hierarchies.map(hierarchy => (
                      <SelectItem key={hierarchy.id} value={hierarchy.id}>
                        {hierarchy.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleBulkAssign}
                  disabled={!bulkAssignHierarchy || bulkAssign.isPending}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Assign {selectedCategories.size}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Category List */}
        <div className="space-y-3">
          {unallocatedCategories.map((category) => (
            <div
              key={category.id}
              className={`p-4 border rounded-lg transition-all ${
                selectedCategories.has(category.id)
                  ? 'border-blue-400 bg-blue-50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              {/* Category Info Row */}
              <div className="flex items-center space-x-3 mb-3">
                {/* Selection Checkbox */}
                {unallocatedCategories.length > 1 && (
                  <button
                    onClick={() => handleSelectCategory(category.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      selectedCategories.has(category.id)
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {selectedCategories.has(category.id) && (
                      <Check className="h-3 w-3" />
                    )}
                  </button>
                )}

                {/* Category Color Indicator */}
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                />

                {/* Category Name and Stats */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{category.name}</p>
                  {(category.transactionCount || 0) > 0 && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      {category.transactionCount} transaction{category.transactionCount !== 1 ? 's' : ''} • £{(category.totalAmount || 0).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Assignment Controls */}
              <div className="flex items-center gap-2">
                <Select
                  value={quickAssignStates[category.id] || ''}
                  onValueChange={(value) => handleQuickAssignChange(category.id, value)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select hierarchy to assign..." />
                  </SelectTrigger>
                  <SelectContent>
                    {hierarchies.map(hierarchy => (
                      <SelectItem key={hierarchy.id} value={hierarchy.id}>
                        {hierarchy.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {quickAssignStates[category.id] && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleQuickAssign(category.id, quickAssignStates[category.id])}
                      disabled={quickAssign.isPending}
                      className="bg-green-600 hover:bg-green-700 text-white h-9 w-9 p-0"
                      title="Save assignment"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setQuickAssignStates(prev => {
                        const newStates = { ...prev };
                        delete newStates[category.id];
                        return newStates;
                      })}
                      className="border-gray-300 hover:bg-gray-50 h-9 w-9 p-0"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        {stats && stats.total > 0 && (
          <div className="pt-3 border-t text-sm text-gray-600">
            <p>
              <strong>{stats.total}</strong> unallocated categories total
              {stats.income > 0 && ` • ${stats.income} income`}
              {stats.expenditure > 0 && ` • ${stats.expenditure} expenditure`}
              {stats.capital > 0 && ` • ${stats.capital} capital`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
