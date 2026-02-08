'use client';

import { GitCompare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { ComparisonType, CustomDateRange, PeriodComparisonConfig } from '@/lib/types';
import { formatDateRange, getPreviousPeriod } from '@/lib/date-range-utils';

export interface ComparisonSelectorProps {
  currentPeriod: CustomDateRange;
  comparisonConfig: PeriodComparisonConfig | null;
  onChange: (config: PeriodComparisonConfig | null) => void;
  className?: string;
}

export function ComparisonSelector({
  currentPeriod,
  comparisonConfig,
  onChange,
  className
}: ComparisonSelectorProps) {
  const handleEnable = () => {
    // Auto-calculate previous period
    const previousPeriod = getPreviousPeriod(
      currentPeriod.start,
      currentPeriod.end,
      'previous_period'
    );

    onChange({
      enabled: true,
      currentPeriod,
      comparisonPeriod: {
        start: previousPeriod.start,
        end: previousPeriod.end,
        label: formatDateRange(previousPeriod.start, previousPeriod.end),
        preset: false
      },
      comparisonType: 'previous_period'
    });
  };

  const handleDisable = () => {
    onChange(null);
  };

  const handleComparisonTypeChange = (type: ComparisonType) => {
    if (!comparisonConfig) return;

    if (type === 'custom') {
      // For custom, keep current comparison period
      onChange({
        ...comparisonConfig,
        comparisonType: type
      });
    } else {
      // Auto-calculate comparison period
      const comparisonPeriod = getPreviousPeriod(
        currentPeriod.start,
        currentPeriod.end,
        type
      );

      onChange({
        ...comparisonConfig,
        comparisonPeriod: {
          start: comparisonPeriod.start,
          end: comparisonPeriod.end,
          label: formatDateRange(comparisonPeriod.start, comparisonPeriod.end),
          preset: false
        },
        comparisonType: type
      });
    }
  };

  if (!comparisonConfig) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleEnable}
        className={className}
      >
        <GitCompare className="h-4 w-4 mr-2" />
        Enable Comparison
      </Button>
    );
  }

  return (
    <Card className={`p-3 ${className}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <GitCompare className="h-4 w-4 text-blue-600" />
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Period Comparison</span>
              <Badge variant="secondary" className="text-xs">
                Active
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Comparing to: {comparisonConfig.comparisonPeriod.label}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={comparisonConfig.comparisonType}
            onValueChange={(value) => handleComparisonTypeChange(value as ComparisonType)}
          >
            <SelectTrigger className="w-48 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="previous_period">
                Previous Period
              </SelectItem>
              <SelectItem value="same_period_last_year">
                Same Period Last Year
              </SelectItem>
              <SelectItem value="custom" disabled>
                Custom Period (Coming Soon)
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisable}
            className="h-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
