'use client';

import { CalendarDays } from 'lucide-react';
import { useDateFilter } from '@/lib/date-filter-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const dateFilterLabels: Record<string, string> = {
  'all-time': 'All Time',
  'year-to-date': 'Year to Date',
  'this-year': 'This Financial Year',
  'this-month': 'This Month',
  'last-month': 'Last Month',
  'last-3-months': 'Last 3 Months',
};

export function DashboardHeader() {
  const { dateFilter, setDateFilter } = useDateFilter();

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: '#e8e6e3' }}>Dashboard</h1>
        <p className="mt-1" style={{ color: '#9794a8' }}>
          Track your income and expenditure - {dateFilterLabels[dateFilter]}
        </p>
      </div>

      <Select value={dateFilter} onValueChange={setDateFilter}>
        <SelectTrigger className="w-40">
          <CalendarDays className="w-4 h-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="year-to-date">Year to Date</SelectItem>
          <SelectItem value="this-year">This Financial Year</SelectItem>
          <SelectItem value="this-month">This Month</SelectItem>
          <SelectItem value="last-month">Last Month</SelectItem>
          <SelectItem value="last-3-months">Last 3 Months</SelectItem>
          <SelectItem value="all-time">All Time</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
