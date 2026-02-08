'use client';

// Sprint 3: Transaction Drill-Down Header Component
// Purpose: Breadcrumb navigation and summary stats for drill-down

import React from 'react';
import { ArrowLeft, FileText, Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TransactionDrillDownHeaderProps {
  title: string;
  subtitle?: string;
  total: number;
  count: number;
  average: number;
  type: 'income' | 'expenditure' | 'capital';
  onClose: () => void;
  onExportCSV?: () => void;
  onPrint?: () => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function TransactionDrillDownHeader({
  title,
  subtitle,
  total,
  count,
  average,
  type,
  onClose,
  onExportCSV,
  onPrint,
}: TransactionDrillDownHeaderProps) {
  const bgColorClass =
    type === 'income' ? 'bg-green-50 border-green-200' :
    type === 'expenditure' ? 'bg-red-50 border-red-200' :
    'bg-purple-50 border-purple-200';

  const textColorClass =
    type === 'income' ? 'text-green-800' :
    type === 'expenditure' ? 'text-red-800' :
    'text-purple-800';

  return (
    <div className="space-y-4">
      {/* Breadcrumb & Action Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 px-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to P&L
        </Button>

        <div className="flex items-center gap-2 print:hidden">
          {onExportCSV && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportCSV}
              className="h-8"
            >
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          )}
          {onPrint && (
            <Button
              variant="outline"
              size="sm"
              onClick={onPrint}
              className="h-8"
            >
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
          )}
        </div>
      </div>

      {/* Title & Summary */}
      <div className={`rounded-lg border-2 p-4 ${bgColorClass}`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className={`text-xl font-bold ${textColorClass}`}>
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
          <FileText className={`h-6 w-6 ${textColorClass}`} />
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div>
            <p className="text-xs text-gray-600 mb-1">Total</p>
            <p className={`text-lg font-bold ${textColorClass}`}>
              {formatCurrency(total)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Transactions</p>
            <p className={`text-lg font-bold ${textColorClass}`}>
              {count.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Average</p>
            <p className={`text-lg font-bold ${textColorClass}`}>
              {formatCurrency(average)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
