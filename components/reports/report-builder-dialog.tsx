'use client';

import { useState } from 'react';
import { Settings, Plus, X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ReportBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportBuilderDialog({ open, onOpenChange }: ReportBuilderDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    {
      id: 1,
      title: 'Report Type',
      description: 'Choose the type of report you want to create',
    },
    {
      id: 2,
      title: 'Data Sources',
      description: 'Select which data to include in your report',
    },
    {
      id: 3,
      title: 'Sections',
      description: 'Configure report sections and layout',
    },
    {
      id: 4,
      title: 'Filters',
      description: 'Set up default filters and date ranges',
    },
    {
      id: 5,
      title: 'Charts',
      description: 'Add visualizations to your report',
    },
    {
      id: 6,
      title: 'Preview',
      description: 'Review and save your custom report',
    },
  ];

  const reportTypes = [
    {
      id: 'profit_loss',
      name: 'Profit & Loss',
      description: 'Income vs expenditure analysis with net profit calculations',
      icon: '📊',
      complexity: 'Intermediate',
    },
    {
      id: 'cash_flow',
      name: 'Cash Flow',
      description: 'Track money movement in and out of your business',
      icon: '💰',
      complexity: 'Advanced',
    },
    {
      id: 'category_analysis',
      name: 'Category Analysis',
      description: 'Breakdown spending and income by categories',
      icon: '🏷️',
      complexity: 'Beginner',
    },
    {
      id: 'transaction_detail',
      name: 'Transaction Detail',
      description: 'Detailed list of transactions with filters',
      icon: '📋',
      complexity: 'Beginner',
    },
    {
      id: 'custom',
      name: 'Custom Report',
      description: 'Build a completely custom report from scratch',
      icon: '🔧',
      complexity: 'Advanced',
    },
  ];

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'Beginner':
        return 'bg-green-100 text-green-800';
      case 'Intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'Advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Report Builder
          </DialogTitle>
          <DialogDescription>
            Create a custom report with our step-by-step builder
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`
                    flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                    ${currentStep >= step.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                    }
                  `}
                >
                  {step.id}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`
                      w-12 h-0.5 mx-2
                      ${currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'}
                    `}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Current Step Info */}
          <div className="text-center">
            <h3 className="text-lg font-semibold">
              {steps[currentStep - 1]?.title}
            </h3>
            <p className="text-gray-600 text-sm">
              {steps[currentStep - 1]?.description}
            </p>
          </div>

          {/* Step Content */}
          <div className="min-h-[400px]">
            {currentStep === 1 && (
              <div className="space-y-4">
                <h4 className="font-medium">Choose a report type to get started:</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  {reportTypes.map((type) => (
                    <Card 
                      key={type.id}
                      className="cursor-pointer hover:shadow-md transition-shadow hover:ring-2 hover:ring-blue-500"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{type.icon}</span>
                            <div>
                              <CardTitle className="text-base">{type.name}</CardTitle>
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${getComplexityColor(type.complexity)}`}
                              >
                                {type.complexity}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <CardDescription className="text-sm">
                          {type.description}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="text-center py-12">
                <Settings className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Data Sources Configuration
                </h3>
                <p className="text-gray-500 mb-6">
                  This step will allow you to select which data sources to include in your report.
                </p>
                <div className="text-sm text-gray-400">
                  Coming in the next development phase...
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="text-center py-12">
                <Settings className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Report Sections
                </h3>
                <p className="text-gray-500 mb-6">
                  Configure the sections and layout of your report.
                </p>
                <div className="text-sm text-gray-400">
                  Coming in the next development phase...
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="text-center py-12">
                <Settings className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Default Filters
                </h3>
                <p className="text-gray-500 mb-6">
                  Set up default filters and date ranges for your report.
                </p>
                <div className="text-sm text-gray-400">
                  Coming in the next development phase...
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="text-center py-12">
                <Settings className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Charts & Visualizations
                </h3>
                <p className="text-gray-500 mb-6">
                  Add charts and visualizations to make your report more engaging.
                </p>
                <div className="text-sm text-gray-400">
                  Coming in the next development phase...
                </div>
              </div>
            )}

            {currentStep === 6 && (
              <div className="text-center py-12">
                <Eye className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Preview & Save
                </h3>
                <p className="text-gray-500 mb-6">
                  Review your custom report and save it for future use.
                </p>
                <div className="text-sm text-gray-400">
                  Coming in the next development phase...
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
            >
              Previous
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              
              {currentStep < steps.length ? (
                <Button
                  onClick={() => setCurrentStep(Math.min(steps.length, currentStep + 1))}
                >
                  Next
                </Button>
              ) : (
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Report
                </Button>
              )}
            </div>
          </div>

          {/* Development Notice */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-blue-900 text-sm">🚧 Development Notice</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-blue-700 text-sm">
                The Report Builder is currently in development. For now, you can create reports 
                using our pre-built templates or the basic "Create from Scratch" option. 
                The full visual builder will be available in the next development phase.
              </p>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
