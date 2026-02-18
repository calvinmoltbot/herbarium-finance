'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Menu, LogOut, User } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { navigationSections } from '@/components/dashboard/sidebar';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { BarChart3 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { logOut } from '@/app/(auth)/actions';
import { toast } from 'sonner';

export function MobileSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

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
    <div className="lg:hidden flex items-center justify-between h-14 px-4 border-b border-border bg-card">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">
          <div className="flex items-center h-14 px-6 border-b border-border">
            <BarChart3 className="w-7 h-7 text-primary" />
            <span className="ml-2 text-lg font-bold text-foreground">Herbarium</span>
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
                      onClick={() => setOpen(false)}
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

          <div className="border-t border-border p-4">
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
