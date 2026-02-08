// Date Range Utilities
// Purpose: Handle date range validation, formatting, and preset generation
// Part of: Enhanced Reporting Module

import { CustomDateRange } from './types';
import { differenceInDays, format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears } from 'date-fns';

// ============================================================================
// VALIDATION
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateDateRange(start: Date, end: Date): ValidationResult {
  // Check 1: End must be after start
  if (end <= start) {
    return { valid: false, error: 'End date must be after start date' };
  }

  // Check 2: Range must not exceed 2 years (730 days)
  const daysDiff = differenceInDays(end, start);
  if (daysDiff > 730) {
    return { valid: false, error: 'Date range cannot exceed 2 years' };
  }

  // Check 3: Dates must not be in the future
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today

  if (start > today) {
    return { valid: false, error: 'Start date cannot be in the future' };
  }

  if (end > today) {
    return { valid: false, error: 'End date cannot be in the future' };
  }

  return { valid: true };
}

// ============================================================================
// FORMATTING
// ============================================================================

export function formatDateRange(start: Date, end: Date): string {
  const startStr = format(start, 'd MMM yyyy');
  const endStr = format(end, 'd MMM yyyy');
  return `${startStr} - ${endStr}`;
}

export function formatDateShort(date: Date): string {
  return format(date, 'dd/MM/yyyy');
}

export function formatDateLong(date: Date): string {
  return format(date, 'EEEE, d MMMM yyyy');
}

// ============================================================================
// PRESET DATE RANGES (UK Financial Year: April - March)
// ============================================================================

export type DateRangePresetType =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'last_year'
  | 'year_to_date'
  | 'all_time';

export interface DateRangePresetOption {
  type: DateRangePresetType;
  label: string;
  getRange: () => { start: Date; end: Date };
}

function getFinancialYearStart(date: Date = new Date()): Date {
  const year = date.getFullYear();
  const month = date.getMonth();

  // If we're in Jan-Mar, FY started previous year
  // If we're in Apr-Dec, FY started this year
  const fyStartYear = month < 3 ? year - 1 : year;

  return new Date(fyStartYear, 3, 1); // April 1st
}

function getFinancialYearEnd(date: Date = new Date()): Date {
  const fyStart = getFinancialYearStart(date);
  return new Date(fyStart.getFullYear() + 1, 2, 31); // March 31st next year
}

export const DATE_RANGE_PRESETS: DateRangePresetOption[] = [
  {
    type: 'today',
    label: 'Today',
    getRange: () => {
      const today = new Date();
      return { start: today, end: today };
    }
  },
  {
    type: 'yesterday',
    label: 'Yesterday',
    getRange: () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: yesterday, end: yesterday };
    }
  },
  {
    type: 'last_7_days',
    label: 'Last 7 Days',
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 6);
      return { start, end };
    }
  },
  {
    type: 'last_30_days',
    label: 'Last 30 Days',
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 29);
      return { start, end };
    }
  },
  {
    type: 'this_month',
    label: 'This Month',
    getRange: () => {
      const now = new Date();
      const monthEnd = endOfMonth(now);
      // If month end is in the future, use today instead
      const end = monthEnd > now ? now : monthEnd;
      return {
        start: startOfMonth(now),
        end
      };
    }
  },
  {
    type: 'last_month',
    label: 'Last Month',
    getRange: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth)
      };
    }
  },
  {
    type: 'this_quarter',
    label: 'This Quarter',
    getRange: () => {
      const now = new Date();
      const quarterEnd = endOfQuarter(now);
      // If quarter end is in the future, use today instead
      const end = quarterEnd > now ? now : quarterEnd;
      return {
        start: startOfQuarter(now),
        end
      };
    }
  },
  {
    type: 'last_quarter',
    label: 'Last Quarter',
    getRange: () => {
      const lastQuarter = subQuarters(new Date(), 1);
      return {
        start: startOfQuarter(lastQuarter),
        end: endOfQuarter(lastQuarter)
      };
    }
  },
  {
    type: 'this_year',
    label: 'This Financial Year',
    getRange: () => {
      const now = new Date();
      const fyEnd = getFinancialYearEnd();
      // If FY end is in the future, use today instead
      const end = fyEnd > now ? now : fyEnd;
      return {
        start: getFinancialYearStart(),
        end
      };
    }
  },
  {
    type: 'last_year',
    label: 'Last Financial Year',
    getRange: () => {
      const lastYear = subYears(new Date(), 1);
      return {
        start: getFinancialYearStart(lastYear),
        end: getFinancialYearEnd(lastYear)
      };
    }
  },
  {
    type: 'year_to_date',
    label: 'Year to Date',
    getRange: () => {
      const today = new Date();
      return {
        start: getFinancialYearStart(today),
        end: today
      };
    }
  },
  {
    type: 'all_time',
    label: 'All Time',
    getRange: () => {
      return {
        start: new Date(2000, 0, 1), // Jan 1, 2000
        end: new Date()
      };
    }
  }
];

export function getPresetDateRange(type: DateRangePresetType): CustomDateRange {
  const preset = DATE_RANGE_PRESETS.find(p => p.type === type);
  if (!preset) {
    throw new Error(`Unknown preset type: ${type}`);
  }

  const { start, end } = preset.getRange();

  return {
    start,
    end,
    label: preset.label,
    preset: true
  };
}

// ============================================================================
// DATE RANGE COMPARISON
// ============================================================================

export function getPreviousPeriod(
  start: Date,
  end: Date,
  comparisonType: 'previous_period' | 'same_period_last_year' | 'custom'
): { start: Date; end: Date } {
  const daysDiff = differenceInDays(end, start);

  if (comparisonType === 'previous_period') {
    // Same number of days, immediately before
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);

    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - daysDiff);

    return { start: prevStart, end: prevEnd };
  }

  if (comparisonType === 'same_period_last_year') {
    // Same dates, one year earlier
    const prevStart = new Date(start);
    prevStart.setFullYear(prevStart.getFullYear() - 1);

    const prevEnd = new Date(end);
    prevEnd.setFullYear(prevEnd.getFullYear() - 1);

    return { start: prevStart, end: prevEnd };
  }

  // For 'custom', caller should provide their own dates
  throw new Error('Custom comparison type requires explicit start and end dates');
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

export function getDaysDifference(start: Date, end: Date): number {
  return differenceInDays(end, start) + 1; // +1 to include both start and end days
}

// ============================================================================
// DATE RANGE HELPERS
// ============================================================================

export function createCustomDateRange(
  start: Date,
  end: Date,
  label?: string
): CustomDateRange {
  const validation = validateDateRange(start, end);

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return {
    start,
    end,
    label: label || formatDateRange(start, end),
    preset: false
  };
}

export function dateRangeToString(range: CustomDateRange): string {
  return range.label || formatDateRange(range.start, range.end);
}

export function stringToDate(dateString: string): Date {
  // Handle various date formats
  // ISO format: YYYY-MM-DD
  // UK format: DD/MM/YYYY

  if (dateString.includes('-')) {
    // ISO format
    return new Date(dateString);
  }

  if (dateString.includes('/')) {
    // UK format: DD/MM/YYYY
    const [day, month, year] = dateString.split('/').map(Number);
    return new Date(year, month - 1, day);
  }

  // Fallback to standard Date parsing
  return new Date(dateString);
}
