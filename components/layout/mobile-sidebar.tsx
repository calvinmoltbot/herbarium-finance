'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, ChevronDown, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { navigation, type NavigationItem } from '@/components/dashboard/sidebar';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { BarChart3 } from 'lucide-react';

export function MobileSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
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
    <div className="lg:hidden flex items-center justify-between h-14 px-4 border-b border-border bg-card">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <div className="flex items-center h-14 px-6 border-b border-border">
            <BarChart3 className="w-7 h-7 text-primary" />
            <span className="ml-2 text-lg font-bold text-foreground">Herbarium</span>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
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
                          ? 'bg-primary/15 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
                            onClick={() => setOpen(false)}
                            className={cn(
                              'flex items-center px-4 py-2 text-sm rounded-lg transition-colors',
                              child.href && isActive(child.href)
                                ? 'bg-primary text-primary-foreground'
                                : child.href
                                ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                : 'text-muted-foreground/50 cursor-not-allowed'
                            )}
                          >
                            <child.icon className="w-4 h-4 mr-3" />
                            {child.name}
                            {!child.href && (
                              <span className="ml-auto text-xs text-muted-foreground/50">Soon</span>
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
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                    item.href && isActive(item.href)
                      ? 'bg-primary text-primary-foreground'
                      : item.href
                      ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      : 'text-muted-foreground/50 cursor-not-allowed'
                  )}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>

      <div className="flex items-center">
        <BarChart3 className="w-6 h-6 text-primary" />
        <span className="ml-2 text-lg font-bold text-foreground">Herbarium</span>
      </div>

      <ThemeToggle />
    </div>
  );
}
