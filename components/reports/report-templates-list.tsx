'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { 
  BarChart3, 
  FileText, 
  Plus, 
  Star,
  TrendingUp,
  PieChart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTemplateMutations } from '@/hooks/use-reports';
import { ReportTemplate } from '@/lib/reports-types';

interface ReportTemplatesListProps {
  templates: ReportTemplate[];
  isLoading: boolean;
  onCreateFromTemplate: () => void;
}

const getTemplateIcon = (type: string) => {
  switch (type) {
    case 'profit_loss':
      return TrendingUp;
    case 'cash_flow':
      return BarChart3;
    case 'category_analysis':
      return PieChart;
    case 'transaction_detail':
      return FileText;
    default:
      return BarChart3;
  }
};

const getTemplateColor = (type: string) => {
  switch (type) {
    case 'profit_loss':
      return 'text-green-600 bg-green-50';
    case 'cash_flow':
      return 'text-blue-600 bg-blue-50';
    case 'category_analysis':
      return 'text-purple-600 bg-purple-50';
    case 'transaction_detail':
      return 'text-orange-600 bg-orange-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

export function ReportTemplatesList({ templates, isLoading }: ReportTemplatesListProps) {
  const { createReportFromTemplate } = useTemplateMutations();
  const [creatingFromTemplate, setCreatingFromTemplate] = useState<string | null>(null);

  const handleCreateFromTemplate = async (template: ReportTemplate) => {
    const reportName = prompt(`Enter a name for your new report based on "${template.name}":`);
    if (!reportName) return;

    setCreatingFromTemplate(template.id);
    try {
      await createReportFromTemplate.mutateAsync({
        templateId: template.id,
        name: reportName,
        description: `Report based on ${template.name} template`,
      });
    } catch (error) {
      console.error('Failed to create report from template:', error);
    } finally {
      setCreatingFromTemplate(null);
    }
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

  if (templates.length === 0) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No templates available
        </h3>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          Report templates help you quickly create standardized reports. 
          System templates will be available once the database is set up.
        </p>
      </div>
    );
  }

  // Separate system and user templates
  const systemTemplates = templates.filter(t => t.is_system);
  const userTemplates = templates.filter(t => !t.is_system);

  return (
    <div className="space-y-8">
      {/* System Templates */}
      {systemTemplates.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-semibold">System Templates</h3>
            <Badge variant="secondary">Recommended</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {systemTemplates.map((template) => {
              const Icon = getTemplateIcon(template.config.type);
              const colorClass = getTemplateColor(template.config.type);
              
              return (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-1">
                          {template.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-2 mt-1">
                          {template.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {/* Template Type */}
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {template.config.type.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <Badge variant="secondary">
                          <Star className="w-3 h-3 mr-1" />
                          System
                        </Badge>
                      </div>

                      {/* Template Features */}
                      <div className="text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Sections:</span>
                          <span>{template.config.sections?.length || 0}</span>
                        </div>
                        {template.config.charts && template.config.charts.length > 0 && (
                          <div className="flex justify-between">
                            <span>Charts:</span>
                            <span>{template.config.charts.length}</span>
                          </div>
                        )}
                        {template.config.defaultFilters && (
                          <div className="flex justify-between">
                            <span>Default Range:</span>
                            <span className="capitalize">
                              {String(template.config.defaultFilters.dateRange).replace('_', ' ')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <Button 
                        className="w-full"
                        onClick={() => handleCreateFromTemplate(template)}
                        disabled={creatingFromTemplate === template.id}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {creatingFromTemplate === template.id 
                          ? 'Creating...' 
                          : 'Use This Template'
                        }
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* User Templates */}
      {userTemplates.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold">My Templates</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {userTemplates.map((template) => {
              const Icon = getTemplateIcon(template.config.type);
              const colorClass = getTemplateColor(template.config.type);
              
              return (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-1">
                          {template.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-2 mt-1">
                          {template.description || 'Custom template'}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {/* Template Type */}
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {template.config.type.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <Badge variant="secondary">
                          Custom
                        </Badge>
                      </div>

                      {/* Template Features */}
                      <div className="text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Sections:</span>
                          <span>{template.config.sections?.length || 0}</span>
                        </div>
                        {template.config.charts && template.config.charts.length > 0 && (
                          <div className="flex justify-between">
                            <span>Charts:</span>
                            <span>{template.config.charts.length}</span>
                          </div>
                        )}
                      </div>

                      {/* Created Date */}
                      <div className="text-xs text-gray-500">
                        Created: {format(new Date(template.created_at), 'MMM d, yyyy')}
                      </div>

                      {/* Action Button */}
                      <Button 
                        variant="outline"
                        className="w-full"
                        onClick={() => handleCreateFromTemplate(template)}
                        disabled={creatingFromTemplate === template.id}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {creatingFromTemplate === template.id 
                          ? 'Creating...' 
                          : 'Use Template'
                        }
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Start Guide */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Getting Started with Templates</CardTitle>
          <CardDescription className="text-blue-700">
            Templates provide pre-configured report structures to help you get started quickly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium text-blue-900">System Templates</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Profit & Loss Statement</li>
                <li>• Cash Flow Report</li>
                <li>• Category Analysis</li>
                <li>• Transaction Detail Report</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-blue-900">What You Get</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Pre-configured sections</li>
                <li>• Default filters and formatting</li>
                <li>• Professional layouts</li>
                <li>• Customizable after creation</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
