'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { 
  BarChart3, 
  Database, 
  TrendingUp, 
  TrendingDown, 
  Tags, 
  FileText, 
  List, 
  CreditCard,
  Settings,
  Plus,
  RotateCcw,
  ShoppingCart,
  ChevronDown,
  ChevronRight,
  StickyNote
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationItem {
  name: string;
  href?: string;
  icon: any;
  children?: NavigationItem[];
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'Transactions', href: '/transactions', icon: List },
  { name: 'Transaction Notes', href: '/transaction-notes', icon: StickyNote },
  { name: 'Reports', href: '/reports', icon: FileText },
  {
    name: 'Bank Import',
    icon: Database,
    children: [
      { name: 'Revolut Import', href: '/import/bank', icon: CreditCard },
      { name: 'Pattern Management', href: '/patterns', icon: Settings },
      { name: 'Category Management', href: '/categories', icon: Tags },
    ]
  },
  {
    name: 'Manual Transactions',
    icon: Plus,
    children: [
      { name: 'Add Income', href: '/add-income', icon: TrendingUp },
      { name: 'Add Expenditure', href: '/add-expenditure', icon: TrendingDown },
    ]
  },
  {
    name: 'Admin',
    icon: Settings,
    children: [
      { name: 'Data Reset', href: '/import/reset', icon: RotateCcw },
    ]
  },
  {
    name: 'Coming Soon',
    icon: ShoppingCart,
    children: [
      { name: 'Shopify', href: '/import/shopify', icon: ShoppingCart },
    ]
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<string[]>(['Bank Import', 'Manual Transactions']);

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionName)
        ? prev.filter(name => name !== sectionName)
        : [...prev, sectionName]
    );
  };

  const isActive = (href: string) => pathname === href;
  const isSectionActive = (children: NavigationItem[]) => 
    children.some(child => child.href && pathname === child.href);

  return (
    <div className="flex flex-col w-64 bg-slate-900">
      <div className="flex items-center h-16 px-6 bg-slate-800">
        <BarChart3 className="w-8 h-8 text-blue-400" />
        <span className="ml-2 text-xl font-bold text-white">Herbarium</span>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navigation.map((item) => {
          if (item.children) {
            const isExpanded = expandedSections.includes(item.name);
            const hasActiveChild = isSectionActive(item.children);
            
            return (
              <div key={item.name} className="space-y-1">
                <button
                  onClick={() => toggleSection(item.name)}
                  className={cn(
                    'flex items-center justify-between w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                    hasActiveChild
                      ? 'bg-blue-600/20 text-blue-300'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <div className="flex items-center">
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                
                {isExpanded && (
                  <div className="ml-4 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.name}
                        href={child.href || '#'}
                        className={cn(
                          'flex items-center px-4 py-2 text-sm rounded-lg transition-colors',
                          child.href && isActive(child.href)
                            ? 'bg-blue-600 text-white'
                            : child.href
                            ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            : 'text-slate-500 cursor-not-allowed'
                        )}
                      >
                        <child.icon className="w-4 h-4 mr-3" />
                        {child.name}
                        {!child.href && (
                          <span className="ml-auto text-xs text-slate-500">Soon</span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href || '#'}
              className={cn(
                'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                item.href && isActive(item.href)
                  ? 'bg-blue-600 text-white'
                  : item.href
                  ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  : 'text-slate-500 cursor-not-allowed'
              )}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
