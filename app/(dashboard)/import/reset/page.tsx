'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, AlertTriangle, Database } from 'lucide-react';
import Link from 'next/link';
import { useDataReset } from '@/hooks/use-data-reset';

export default function DataResetPage() {
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const { resetTransactions, resetCategories, resetAllData, isResetting } = useDataReset();

  const handleReset = async (action: string) => {
    if (confirmAction !== action) {
      setConfirmAction(action);
      return;
    }

    try {
      switch (action) {
        case 'transactions':
          await resetTransactions();
          break;
        case 'categories':
          await resetCategories();
          break;
        case 'all':
          await resetAllData();
          break;
      }
      setConfirmAction(null);
    } catch (error) {
      console.error('Reset failed:', error);
      setConfirmAction(null);
    }
  };

  const resetOptions = [
    {
      id: 'transactions',
      title: 'Reset Transactions',
      description: 'Delete all imported transactions while keeping categories',
      icon: Database,
      color: 'yellow',
      warning: 'This will permanently delete all your transaction data.',
    },
    {
      id: 'categories',
      title: 'Reset Categories',
      description: 'Delete all categories (this will also remove category links from transactions)',
      icon: Trash2,
      color: 'orange',
      warning: 'This will permanently delete all your categories.',
    },
    {
      id: 'all',
      title: 'Reset All Data',
      description: 'Delete all transactions and categories - complete fresh start',
      icon: AlertTriangle,
      color: 'red',
      warning: 'This will permanently delete ALL your financial data.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/import">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Import
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reset Data</h1>
            <p className="text-muted-foreground">
              Clear imported data to start fresh or fix import issues
            </p>
          </div>
        </div>
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>

      {/* Warning Banner */}
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800">⚠️ Permanent Action Warning</h4>
              <p className="text-red-700 mt-1">
                These actions cannot be undone. All deleted data will be permanently lost. 
                Make sure you have backups if needed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reset Options */}
      <div className="grid gap-6">
        {resetOptions.map((option) => {
          const Icon = option.icon;
          const isConfirming = confirmAction === option.id;
          
          return (
            <Card key={option.id} className={`border-${option.color}-200`}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg bg-${option.color}-100`}>
                    <Icon className={`h-5 w-5 text-${option.color}-600`} />
                  </div>
                  <span>{option.title}</span>
                </CardTitle>
                <CardDescription>{option.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className={`p-3 bg-${option.color}-50 border border-${option.color}-200 rounded-lg`}>
                    <p className={`text-sm text-${option.color}-700 font-medium`}>
                      ⚠️ {option.warning}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Button
                      variant={isConfirming ? "destructive" : "outline"}
                      onClick={() => handleReset(option.id)}
                      disabled={isResetting}
                      className={isConfirming ? "" : `border-${option.color}-300 text-${option.color}-700 hover:bg-${option.color}-50`}
                    >
                      {isResetting ? (
                        'Processing...'
                      ) : isConfirming ? (
                        `Confirm ${option.title}`
                      ) : (
                        option.title
                      )}
                    </Button>
                    
                    {isConfirming && (
                      <Button
                        variant="ghost"
                        onClick={() => setConfirmAction(null)}
                        disabled={isResetting}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                  
                  {isConfirming && (
                    <p className="text-sm text-gray-600">
                      Click "{option.title}" again to confirm this permanent action.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Usage Guide */}
      <Card>
        <CardHeader>
          <CardTitle>When to Use Data Reset</CardTitle>
          <CardDescription>
            Common scenarios where resetting data is helpful
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div>
                <h4 className="font-medium">Import Errors</h4>
                <p className="text-sm text-muted-foreground">
                  When dates or amounts are imported incorrectly and you need to re-import with fixes
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div>
                <h4 className="font-medium">Testing Imports</h4>
                <p className="text-sm text-muted-foreground">
                  Clear test data before importing your real financial data
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div>
                <h4 className="font-medium">Fresh Start</h4>
                <p className="text-sm text-muted-foreground">
                  Start over with a clean slate when reorganizing your financial tracking
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                4
              </div>
              <div>
                <h4 className="font-medium">Duplicate Issues</h4>
                <p className="text-sm text-muted-foreground">
                  When duplicate detection fails and you have unwanted duplicate transactions
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
