'use client';

import { useParams } from 'next/navigation';
import { ArrowLeft, Download, Edit, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PageLayout } from '@/components/ui/page-layout';
import { SimpleReportViewer } from '@/components/reports/simple-report-viewer';

function ReportViewPage() {
  const params = useParams();
  const reportId = params.id as string;

  const headerActions = (
    <>
      <Link href="/reports">
        <Button variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Reports
        </Button>
      </Link>
      
      <Button variant="outline">
        <Edit className="w-4 h-4 mr-2" />
        Edit Report
      </Button>
      
      <Button variant="outline">
        <Download className="w-4 h-4 mr-2" />
        Export
      </Button>
    </>
  );

  return (
    <PageLayout
      title="Financial Report"
      description={`Detailed financial analysis and insights for Report ID: ${reportId}`}
      icon={BarChart3}
      actions={headerActions}
    >
      {/* Report Viewer */}
      <SimpleReportViewer 
        reportId={reportId}
        initialConfig={{
          name: `Financial Report ${reportId}`,
        }}
      />
    </PageLayout>
  );
}

export default ReportViewPage;
