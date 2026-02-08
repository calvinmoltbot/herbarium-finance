import { Sidebar } from '@/components/dashboard/sidebar';
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
        <div className="flex h-screen bg-gray-50">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </DateFilterProvider>
    </AuthProvider>
  );
}
