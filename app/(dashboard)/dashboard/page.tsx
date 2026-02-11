import { Suspense } from 'react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { IncomeVsExpenditureChart } from '@/components/dashboard/income-vs-expenditure-chart';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { IncomeExpenditurePieChart } from '@/components/dashboard/category-pie-chart';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            <div className="h-4 w-4 bg-muted rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-32 bg-muted rounded animate-pulse mb-2" />
            <div className="h-3 w-24 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-40 bg-muted rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center space-x-6">
            <div className="h-3 w-16 bg-muted rounded animate-pulse" />
            <div className="h-3 w-20 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-[200px] bg-muted rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

function TransactionsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-40 bg-muted rounded animate-pulse" />
        <div className="h-4 w-48 bg-muted rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 animate-pulse">
              <div className="w-10 h-10 bg-muted rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
              <div className="h-6 bg-muted rounded w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex-1 space-y-8 p-8 max-w-7xl mx-auto">
        <DashboardHeader />

        <Suspense fallback={<StatsCardsSkeleton />}>
          <StatsCards />
        </Suspense>

        {/* Main Content Grid - Professional Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart Section - Compact */}
          <div className="lg:col-span-1">
            <Suspense fallback={<ChartSkeleton />}>
              <IncomeVsExpenditureChart />
            </Suspense>
          </div>

          {/* Recent Transactions */}
          <div className="lg:col-span-1">
            <Suspense fallback={<TransactionsSkeleton />}>
              <RecentTransactions />
            </Suspense>
          </div>

          {/* Income vs Expenditure Pie Chart */}
          <div className="lg:col-span-1">
            <Suspense fallback={<ChartSkeleton />}>
              <IncomeExpenditurePieChart />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
