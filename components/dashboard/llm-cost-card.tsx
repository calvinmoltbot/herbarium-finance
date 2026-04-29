'use client';

import { Mail, Sparkles, Coins } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useLlmUsage } from '@/hooks/use-llm-usage';

function fmtUsd(n: number): string {
  if (n === 0) return '$0.00';
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

export function LlmCostCard() {
  const { data, isLoading, error } = useLlmUsage();

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
  if (data.lifetimeCalls === 0) return null;

  return (
    <Card style={{ backgroundColor: '#1e1c27', borderColor: 'transparent' }} className="ring-1 ring-white/5">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {/* This month */}
          <div className="flex items-center gap-3">
            <div className="rounded-md p-2" style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)' }}>
              <Coins className="h-4 w-4" style={{ color: '#38bdf8' }} />
            </div>
            <div>
              <div className="text-xs" style={{ color: '#9794a8' }}>
                Gmail AI cost · this month
              </div>
              <div className="text-lg font-semibold tabular-nums" style={{ color: '#38bdf8' }}>
                {fmtUsd(data.monthCost)}
              </div>
              <div className="text-[11px]" style={{ color: '#9794a8' }}>
                {data.monthCalls} {data.monthCalls === 1 ? 'classification' : 'classifications'}
              </div>
            </div>
          </div>

          {/* Lifetime */}
          <div className="flex items-center gap-3">
            <div className="rounded-md p-2" style={{ backgroundColor: 'rgba(151, 148, 168, 0.1)' }}>
              <Mail className="h-4 w-4" style={{ color: '#9794a8' }} />
            </div>
            <div>
              <div className="text-xs" style={{ color: '#9794a8' }}>
                Lifetime
              </div>
              <div className="text-lg font-semibold tabular-nums" style={{ color: '#cfcdd9' }}>
                {fmtUsd(data.lifetimeCost)}
              </div>
              <div className="text-[11px]" style={{ color: '#9794a8' }}>
                {data.lifetimeCalls} {data.lifetimeCalls === 1 ? 'call' : 'calls'}
              </div>
            </div>
          </div>

          {/* Matched */}
          <div className="flex items-center gap-3">
            <div className="rounded-md p-2" style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)' }}>
              <Sparkles className="h-4 w-4" style={{ color: '#a855f7' }} />
            </div>
            <div>
              <div className="text-xs" style={{ color: '#9794a8' }}>
                Matched to transactions
              </div>
              <div className="text-lg font-semibold tabular-nums" style={{ color: '#a855f7' }}>
                {data.matchedTransactions}
              </div>
              <div className="text-[11px]" style={{ color: '#9794a8' }}>
                Surfaced as suggestions
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
