'use client';

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface PageLayoutProps {
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageLayout({
  title,
  description,
  icon: Icon,
  children,
  actions,
  className = ""
}: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className={`max-w-6xl mx-auto py-12 px-6 space-y-8 ${className}`}>
        {/* Professional Header - Following Transaction Notes Pattern */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <Icon className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight text-foreground">{title}</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {description}
          </p>

          {/* Action buttons if provided */}
          {actions && (
            <div className="flex items-center justify-center gap-4 pt-2">
              {actions}
            </div>
          )}
        </div>

        {/* Page Content */}
        <div className="space-y-8">
          {children}
        </div>
      </div>
    </div>
  );
}

interface PageSectionProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageSection({
  title,
  description,
  icon: Icon,
  children,
  actions,
  className = ""
}: PageSectionProps) {
  return (
    <div className={`bg-card rounded-lg border border-border shadow-sm ${className}`}>
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
            <div>
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

interface PageCardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function PageCard({ children, className = "", padding = 'md' }: PageCardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <div className={`bg-card rounded-lg border border-border shadow-sm ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
}

interface PageListItemProps {
  children: ReactNode;
  className?: string;
  isLast?: boolean;
  onClick?: () => void;
}

export function PageListItem({ children, className = "", isLast = false, onClick }: PageListItemProps) {
  const baseClasses = `p-4 transition-colors ${!isLast ? 'border-b border-border' : ''}`;
  const interactiveClasses = onClick ? 'hover:bg-muted cursor-pointer' : '';

  return (
    <div
      className={`${baseClasses} ${interactiveClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface PageEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function PageEmptyState({ icon: Icon, title, description, action }: PageEmptyStateProps) {
  return (
    <div className="text-center py-12">
      <Icon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">{description}</p>
      {action}
    </div>
  );
}
