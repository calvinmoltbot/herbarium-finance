'use client';

import { ArrowDownRight, ArrowUpRight, Scale } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { usePersonalBalance } from '@/hooks/use-personal-balance';

function formatCurrency(amount: number): string {
  return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;
}

export function PersonalBalanceCard() {
  const { data, isLoading, error } = usePersonalBalance();

  if (isLoading) {
    return (
      <Card style={{ backgroundColor: '#1e1c27', borderColor: 'transparent' }} className="ring-1 ring-white/5">
        <CardContent className="p-4">
          <div className="h-12 bg-muted/30 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) return null;

  const { spend, repayment, net, spendCount, repaymentCount } = data;

  // Hide the card entirely if there's no personal activity in this period.
  if (spendCount === 0 && repaymentCount === 0) return null;

  const balanced = Math.abs(net) < 0.01;
  const netColor = balanced ? '#9794a8' : '#f59e0b';

  return (
    <Card style={{ backgroundColor: '#1e1c27', borderColor: 'transparent' }} className="ring-1 ring-white/5">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {/* Spend */}
          <div className="flex items-center gap-3">
            <div className="rounded-md p-2" style={{ backgroundColor: 'rgba(244, 63, 94, 0.1)' }}>
              <ArrowDownRight className="h-4 w-4" style={{ color: '#f43f5e' }} />
            </div>
            <div>
              <div className="text-xs" style={{ color: '#9794a8' }}>
                Personal Spend
              </div>
              <div className="text-lg font-semibold tabular-nums" style={{ color: '#f43f5e' }}>
                {formatCurrency(spend)}
              </div>
              <div className="text-[11px]" style={{ color: '#9794a8' }}>
                {spendCount} {spendCount === 1 ? 'item' : 'items'}
              </div>
            </div>
          </div>

          {/* Repayment */}
          <div className="flex items-center gap-3">
            <div className="rounded-md p-2" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
              <ArrowUpRight className="h-4 w-4" style={{ color: '#10b981' }} />
            </div>
            <div>
              <div className="text-xs" style={{ color: '#9794a8' }}>
                Personal Repayment
              </div>
              <div className="text-lg font-semibold tabular-nums" style={{ color: '#10b981' }}>
                {formatCurrency(repayment)}
              </div>
              <div className="text-[11px]" style={{ color: '#9794a8' }}>
                {repaymentCount} {repaymentCount === 1 ? 'item' : 'items'}
              </div>
            </div>
          </div>

          {/* Net */}
          <div className="flex items-center gap-3">
            <div
              className="rounded-md p-2"
              style={{ backgroundColor: balanced ? 'rgba(151, 148, 168, 0.1)' : 'rgba(245, 158, 11, 0.12)' }}
            >
              <Scale className="h-4 w-4" style={{ color: netColor }} />
            </div>
            <div>
              <div className="text-xs" style={{ color: '#9794a8' }}>
                Net imbalance
              </div>
              <div className="text-lg font-semibold tabular-nums" style={{ color: netColor }}>
                {formatCurrency(net)}
              </div>
              <div className="text-[11px]" style={{ color: balanced ? '#9794a8' : '#f59e0b' }}>
                {balanced ? 'Balanced' : 'Needs repayment matching'}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
