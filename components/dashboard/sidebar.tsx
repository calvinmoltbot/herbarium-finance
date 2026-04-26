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
  Database,
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
      { name: 'Database Hub', href: '/import', icon: Database },
      { name: 'Revolut Import', href: '/import/bank', icon: CreditCard },
      { name: 'Pattern Management', href: '/patterns', icon: Settings },
      { name: 'Category Management', href: '/categories', icon: Tags },
      { name: 'Add Income', href: '/add-income', icon: TrendingUp },
      { name: 'Add Expenditure', href: '/add-expenditure', icon: TrendingDown },
      { name: 'Add Capital', href: '/add-capital', icon: Wallet },
    ],
  },
  {
    label: 'Account',
    items: [
      { name: 'My Account', href: '/account', icon: User },
      { name: 'Backups & Export', href: '/account/backups', icon: Database },
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
    <div className="hidden lg:flex flex-col w-64" style={{ backgroundColor: '#1a1825', borderRight: '1px solid #2a2835' }}>
      <div className="flex items-center justify-between h-16 px-6" style={{ borderBottom: '1px solid #2a2835' }}>
        <div className="flex items-center">
          <BarChart3 className="w-8 h-8" style={{ color: '#7c3aed' }} />
          <span className="ml-2 text-xl font-bold" style={{ color: '#e8e6e3' }}>Herbarium</span>
        </div>
        <ThemeToggle />
      </div>

      <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
        {navigationSections.map((section) => (
          <div key={section.label}>
            <div className="px-4 pb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b6880' }}>
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
                      ? ''
                      : ''
                  )}
                  style={isActive(item.href)
                    ? { backgroundColor: '#7c3aed', color: '#fff', borderLeft: '3px solid #f59e0b' }
                    : { color: '#9794a8' }
                  }
                  onMouseEnter={(e) => {
                    if (!isActive(item.href)) {
                      e.currentTarget.style.backgroundColor = '#222030';
                      e.currentTarget.style.color = '#e8e6e3';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive(item.href)) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#9794a8';
                    }
                  }}
                >
                  <item.icon className="w-5 h-5 mr-3 shrink-0" />
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4" style={{ borderTop: '1px solid #2a2835' }}>
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0" style={{ backgroundColor: 'rgba(124,58,237,0.15)', color: '#7c3aed' }}>
            <User className="w-4 h-4" />
          </div>
          <span className="text-sm truncate" style={{ color: '#e8e6e3' }}>
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
