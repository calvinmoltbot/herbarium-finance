'use client';

import { HierarchicalPLReport } from '@/components/reports';
import { PageLayout } from '@/components/ui/page-layout';
import { TrendingUp, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function StandardPLPage() {
  return (
    <PageLayout
      title="Standard Hierarchical P&L"
      description="Professional Profit & Loss report with collapsible hierarchies showing Net Operating Profit and Profit After Capital Movements"
      icon={TrendingUp}
      actions={
        <Link href="/reports">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Reports
          </Button>
        </Link>
      }
    >
      <HierarchicalPLReport className="w-full" />
    </PageLayout>
  );
}
