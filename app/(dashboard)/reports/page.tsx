'use client';

import { useState } from 'react';
import { Plus, FileText, BarChart3, Download, Settings, TrendingUp, Star, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageLayout, PageSection, PageCard, PageEmptyState } from '@/components/ui/page-layout';
import { useReports, useReportTemplates, useReportStats } from '@/hooks/use-reports';
import { ReportsList } from '@/components/reports/reports-list';
import { ReportTemplatesList } from '@/components/reports/report-templates-list';
import { CreateReportDialog } from '@/components/reports/create-report-dialog';
import { ReportBuilderDialog } from '@/components/reports/report-builder-dialog';
import Link from 'next/link';

type TabType = 'reports' | 'templates' | 'builder';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('reports');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBuilderDialog, setShowBuilderDialog] = useState(false);

  const { data: reports, isLoading: reportsLoading } = useReports();
  const { data: templates, isLoading: templatesLoading } = useReportTemplates();
  const { data: stats, isLoading: statsLoading } = useReportStats();

  const tabs = [
    {
      id: 'reports' as TabType,
      label: 'My Reports',
      icon: FileText,
      count: reports?.length || 0,
    },
    {
      id: 'templates' as TabType,
      label: 'Templates',
      icon: BarChart3,
      count: templates?.length || 0,
    },
    {
      id: 'builder' as TabType,
      label: 'Report Builder',
      icon: Settings,
      count: 0,
    },
  ];

  const headerActions = (
    <>
      <Button
        variant="outline"
        onClick={() => setShowBuilderDialog(true)}
      >
        <Settings className="w-4 h-4 mr-2" />
        Report Builder
      </Button>
      <Button onClick={() => setShowCreateDialog(true)}>
        <Plus className="w-4 h-4 mr-2" />
        New Report
      </Button>
    </>
  );

  return (
    <PageLayout
      title="Financial Reports"
      description="Create and manage comprehensive financial reports with flexible templates and custom analysis"
      icon={TrendingUp}
      actions={headerActions}
    >
      {/* Stats Cards */}
      {statsLoading ? (
        <div className="grid gap-6 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <PageCard key={i}>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-9 w-16 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-14 w-14 bg-muted rounded-lg animate-pulse" />
              </div>
            </PageCard>
          ))}
        </div>
      ) : stats ? (
        <div className="grid gap-6 md:grid-cols-3">
          <PageCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Reports</p>
                <p className="text-3xl font-bold text-foreground">{stats.totalReports}</p>
                <p className="text-sm text-muted-foreground mt-1">Custom reports created</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </PageCard>

          <PageCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Templates</p>
                <p className="text-3xl font-bold text-foreground">{stats.totalTemplates}</p>
                <p className="text-sm text-muted-foreground mt-1">Available templates</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <BarChart3 className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </PageCard>

          <PageCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Recent Activity</p>
                <p className="text-3xl font-bold text-foreground">{stats.recentReports?.length || 0}</p>
                <p className="text-sm text-muted-foreground mt-1">Reports this week</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Download className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </PageCard>
        </div>
      ) : null}

      {/* Standard Reports Section */}
      <PageSection
        title="Standard Reports"
        description="Quick access to essential financial reports"
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <PageCard className="hover:shadow-md transition-shadow cursor-pointer">
            <Link href="/reports/standard-pl" className="block">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">Standard Hierarchical P&L</h3>
                    <Badge variant="secondary" className="text-xs">
                      <Star className="w-3 h-3 mr-1" />
                      Featured
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Professional P&L with collapsible hierarchies showing Net Operating Profit and Profit After Capital Movements
                  </p>
                  <div className="flex items-center text-sm text-primary font-medium">
                    <span>View Report</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </div>
            </Link>
          </PageCard>

          <PageCard className="hover:shadow-md transition-shadow cursor-pointer">
            <Link href="/reports/cash-flow" className="block">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">Cash Flow Statement</h3>
                    <Badge variant="secondary" className="text-xs">
                      <Star className="w-3 h-3 mr-1" />
                      New
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Daily cash flow analysis showing income, expenditure, and running balance over time
                  </p>
                  <div className="flex items-center text-sm text-primary font-medium">
                    <span>View Report</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </div>
            </Link>
          </PageCard>

          <PageCard className="hover:shadow-md transition-shadow cursor-pointer opacity-60">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-50 rounded-lg">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground">Balance Sheet</h3>
                  <Badge variant="outline" className="text-xs">
                    Coming Soon
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Assets, liabilities, and equity statement with period comparisons
                </p>
                <div className="flex items-center text-sm text-muted-foreground font-medium">
                  <span>Available Soon</span>
                </div>
              </div>
            </div>
          </PageCard>
        </div>
      </PageSection>

      {/* Navigation Tabs */}
      <PageSection
        title="Report Management"
        description="Browse your reports, templates, and use the report builder"
      >
        <div className="border-b border-border mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-colors
                    ${isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                    }
                  `}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                  {tab.count > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {tab.count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'reports' && (
            <ReportsList 
              reports={reports || []} 
              isLoading={reportsLoading}
              onCreateReport={() => setShowCreateDialog(true)}
            />
          )}
          
          {activeTab === 'templates' && (
            <ReportTemplatesList 
              templates={templates || []} 
              isLoading={templatesLoading}
              onCreateFromTemplate={() => setShowCreateDialog(true)}
            />
          )}
          
          {activeTab === 'builder' && (
            <PageEmptyState
              icon={Settings}
              title="Report Builder"
              description="Create custom reports with our visual report builder. Choose data sources, apply filters, and design your perfect report."
              action={
                <Button onClick={() => setShowBuilderDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Start Building
                </Button>
              }
            />
          )}
        </div>
      </PageSection>

      {/* Dialogs */}
      <CreateReportDialog 
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        templates={templates || []}
      />
      
      <ReportBuilderDialog 
        open={showBuilderDialog}
        onOpenChange={setShowBuilderDialog}
      />
    </PageLayout>
  );
}
