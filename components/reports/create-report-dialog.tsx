'use client';

import { useState } from 'react';
import { Plus, FileText, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useReportMutations, useTemplateMutations } from '@/hooks/use-reports';
import { ReportTemplate } from '@/lib/reports-types';

interface CreateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: ReportTemplate[];
}

type CreateMode = 'scratch' | 'template';

export function CreateReportDialog({ open, onOpenChange, templates }: CreateReportDialogProps) {
  const [mode, setMode] = useState<CreateMode>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'profit_loss' as 'profit_loss' | 'cash_flow' | 'category_analysis' | 'transaction_detail' | 'custom',
  });

  const { createReport } = useReportMutations();
  const { createReportFromTemplate } = useTemplateMutations();
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsCreating(true);
    try {
      if (mode === 'template' && selectedTemplate) {
        await createReportFromTemplate.mutateAsync({
          templateId: selectedTemplate,
          name: formData.name,
          description: formData.description,
        });
      } else {
        // Create from scratch with basic config
        await createReport.mutateAsync({
          name: formData.name,
          description: formData.description,
          config: {
            type: formData.type,
            sections: [
              {
                name: 'Summary',
                type: 'summary',
                showSubtotals: true,
                showPercentages: false,
              }
            ],
            charts: [],
            defaultFilters: {},
            formatting: {
              currency: 'GBP',
              dateFormat: 'DD/MM/YYYY',
            },
          },
        });
      }
      
      // Reset form and close dialog
      setFormData({ name: '', description: '', type: 'profit_loss' });
      setSelectedTemplate('');
      setMode('template');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create report:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const systemTemplates = templates.filter(t => t.is_system);
  const userTemplates = templates.filter(t => !t.is_system);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Report</DialogTitle>
          <DialogDescription>
            Create a custom financial report from a template or build one from scratch.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Creation Mode Selection */}
          <div className="space-y-3">
            <Label>How would you like to create your report?</Label>
            <div className="grid gap-3 md:grid-cols-2">
              <Card 
                className={`cursor-pointer transition-colors ${
                  mode === 'template' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => setMode('template')}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    From Template
                    <Badge variant="secondary">Recommended</Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Start with a pre-configured template and customize as needed
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card 
                className={`cursor-pointer transition-colors ${
                  mode === 'scratch' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => setMode('scratch')}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    From Scratch
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Build a completely custom report with your own structure
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>

          {/* Template Selection */}
          {mode === 'template' && (
            <div className="space-y-3">
              <Label>Select a Template</Label>
              
              {systemTemplates.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">System Templates</h4>
                  <div className="grid gap-2">
                    {systemTemplates.map((template) => (
                      <Card 
                        key={template.id}
                        className={`cursor-pointer transition-colors ${
                          selectedTemplate === template.id 
                            ? 'ring-2 ring-blue-500 bg-blue-50' 
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedTemplate(template.id)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">{template.name}</CardTitle>
                            <Badge variant="outline">
                              {template.config.type.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                          <CardDescription className="text-xs">
                            {template.description}
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {userTemplates.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">My Templates</h4>
                  <div className="grid gap-2">
                    {userTemplates.map((template) => (
                      <Card 
                        key={template.id}
                        className={`cursor-pointer transition-colors ${
                          selectedTemplate === template.id 
                            ? 'ring-2 ring-blue-500 bg-blue-50' 
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedTemplate(template.id)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">{template.name}</CardTitle>
                            <Badge variant="secondary">Custom</Badge>
                          </div>
                          <CardDescription className="text-xs">
                            {template.description || 'Custom template'}
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {templates.length === 0 && (
                <div className="text-center py-6 text-gray-500">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No templates available</p>
                  <p className="text-xs">Try creating from scratch instead</p>
                </div>
              )}
            </div>
          )}

          {/* Report Type Selection (for scratch mode) */}
          {mode === 'scratch' && (
            <div className="space-y-2">
              <Label htmlFor="type">Report Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value: string) => setFormData(prev => ({ ...prev, type: value as typeof prev.type }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="profit_loss">Profit & Loss</SelectItem>
                  <SelectItem value="cash_flow">Cash Flow</SelectItem>
                  <SelectItem value="category_analysis">Category Analysis</SelectItem>
                  <SelectItem value="transaction_detail">Transaction Detail</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Report Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Report Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter report name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this report will show"
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isCreating || 
                !formData.name.trim() || 
                (mode === 'template' && !selectedTemplate)
              }
              className="flex-1"
            >
              <Plus className="w-4 h-4 mr-2" />
              {isCreating ? 'Creating...' : 'Create Report'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
