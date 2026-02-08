'use client';

// Sprint 3: Transaction Drill-Down Main Component
// Purpose: Slide-over panel for viewing transaction details

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useDrillDownData } from '@/hooks/use-drill-down-data';
import { TransactionDrillDownHeader } from './transaction-drill-down-header';
import { TransactionDrillDownTable } from './transaction-drill-down-table';
import { TransactionDrillDownFilters } from './transaction-drill-down-filters';
import type { DrillDownContext, DrillDownFilters } from '@/lib/reports-types';

interface TransactionDrillDownProps {
  context: DrillDownContext | null;
  onClose: () => void;
}

export function TransactionDrillDown({
  context,
  onClose,
}: TransactionDrillDownProps) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<DrillDownFilters>({});
  const pageSize = 100;

  const { data, isLoading, error } = useDrillDownData({
    context,
    filters,
    page,
    pageSize,
    enabled: !!context,
  });

  const isOpen = !!context;

  const handleClose = () => {
    setPage(1); // Reset pagination on close
    setFilters({}); // Reset filters on close
    onClose();
  };

  const handleFiltersChange = (newFilters: DrillDownFilters) => {
    setFilters(newFilters);
    setPage(1); // Reset to page 1 when filters change
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (data && page < data.pagination.totalPages) {
      setPage(page + 1);
    }
  };

  const handleExportCSV = () => {
    if (!data || !context) return;

    // Generate filename
    const dateStr = new Date().toISOString().split('T')[0];
    const categoryOrHierarchy = context.categoryName || context.hierarchyName || 'transactions';
    const filename = `${categoryOrHierarchy.replace(/[^a-z0-9]/gi, '-')}_${dateStr}.csv`;

    // Build CSV content
    const headers = ['Date', 'Description', 'Category', 'Hierarchy', 'Amount'];
    const rows = data.transactions.map(tx => [
      tx.date,
      `"${tx.description.replace(/"/g, '""')}"`, // Escape quotes in description
      tx.category,
      tx.hierarchy,
      tx.amount.toFixed(2),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Determine title based on context
  const getTitle = () => {
    if (!context) return '';
    if (context.categoryName) return context.categoryName;
    if (context.hierarchyName) return context.hierarchyName;
    return 'Transaction Details';
  };

  const getSubtitle = () => {
    if (!context) return '';
    const { start, end } = context.dateRange;
    return `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} - ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-4xl overflow-y-auto"
        >
        {/* Accessibility: Required title and description */}
        <SheetHeader className="sr-only">
          <SheetTitle>{getTitle() || 'Transaction Details'}</SheetTitle>
        </SheetHeader>

        {/* Visual Header (always visible) */}
        {context && (
          <div className="mb-6">
            <TransactionDrillDownHeader
              title={getTitle()}
              subtitle={getSubtitle()}
              total={data?.summary.total || 0}
              count={data?.summary.count || 0}
              average={data?.summary.average || 0}
              type={context.type}
              onClose={handleClose}
              onExportCSV={handleExportCSV}
              onPrint={handlePrint}
            />
          </div>
        )}

        {/* Filters */}
        {context && (
          <TransactionDrillDownFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            minDate={context.dateRange.start}
            maxDate={context.dateRange.end}
          />
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-600">Loading transactions...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
              <p className="text-red-600 font-semibold">Failed to load transactions</p>
              <p className="text-gray-600 text-sm mt-2">
                {error instanceof Error ? error.message : 'An error occurred'}
              </p>
              <Button
                onClick={() => setPage(1)}
                variant="outline"
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* Transaction Table */}
        {!isLoading && !error && data && context && (
          <div className="space-y-4">
            <TransactionDrillDownTable
              transactions={data.transactions}
              type={context.type}
            />

            {/* Pagination */}
            {data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t pt-4 print:hidden">
                <div className="text-sm text-gray-600">
                  Showing {((page - 1) * pageSize) + 1}-
                  {Math.min(page * pageSize, data.pagination.totalCount)} of {data.pagination.totalCount.toLocaleString()} transactions
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handlePreviousPage}
                    disabled={page === 1}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {page} of {data.pagination.totalPages}
                  </span>
                  <Button
                    onClick={handleNextPage}
                    disabled={page === data.pagination.totalPages}
                    variant="outline"
                    size="sm"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && data && data.transactions.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-semibold">No transactions found</p>
            <p className="text-gray-500 text-sm mt-2">
              There are no transactions matching your criteria.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
