'use client';

// Sprint 3: Transaction Drill-Down Filters Component
// Purpose: Filter controls for drilling down into transactions

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { DrillDownFilters } from '@/lib/reports-types';

interface TransactionDrillDownFiltersProps {
  filters: DrillDownFilters;
  onFiltersChange: (filters: DrillDownFilters) => void;
  maxDate: Date;
  minDate: Date;
}

export function TransactionDrillDownFilters({
  filters,
  onFiltersChange,
  maxDate,
  minDate,
}: TransactionDrillDownFiltersProps) {
  const handleSearchChange = (value: string) => {
    onFiltersChange({
      ...filters,
      searchText: value || undefined,
    });
  };

  const handleMinAmountChange = (value: string) => {
    const numValue = value ? parseFloat(value) : undefined;
    onFiltersChange({
      ...filters,
      amountRange: {
        ...filters.amountRange,
        min: numValue,
      },
    });
  };

  const handleMaxAmountChange = (value: string) => {
    const numValue = value ? parseFloat(value) : undefined;
    onFiltersChange({
      ...filters,
      amountRange: {
        ...filters.amountRange,
        max: numValue,
      },
    });
  };

  const handleStartDateChange = (value: string) => {
    if (!value) {
      onFiltersChange({
        ...filters,
        dateRange: undefined,
      });
      return;
    }
    const startDate = new Date(value);
    onFiltersChange({
      ...filters,
      dateRange: {
        start: startDate,
        end: filters.dateRange?.end || maxDate,
      },
    });
  };

  const handleEndDateChange = (value: string) => {
    if (!value) {
      onFiltersChange({
        ...filters,
        dateRange: undefined,
      });
      return;
    }
    const endDate = new Date(value);
    onFiltersChange({
      ...filters,
      dateRange: {
        start: filters.dateRange?.start || minDate,
        end: endDate,
      },
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters =
    filters.searchText ||
    filters.amountRange?.min !== undefined ||
    filters.amountRange?.max !== undefined ||
    filters.dateRange;

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="border-b border-gray-200 bg-gray-50 p-4 print:hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search Filter */}
        <div className="space-y-2">
          <Label htmlFor="search" className="text-sm font-medium text-gray-700">
            Search Description
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="search"
              type="text"
              placeholder="Search transactions..."
              value={filters.searchText || ''}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Amount Range Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            Amount Range
          </Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={filters.amountRange?.min ?? ''}
              onChange={(e) => handleMinAmountChange(e.target.value)}
              step="0.01"
              className="w-1/2"
            />
            <Input
              type="number"
              placeholder="Max"
              value={filters.amountRange?.max ?? ''}
              onChange={(e) => handleMaxAmountChange(e.target.value)}
              step="0.01"
              className="w-1/2"
            />
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            Date Range
          </Label>
          <div className="flex gap-2">
            <Input
              type="date"
              value={filters.dateRange?.start ? formatDateForInput(filters.dateRange.start) : ''}
              onChange={(e) => handleStartDateChange(e.target.value)}
              min={formatDateForInput(minDate)}
              max={formatDateForInput(maxDate)}
              className="w-1/2"
            />
            <Input
              type="date"
              value={filters.dateRange?.end ? formatDateForInput(filters.dateRange.end) : ''}
              onChange={(e) => handleEndDateChange(e.target.value)}
              min={formatDateForInput(minDate)}
              max={formatDateForInput(maxDate)}
              className="w-1/2"
            />
          </div>
        </div>

        {/* Clear Filters Button */}
        <div className="flex items-end">
          <Button
            onClick={handleClearFilters}
            variant="outline"
            disabled={!hasActiveFilters}
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-3 flex flex-wrap gap-2 text-sm text-gray-600">
          <span className="font-medium">Active filters:</span>
          {filters.searchText && (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
              Search: {`"${filters.searchText}"`}
            </span>
          )}
          {filters.amountRange?.min !== undefined && (
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
              Min: £{filters.amountRange.min.toFixed(2)}
            </span>
          )}
          {filters.amountRange?.max !== undefined && (
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
              Max: £{filters.amountRange.max.toFixed(2)}
            </span>
          )}
          {filters.dateRange && (
            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
              {filters.dateRange.start.toLocaleDateString('en-GB')} - {filters.dateRange.end.toLocaleDateString('en-GB')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
