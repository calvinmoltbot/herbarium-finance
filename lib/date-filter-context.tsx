'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type DateFilter = 'all-time' | 'year-to-date' | 'this-year' | 'this-month' | 'last-month' | 'last-3-months';

interface DateFilterContextType {
  dateFilter: DateFilter;
  setDateFilter: (filter: DateFilter) => void;
  getDateRange: () => { start: Date | null; end: Date | null };
  isClient: boolean;
}

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined);

export function DateFilterProvider({ children }: { children: ReactNode }) {
  const [dateFilter, setDateFilter] = useState<DateFilter>('year-to-date');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const getDateRange = () => {
    // Only calculate dates on client side to avoid hydration issues
    if (!isClient) {
      return { start: null, end: null };
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // UK financial year starts April 1st
    const ukFyStart = month >= 3
      ? new Date(year, 3, 1)       // April 1st of current calendar year
      : new Date(year - 1, 3, 1);  // April 1st of previous calendar year
    const ukFyEnd = month >= 3
      ? new Date(year + 1, 2, 31)  // March 31st of next calendar year
      : new Date(year, 2, 31);     // March 31st of current calendar year

    switch (dateFilter) {
      case 'all-time':
        return { start: null, end: null };

      case 'year-to-date':
        // UK FY start to today
        return {
          start: ukFyStart,
          end: now,
        };

      case 'this-year':
        // Full UK financial year (April 1 - March 31)
        return {
          start: ukFyStart,
          end: ukFyEnd,
        };

      case 'this-month':
        return {
          start: new Date(year, month, 1),
          end: new Date(year, month + 1, 0),
        };

      case 'last-month':
        return {
          start: new Date(year, month - 1, 1),
          end: new Date(year, month, 0),
        };

      case 'last-3-months':
        return {
          start: new Date(year, month - 3, 1),
          end: new Date(year, month + 1, 0),
        };

      default:
        return { start: null, end: null };
    }
  };

  return (
    <DateFilterContext.Provider value={{ dateFilter, setDateFilter, getDateRange, isClient }}>
      {children}
    </DateFilterContext.Provider>
  );
}

export function useDateFilter() {
  const context = useContext(DateFilterContext);
  if (context === undefined) {
    throw new Error('useDateFilter must be used within a DateFilterProvider');
  }
  return context;
}
