'use client';

import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PatternManagement } from '@/components/patterns';
import Link from 'next/link';

export default function PatternsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto py-12 px-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/import" className="flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Database Management</span>
              </Link>
            </Button>
          </div>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Pattern Management
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Create and manage categorization patterns for intelligent transaction processing
            </p>
          </div>
          
          <div className="w-32"> {/* Spacer for centering */}</div>
        </div>

        {/* Pattern Management Component */}
        <PatternManagement />
      </div>
    </div>
  );
}
