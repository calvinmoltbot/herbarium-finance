// Sprint 3: Transaction Drill-Down Hook
// Added: 2025-01-24
// Purpose: TanStack Query hook for fetching transaction drill-down data

import { useQuery } from '@tanstack/react-query';
import { reportDataEngine } from '@/lib/reports-data-engine';
import type { DrillDownContext, DrillDownData, DrillDownFilters } from '@/lib/reports-types';

export interface UseDrillDownDataOptions {
  context: DrillDownContext | null;
  filters?: DrillDownFilters;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export function useDrillDownData({
  context,
  filters,
  page = 1,
  pageSize = 100,
  enabled = true,
}: UseDrillDownDataOptions) {
  return useQuery<DrillDownData>({
    queryKey: ['drill-down-data', context, filters, page, pageSize],
    queryFn: async () => {
      if (!context) {
        throw new Error('DrillDownContext is required');
      }

      return await reportDataEngine.getDrillDownData(
        context,
        filters,
        page,
        pageSize
      );
    },
    enabled: enabled && !!context,
    staleTime: 60 * 1000, // 60 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
  });
}
