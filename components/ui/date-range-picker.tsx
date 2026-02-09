'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, subMonths, subQuarters } from 'date-fns';

export interface DateRange {
  from: Date | null;
  to: Date | null;
  preset?: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const datePresets = [
  { value: 'all', label: 'All Time' },
  { value: 'this-month', label: 'This Month' },
  { value: 'last-month', label: 'Last Month' },
  { value: 'this-quarter', label: 'This Quarter' },
  { value: 'last-quarter', label: 'Last Quarter' },
  { value: 'this-year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' }
];

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [showCustom, setShowCustom] = useState(value.preset === 'custom');

  const handlePresetChange = (preset: string) => {
    const now = new Date();
    let from: Date | null = null;
    let to: Date | null = null;

    switch (preset) {
      case 'all':
        from = null;
        to = null;
        break;
      case 'this-month':
        from = startOfMonth(now);
        to = endOfMonth(now);
        break;
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        from = startOfMonth(lastMonth);
        to = endOfMonth(lastMonth);
        break;
      case 'this-quarter':
        from = startOfQuarter(now);
        to = endOfQuarter(now);
        break;
      case 'last-quarter':
        const lastQuarter = subQuarters(now, 1);
        from = startOfQuarter(lastQuarter);
        to = endOfQuarter(lastQuarter);
        break;
      case 'this-year':
        from = new Date(now.getFullYear(), 0, 1);
        to = new Date(now.getFullYear(), 11, 31);
        break;
      case 'custom':
        setShowCustom(true);
        return;
      default:
        from = null;
        to = null;
    }

    setShowCustom(false);
    onChange({ from, to, preset });
  };

  const handleCustomDateChange = (field: 'from' | 'to', dateString: string) => {
    const date = dateString ? new Date(dateString) : null;
    const newRange = {
      ...value,
      [field]: date,
      preset: 'custom'
    };
    onChange(newRange);
  };

  const clearCustomRange = () => {
    setShowCustom(false);
    onChange({ from: null, to: null, preset: 'all' });
  };

  const formatDateForInput = (date: Date | null) => {
    if (!date) return '';
    return format(date, 'yyyy-MM-dd');
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Date Range</label>
        <Select 
          value={showCustom ? 'custom' : (value.preset || 'all')} 
          onValueChange={handlePresetChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select date range" />
          </SelectTrigger>
          <SelectContent>
            {datePresets.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showCustom && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-blue-900 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Custom Date Range
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCustomRange}
                className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-blue-800">From Date</label>
                <Input
                  type="date"
                  value={formatDateForInput(value.from)}
                  onChange={(e) => handleCustomDateChange('from', e.target.value)}
                  className="text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-medium text-blue-800">To Date</label>
                <Input
                  type="date"
                  value={formatDateForInput(value.to)}
                  onChange={(e) => handleCustomDateChange('to', e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>

            {value.from && value.to && (
              <div className="text-xs text-blue-700 bg-blue-100 p-2 rounded">
                <strong>Selected Range:</strong> {format(value.from, 'dd/MM/yyyy')} - {format(value.to, 'dd/MM/yyyy')}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!showCustom && value.from && value.to && (
        <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
          <strong>Range:</strong> {format(value.from, 'dd/MM/yyyy')} - {format(value.to, 'dd/MM/yyyy')}
        </div>
      )}
    </div>
  );
}

// Utility function to check if a date falls within a range
export function isDateInRange(date: Date, range: DateRange): boolean {
  if (!range.from && !range.to) return true; // All time
  if (!range.from) return date <= range.to!;
  if (!range.to) return date >= range.from;
  return date >= range.from && date <= range.to;
}

// Utility function to filter transactions by date range
export function filterTransactionsByDateRange<T extends { transaction_date: string }>(
  transactions: T[],
  range: DateRange
): T[] {
  if (!range.from && !range.to) return transactions;
  
  return transactions.filter(transaction => {
    const transactionDate = new Date(transaction.transaction_date);
    return isDateInRange(transactionDate, range);
  });
}
