'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { 
  FileText, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Download, 
  Calendar,
  Eye,
  Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useReportMutations } from '@/hooks/use-reports';
import { Report } from '@/lib/reports-types';

interface ReportsListProps {
  reports: Report[];
  isLoading: boolean;
  onCreateReport: () => void;
}

export function ReportsList({ reports, isLoading, onCreateReport }: ReportsListProps) {
  const router = useRouter();
  const { deleteReport } = useReportMutations();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    
    setDeletingId(reportId);
    try {
      await deleteReport.mutateAsync(reportId);
    } catch (error) {
      console.error('Failed to delete report:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleView = (reportId: string) => {
    // Navigate to report view page in same window
    router.push(`/reports/${reportId}`);
  };

  const handleEdit = (reportId: string) => {
    // Navigate to report edit page
    router.push(`/reports/${reportId}/edit`);
  };

  const handleDownload = (reportId: string) => {
    // Trigger report download
    console.log('Download report:', reportId);
  };

  const handleSchedule = (reportId: string) => {
    // Open schedule dialog
    console.log('Schedule report:', reportId);
  };

  const handleDuplicate = (reportId: string) => {
    // Duplicate report
    console.log('Duplicate report:', reportId);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No reports yet
        </h3>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          Get started by creating your first custom report. Choose from our templates 
          or build one from scratch.
        </p>
        <Button onClick={onCreateReport}>
          <FileText className="w-4 h-4 mr-2" />
          Create Your First Report
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {reports.map((report) => (
        <Card key={report.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg line-clamp-1">
                  {report.name}
                </CardTitle>
                <CardDescription className="line-clamp-2 mt-1">
                  {report.description || 'No description provided'}
                </CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleView(report.id)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Report
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleEdit(report.id)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicate(report.id)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleDownload(report.id)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSchedule(report.id)}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => handleDelete(report.id)}
                    className="text-red-600"
                    disabled={deletingId === report.id}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {deletingId === report.id ? 'Deleting...' : 'Delete'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* Report Type Badge */}
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {report.config.type.replace('_', ' ').toUpperCase()}
                </Badge>
                {report.template_id && (
                  <Badge variant="outline">
                    From Template
                  </Badge>
                )}
              </div>

              {/* Report Stats */}
              <div className="text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Sections:</span>
                  <span>{report.config.sections?.length || 0}</span>
                </div>
                {report.config.charts && report.config.charts.length > 0 && (
                  <div className="flex justify-between">
                    <span>Charts:</span>
                    <span>{report.config.charts.length}</span>
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="text-xs text-gray-500 space-y-1">
                <div>Created: {format(new Date(report.created_at), 'MMM d, yyyy')}</div>
                <div>Updated: {format(new Date(report.updated_at), 'MMM d, yyyy')}</div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => handleView(report.id)}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleDownload(report.id)}
                >
                  <Download className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
