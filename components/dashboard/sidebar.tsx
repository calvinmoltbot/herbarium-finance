'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Tags,
  FileText,
  FileSpreadsheet,
  List,
  Settings,
  Scale,
  StickyNote,
  Wallet,
  AlertTriangle,
  LogOut,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { useAuth } from '@/lib/auth-context';
import { logOut } from '@/app/(auth)/actions';
import { toast } from 'sonner';

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface NavigationSection {
  label: string;
  items: NavigationItem[];
}

const navigationSections: NavigationSection[] = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    ],
  },
  {
    label: 'Transactions',
    items: [
      { name: 'All Transactions', href: '/transactions', icon: List },
      { name: 'Uncategorized', href: '/uncategorized', icon: AlertTriangle },
      { name: 'Transaction Notes', href: '/transaction-notes', icon: StickyNote },
    ],
  },
  {
    label: 'Reports',
    items: [
      { name: 'Reports', href: '/reports', icon: FileText },
      { name: 'Self Assessment', href: '/reports/tax/self-assessment', icon: FileSpreadsheet },
      { name: 'Bank Reconciliation', href: '/bank-reconciliation', icon: Scale },
    ],
  },
  {
    label: 'Data Management',
    items: [
      { name: 'Revolut Import', href: '/import/bank', icon: CreditCard },
      { name: 'Pattern Management', href: '/patterns', icon: Settings },
      { name: 'Category Management', href: '/categories', icon: Tags },
      { name: 'Add Income', href: '/add-income', icon: TrendingUp },
      { name: 'Add Expenditure', href: '/add-expenditure', icon: TrendingDown },
      { name: 'Add Capital', href: '/add-capital', icon: Wallet },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const isActive = (href: string) => pathname === href;

  const handleLogout = async () => {
    try {
      await logOut();
      toast.success('Logged out successfully');
      router.push('/login');
    } catch {
      toast.error('Failed to log out');
    }
  };

  return (
    <div className="hidden lg:flex flex-col w-64 glass-sidebar">
      <div className="flex items-center justify-between h-16 px-6 border-b border-border/50">
        <div className="flex items-center">
          <BarChart3 className="w-8 h-8 text-primary" />
          <span className="ml-2 text-xl font-bold text-foreground">Herbarium</span>
        </div>
        <ThemeToggle />
      </div>

      <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
        {navigationSections.map((section) => (
          <div key={section.label}>
            <div className="px-4 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              {section.label}
            </div>
            <div className="space-y-1">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors',
                    isActive(item.href)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className="w-5 h-5 mr-3 shrink-0" />
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border/50 p-4">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 text-primary shrink-0">
            <User className="w-4 h-4" />
          </div>
          <span className="text-sm text-foreground truncate">
            {user?.email || 'User'}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-4 py-2.5 text-sm font-medium rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3 shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export { navigationSections };
export type { NavigationItem, NavigationSection };
