import { LOCALE, CURRENCY } from './constants';

/**
 * Format a number as GBP currency (e.g. "£1,234.56").
 * Negative values are shown with a minus sign.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number as a percentage (e.g. "12.5%").
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value >= 0 ? '' : ''}${value.toFixed(decimals)}%`;
}

/**
 * Format a date string to UK format (DD/MM/YYYY).
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(LOCALE);
}

/**
 * Format a number with locale grouping (e.g. "1,234").
 */
export function formatNumber(value: number): string {
  return value.toLocaleString(LOCALE);
}
