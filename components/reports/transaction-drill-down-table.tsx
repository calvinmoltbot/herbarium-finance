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
        <p className="text-muted-foreground">No transactions found</p>
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
          <tr className="border-b-2 border-border">
            <th className="text-left py-3 px-4 font-semibold text-sm text-foreground">
              Date
            </th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-foreground">
              Description
            </th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-foreground">
              Category
            </th>
            <th className="text-left py-3 px-4 font-semibold text-sm text-foreground">
              Hierarchy
            </th>
            <th className="text-right py-3 px-4 font-semibold text-sm text-foreground">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx, index) => (
            <tr
              key={tx.id}
              className={`border-b border-border hover:bg-muted transition-colors ${
                index % 2 === 0 ? 'bg-card' : 'bg-muted/50'
              }`}
            >
              <td className="py-3 px-4 text-sm text-muted-foreground">
                {formatDate(tx.date)}
              </td>
              <td className="py-3 px-4 text-sm text-foreground">
                {tx.description || '—'}
              </td>
              <td className="py-3 px-4 text-sm">
                <Badge variant="secondary" className="text-xs">
                  {tx.category}
                </Badge>
              </td>
              <td className="py-3 px-4 text-sm text-muted-foreground">
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
