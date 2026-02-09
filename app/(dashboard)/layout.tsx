import { Sidebar } from '@/components/dashboard/sidebar';
import { MobileSidebar } from '@/components/layout/mobile-sidebar';
import { AuthProvider } from '@/lib/auth-context';
import { DateFilterProvider } from '@/lib/date-filter-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <DateFilterProvider>
        <div className="flex h-screen bg-background">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <MobileSidebar />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
      </DateFilterProvider>
    </AuthProvider>
  );
}
