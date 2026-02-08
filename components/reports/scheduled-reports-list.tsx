'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  Play, 
  Pause, 
  Trash2, 
  Edit,
  Mail,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useScheduleMutations } from '@/hooks/use-reports';
import { ScheduledReport } from '@/lib/reports-types';

interface ScheduledReportsListProps {
  scheduledReports: ScheduledReport[];
  isLoading: boolean;
}

export function ScheduledReportsList({ scheduledReports, isLoading }: ScheduledReportsListProps) {
  const { toggleSchedule, deleteSchedule } = useScheduleMutations();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleToggle = async (scheduleId: string, currentStatus: boolean) => {
    setTogglingId(scheduleId);
    try {
      await toggleSchedule.mutateAsync({
        scheduleId,
        isActive: !currentStatus,
      });
    } catch (error) {
      console.error('Failed to toggle schedule:', error);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this scheduled report?')) return;
    
    setDeletingId(scheduleId);
    try {
      await deleteSchedule.mutateAsync(scheduleId);
    } catch (error) {
      console.error('Failed to delete schedule:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      case 'monthly':
        return 'Monthly';
      case 'quarterly':
        return 'Quarterly';
      case 'yearly':
        return 'Yearly';
      default:
        return frequency;
    }
  };

  const getNextRunDisplay = (nextRun?: string) => {
    if (!nextRun) return 'Not scheduled';
    
    const date = new Date(nextRun);
    const now = new Date();
    
    if (date < now) return 'Overdue';
    
    return format(date, 'MMM d, yyyy HH:mm');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
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

  if (scheduledReports.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No scheduled reports
        </h3>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          Schedule reports to be automatically generated and delivered on a regular basis. 
          Perfect for monthly financial summaries or weekly updates.
        </p>
        <Button variant="outline">
          <Calendar className="w-4 h-4 mr-2" />
          Schedule Your First Report
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {scheduledReports.map((schedule) => (
        <Card key={schedule.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  {(schedule as any).report?.name || 'Unknown Report'}
                </CardTitle>
                <CardDescription className="mt-1">
                  {(schedule as any).report?.description || 'No description available'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={schedule.is_active}
                  onCheckedChange={() => handleToggle(schedule.id, schedule.is_active)}
                  disabled={togglingId === schedule.id}
                />
                <Badge variant={schedule.is_active ? 'default' : 'secondary'}>
                  {schedule.is_active ? 'Active' : 'Paused'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Schedule Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Frequency:</span>
                  <Badge variant="outline">
                    {getFrequencyLabel(schedule.schedule_config.frequency)}
                  </Badge>
                </div>
                
                {schedule.schedule_config.time && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">Time:</span>
                    <span>{schedule.schedule_config.time}</span>
                  </div>
                )}

                {schedule.schedule_config.emailRecipients && 
                 schedule.schedule_config.emailRecipients.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">Recipients:</span>
                    <span>{schedule.schedule_config.emailRecipients.length}</span>
                  </div>
                )}
              </div>

              {/* Run Information */}
              <div className="space-y-3">
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Next Run:</span>
                    <span className="font-medium">
                      {getNextRunDisplay(schedule.next_run)}
                    </span>
                  </div>
                </div>

                {schedule.last_run && (
                  <div className="text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Run:</span>
                      <span>{format(new Date(schedule.last_run), 'MMM d, yyyy HH:mm')}</span>
                    </div>
                  </div>
                )}

                <div className="text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Created:</span>
                    <span>{format(new Date(schedule.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Export Formats */}
            {schedule.schedule_config.format && 
             schedule.schedule_config.format.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Export Formats:</span>
                  <div className="flex gap-1">
                    {schedule.schedule_config.format.map((format) => (
                      <Badge key={format} variant="outline" className="text-xs">
                        {format.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <Button variant="outline" size="sm">
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleToggle(schedule.id, schedule.is_active)}
                disabled={togglingId === schedule.id}
              >
                {schedule.is_active ? (
                  <>
                    <Pause className="w-3 h-3 mr-1" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 mr-1" />
                    Resume
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-red-600 hover:text-red-700"
                onClick={() => handleDelete(schedule.id)}
                disabled={deletingId === schedule.id}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                {deletingId === schedule.id ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
