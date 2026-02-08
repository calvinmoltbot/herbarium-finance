'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

const DialogContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>({
  open: false,
  onOpenChange: () => {},
});

export function Dialog({ open = false, onOpenChange = () => {}, children }: DialogProps) {
  if (!open) return null;

  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50" 
          onClick={() => onOpenChange(false)}
        />
        {/* Content */}
        {children}
      </div>
    </DialogContext.Provider>
  );
}

export function DialogContent({ className, children, ...props }: DialogContentProps) {
  const { onOpenChange } = React.useContext(DialogContext);

  return (
    <div
      className={cn(
        "relative z-50 grid w-full max-w-lg gap-4 border bg-white p-6 shadow-lg duration-200 sm:rounded-lg",
        className
      )}
      {...props}
    >
      <button
        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
        onClick={() => onOpenChange(false)}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </button>
      {children}
    </div>
  );
}

export function DialogHeader({ className, children, ...props }: DialogHeaderProps) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function DialogFooter({ className, children, ...props }: DialogFooterProps) {
  return (
    <div
      className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function DialogTitle({ className, children, ...props }: DialogTitleProps) {
  return (
    <h3
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function DialogDescription({ className, children, ...props }: DialogDescriptionProps) {
  return (
    <p
      className={cn("text-sm text-gray-600", className)}
      {...props}
    >
      {children}
    </p>
  );
}
