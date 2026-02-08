'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type DateFilter = 'all-time' | 'this-year' | 'this-month' | 'last-month' | 'last-3-months';

interface DateFilterContextType {
  dateFilter: DateFilter;
  setDateFilter: (filter: DateFilter) => void;
  getDateRange: () => { start: Date | null; end: Date | null };
  isClient: boolean;
}

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined);

export function DateFilterProvider({ children }: { children: ReactNode }) {
  const [dateFilter, setDateFilter] = useState<DateFilter>('this-month');
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
    
    switch (dateFilter) {
      case 'all-time':
        return { start: null, end: null };
        
      case 'this-year':
        return {
          start: new Date(year, 0, 1),
          end: new Date(year, 11, 31),
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
