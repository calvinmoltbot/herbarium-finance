'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import type {
  Report,
  ReportTemplate,
  ScheduledReport,
  CreateReportRequest,
  UpdateReportRequest,
  CreateTemplateRequest,
  ScheduleReportRequest,
  ReportData,
  ReportFilters,
} from '@/lib/reports-types';

// =====================================================
// REPORTS CRUD OPERATIONS
// =====================================================

export function useReports() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['reports', user?.id],
    queryFn: async (): Promise<Report[]> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useReport(reportId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['report', reportId, user?.id],
    queryFn: async (): Promise<Report> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      if (!reportId) {
        throw new Error('Report ID is required');
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!reportId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useReportMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createReport = useMutation({
    mutationFn: async (data: CreateReportRequest): Promise<Report> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      const { data: report, error } = await supabase
        .from('reports')
        .insert({
          name: data.name,
          description: data.description,
          config: data.config,
          template_id: data.template_id,
        })
        .select()
        .single();

      if (error) throw error;
      return report;
    },
    onSuccess: (newReport) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(`Report "${newReport.name}" created successfully!`);
    },
    onError: (error: any) => {
      console.error('Error creating report:', error);
      toast.error('Failed to create report. Please try again.');
    },
  });

  const updateReport = useMutation({
    mutationFn: async (data: UpdateReportRequest): Promise<Report> => {
      if (!user?.id) throw new Error('User not authenticated');

      const supabase = createClient();
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.config !== undefined) updateData.config = data.config;
      updateData.updated_at = new Date().toISOString();

      const { data: report, error } = await supabase
        .from('reports')
        .update(updateData)
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return report;
    },
    onSuccess: (updatedReport) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['report', updatedReport.id] });
      toast.success(`Report "${updatedReport.name}" updated successfully!`);
    },
    onError: (error: any) => {
      console.error('Error updating report:', error);
      toast.error('Failed to update report. Please try again.');
    },
  });

  const deleteReport = useMutation({
    mutationFn: async (reportId: string): Promise<void> => {
      if (!user?.id) throw new Error('User not authenticated');

      const supabase = createClient();
      
      // First delete any scheduled reports
      await supabase
        .from('scheduled_reports')
        .delete()
        .eq('report_id', reportId);

      // Then delete the report
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      toast.success('Report deleted successfully!');
    },
    onError: (error: any) => {
      console.error('Error deleting report:', error);
      toast.error('Failed to delete report. Please try again.');
    },
  });

  return {
    createReport,
    updateReport,
    deleteReport,
  };
}

// =====================================================
// REPORT TEMPLATES
// =====================================================

export function useReportTemplates(systemOnly?: boolean) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['report-templates', systemOnly, user?.id],
    queryFn: async (): Promise<ReportTemplate[]> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      let query = supabase
        .from('report_templates')
        .select('*')
        .order('name');

      if (systemOnly) {
        query = query.eq('is_system', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes (templates change less frequently)
  });
}

export function useReportTemplate(templateId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['report-template', templateId, user?.id],
    queryFn: async (): Promise<ReportTemplate> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      if (!templateId) {
        throw new Error('Template ID is required');
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!templateId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useTemplateMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createTemplate = useMutation({
    mutationFn: async (data: CreateTemplateRequest): Promise<ReportTemplate> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      const { data: template, error } = await supabase
        .from('report_templates')
        .insert({
          name: data.name,
          description: data.description,
          config: data.config,
          is_system: false, // User-created templates are never system templates
        })
        .select()
        .single();

      if (error) throw error;
      return template;
    },
    onSuccess: (newTemplate) => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      toast.success(`Template "${newTemplate.name}" created successfully!`);
    },
    onError: (error: any) => {
      console.error('Error creating template:', error);
      toast.error('Failed to create template. Please try again.');
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ templateId, data }: { templateId: string; data: Partial<CreateTemplateRequest> }): Promise<ReportTemplate> => {
      if (!user?.id) throw new Error('User not authenticated');

      const supabase = createClient();
      const { data: template, error } = await supabase
        .from('report_templates')
        .update(data)
        .eq('id', templateId)
        .eq('is_system', false) // Only allow updating user-created templates
        .select()
        .single();

      if (error) throw error;
      return template;
    },
    onSuccess: (updatedTemplate) => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      queryClient.invalidateQueries({ queryKey: ['report-template', updatedTemplate.id] });
      toast.success(`Template "${updatedTemplate.name}" updated successfully!`);
    },
    onError: (error: any) => {
      console.error('Error updating template:', error);
      toast.error('Failed to update template. Please try again.');
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (templateId: string): Promise<void> => {
      if (!user?.id) throw new Error('User not authenticated');

      const supabase = createClient();
      
      // Check if template is in use by reports
      const { data: reports, error: checkError } = await supabase
        .from('reports')
        .select('id')
        .eq('template_id', templateId)
        .limit(1);

      if (checkError) throw checkError;

      if (reports && reports.length > 0) {
        throw new Error('Cannot delete template that is in use by reports.');
      }

      // Delete the template (only user-created templates)
      const { error } = await supabase
        .from('report_templates')
        .delete()
        .eq('id', templateId)
        .eq('is_system', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      toast.success('Template deleted successfully!');
    },
    onError: (error: any) => {
      console.error('Error deleting template:', error);
      if (error.message.includes('in use')) {
        toast.error('Cannot delete template that is in use by reports');
      } else {
        toast.error('Failed to delete template. Please try again.');
      }
    },
  });

  const createReportFromTemplate = useMutation({
    mutationFn: async ({ templateId, name, description }: { templateId: string; name: string; description?: string }): Promise<Report> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      
      // Get template config
      const { data: template, error: templateError } = await supabase
        .from('report_templates')
        .select('config')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      // Create report from template
      const { data: report, error } = await supabase
        .from('reports')
        .insert({
          name,
          description,
          config: template.config,
          template_id: templateId,
        })
        .select()
        .single();

      if (error) throw error;
      return report;
    },
    onSuccess: (newReport) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(`Report "${newReport.name}" created from template successfully!`);
    },
    onError: (error: any) => {
      console.error('Error creating report from template:', error);
      toast.error('Failed to create report from template. Please try again.');
    },
  });

  return {
    createTemplate,
    updateTemplate,
    deleteTemplate,
    createReportFromTemplate,
  };
}

// =====================================================
// SCHEDULED REPORTS
// =====================================================

export function useScheduledReports() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['scheduled-reports', user?.id],
    queryFn: async (): Promise<ScheduledReport[]> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from('scheduled_reports')
        .select(`
          *,
          report:reports(name, description)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useScheduleMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const scheduleReport = useMutation({
    mutationFn: async (data: ScheduleReportRequest): Promise<ScheduledReport> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      const { data: scheduledReport, error } = await supabase
        .from('scheduled_reports')
        .insert({
          report_id: data.report_id,
          schedule_config: data.schedule_config,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return scheduledReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      toast.success('Report scheduled successfully!');
    },
    onError: (error: any) => {
      console.error('Error scheduling report:', error);
      toast.error('Failed to schedule report. Please try again.');
    },
  });

  const updateSchedule = useMutation({
    mutationFn: async ({ scheduleId, data }: { scheduleId: string; data: Partial<ScheduleReportRequest> }): Promise<ScheduledReport> => {
      if (!user?.id) throw new Error('User not authenticated');

      const supabase = createClient();
      const { data: scheduledReport, error } = await supabase
        .from('scheduled_reports')
        .update(data)
        .eq('id', scheduleId)
        .select()
        .single();

      if (error) throw error;
      return scheduledReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      toast.success('Schedule updated successfully!');
    },
    onError: (error: any) => {
      console.error('Error updating schedule:', error);
      toast.error('Failed to update schedule. Please try again.');
    },
  });

  const deleteSchedule = useMutation({
    mutationFn: async (scheduleId: string): Promise<void> => {
      if (!user?.id) throw new Error('User not authenticated');

      const supabase = createClient();
      const { error } = await supabase
        .from('scheduled_reports')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      toast.success('Schedule deleted successfully!');
    },
    onError: (error: any) => {
      console.error('Error deleting schedule:', error);
      toast.error('Failed to delete schedule. Please try again.');
    },
  });

  const toggleSchedule = useMutation({
    mutationFn: async ({ scheduleId, isActive }: { scheduleId: string; isActive: boolean }): Promise<ScheduledReport> => {
      if (!user?.id) throw new Error('User not authenticated');

      const supabase = createClient();
      const { data: scheduledReport, error } = await supabase
        .from('scheduled_reports')
        .update({ is_active: isActive })
        .eq('id', scheduleId)
        .select()
        .single();

      if (error) throw error;
      return scheduledReport;
    },
    onSuccess: (scheduledReport) => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      toast.success(`Schedule ${scheduledReport.is_active ? 'activated' : 'deactivated'} successfully!`);
    },
    onError: (error: any) => {
      console.error('Error toggling schedule:', error);
      toast.error('Failed to toggle schedule. Please try again.');
    },
  });

  return {
    scheduleReport,
    updateSchedule,
    deleteSchedule,
    toggleSchedule,
  };
}

// =====================================================
// REPORT STATISTICS
// =====================================================

export function useReportStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['report-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const supabase = createClient();
      
      // Get counts
      const [reportsResult, templatesResult, scheduledResult] = await Promise.all([
        supabase.from('reports').select('id', { count: 'exact', head: true }),
        supabase.from('report_templates').select('id', { count: 'exact', head: true }),
        supabase.from('scheduled_reports').select('id', { count: 'exact', head: true }),
      ]);

      // Get recent reports
      const { data: recentReports } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      // Get popular templates (system templates)
      const { data: popularTemplates } = await supabase
        .from('report_templates')
        .select('*')
        .eq('is_system', true)
        .order('name');

      return {
        totalReports: reportsResult.count || 0,
        totalTemplates: templatesResult.count || 0,
        totalScheduled: scheduledResult.count || 0,
        recentReports: recentReports || [],
        popularTemplates: popularTemplates || [],
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
