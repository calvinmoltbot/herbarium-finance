import { Suspense } from 'react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { IncomeVsExpenditureChart } from '@/components/dashboard/income-vs-expenditure-chart';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { IncomeExpenditurePieChart } from '@/components/dashboard/category-pie-chart';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex-1 space-y-8 p-8 max-w-7xl mx-auto">
        <DashboardHeader />
        
        <Suspense fallback={<div>Loading stats...</div>}>
          <StatsCards />
        </Suspense>

        {/* Main Content Grid - Professional Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart Section - Compact */}
          <div className="lg:col-span-1">
            <Suspense fallback={<div>Loading chart...</div>}>
              <IncomeVsExpenditureChart />
            </Suspense>
          </div>
          
          {/* Recent Transactions */}
          <div className="lg:col-span-1">
            <Suspense fallback={<div>Loading transactions...</div>}>
              <RecentTransactions />
            </Suspense>
          </div>

          {/* Income vs Expenditure Pie Chart */}
          <div className="lg:col-span-1">
            <Suspense fallback={<div>Loading pie chart...</div>}>
              <IncomeExpenditurePieChart />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
