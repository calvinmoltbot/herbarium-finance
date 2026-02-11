'use client';

import { SelfAssessmentReport } from '@/components/reports/self-assessment-report';
import { PageLayout } from '@/components/ui/page-layout';
import { FileSpreadsheet, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function SelfAssessmentPage() {
  return (
    <PageLayout
      title="Self Assessment Tax Summary"
      description="UK Self Assessment (SA103) tax summary for sole traders. Review income, expenses, and estimated tax liability for the tax year."
      icon={FileSpreadsheet}
      actions={
        <Link href="/reports">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Reports
          </Button>
        </Link>
      }
    >
      <SelfAssessmentReport className="w-full" />
    </PageLayout>
  );
}
