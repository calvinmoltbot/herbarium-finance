'use client';

// Sprint 3: Transaction Drill-Down Table Component
// Purpose: Display transaction list with UK formatting

import { format } from 'date-fns';
import type { TransactionDetail } from '@/lib/reports-types';
import { Badge } from '@/components/ui/badge';

interface TransactionDrillDownTableProps {
  transactions: TransactionDetail[];
  type: 'income' | 'expenditure' | 'capital';
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateString: string): string {
  try {
    return format(new Date(dateString), 'dd/MM/yyyy');
  } catch {
    return dateString;
  }
}

export function TransactionDrillDownTable({
  transactions,
  type,
}: TransactionDrillDownTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No transactions found</p>
      </div>
    );
  }

  const amountColorClass =
    type === 'income' ? 'text-green-700' :
    type === 'expenditure' ? 'text-red-700' :
    'text-purple-700';

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">
              Date
            </th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">
              Description
            </th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">
              Category
            </th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">
              Hierarchy
            </th>
            <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx, index) => (
            <tr
              key={tx.id}
              className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
              }`}
            >
              <td className="py-3 px-4 text-sm text-gray-600">
                {formatDate(tx.date)}
              </td>
              <td className="py-3 px-4 text-sm text-gray-900">
                {tx.description || '—'}
              </td>
              <td className="py-3 px-4 text-sm">
                <Badge variant="secondary" className="text-xs">
                  {tx.category}
                </Badge>
              </td>
              <td className="py-3 px-4 text-sm text-gray-600">
                {tx.hierarchy}
              </td>
              <td className={`py-3 px-4 text-sm font-semibold text-right ${amountColorClass}`}>
                {formatCurrency(tx.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
