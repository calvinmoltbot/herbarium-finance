'use client';

import { CashFlowReport } from '@/components/reports/cash-flow-report';
import { PageLayout } from '@/components/ui/page-layout';
import { BarChart3, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CashFlowPage() {
  return (
    <PageLayout
      title="Cash Flow Statement"
      description="Daily cash flow analysis showing income, expenditure, and running balance over time"
      icon={BarChart3}
      actions={
        <Link href="/reports">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Reports
          </Button>
        </Link>
      }
    >
      <CashFlowReport className="w-full" />
    </PageLayout>
  );
}
