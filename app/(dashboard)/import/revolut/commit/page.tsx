'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, AlertTriangle, CheckCircle, Database, Trash2, Upload, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCommitImport, useGetCommitPreview } from '@/hooks/use-commit-import';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CommitImportPage() {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  
  const commitImport = useCommitImport();
  const getPreview = useGetCommitPreview();
  const router = useRouter();

  useEffect(() => {
    // Load preview data on mount
    getPreview.mutate(undefined, {
      onSuccess: (data) => {
        setPreviewData(data);
      }
    });
  }, []);

  const handleCommit = async () => {
    try {
      await commitImport.mutateAsync();
      // Redirect to dashboard after successful commit
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Commit failed:', error);
    }
  };

  if (!previewData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading commit preview...</p>
        </div>
      </div>
    );
  }

  if (previewData.totalImportedTransactions === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-12 px-6">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
            <h1 className="text-2xl font-bold text-gray-900">No Import Data Found</h1>
            <p className="text-gray-600">
              You need to import and review Revolut transactions before you can commit them.
            </p>
            <Button asChild>
              <Link href="/import/revolut">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Import
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12 px-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/import/revolut/reconciliation">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Reconciliation
                </Link>
              </Button>
              <h1 className="text-3xl font-bold text-gray-900">Commit Bank Import</h1>
            </div>
            <p className="text-gray-600">
              Replace your manual transactions with bank data, preserving verified descriptions and categories.
            </p>
          </div>
        </div>

        {/* Warning Card */}
        <Card className="border-yellow-200 bg-yellow-50">
          <div className="p-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-6 w-6 text-yellow-600 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">Important: This Action Cannot Be Undone</h3>
                <p className="text-yellow-700 mb-4">
                  This will permanently delete all your existing manual transactions and replace them with bank data. 
                  Make sure you've verified all important matches before proceeding.
                </p>
                <div className="text-sm text-yellow-600">
                  <strong>Backup Recommendation:</strong> Consider exporting your current data before proceeding.
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Preview Summary */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-6">Commit Preview</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* What Will Be Deleted */}
            <div className="space-y-4">
              <h4 className="font-medium text-red-700 flex items-center">
                <Trash2 className="h-4 w-4 mr-2" />
                Will Be Deleted
              </h4>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-700">{previewData.manualTransactionsToDelete}</div>
                  <div className="text-sm text-red-600">Manual Transactions</div>
                </div>
              </div>
            </div>

            {/* What Will Be Added */}
            <div className="space-y-4">
              <h4 className="font-medium text-green-700 flex items-center">
                <Upload className="h-4 w-4 mr-2" />
                Will Be Added
              </h4>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">{previewData.totalImportedTransactions}</div>
                  <div className="text-sm text-green-600">Bank Transactions</div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="mt-8 space-y-4">
            <h4 className="font-medium text-gray-900">Transaction Breakdown</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                <div className="text-xl font-bold text-purple-700">{previewData.verifiedTransactions}</div>
                <div className="text-sm text-purple-600">Verified</div>
                <div className="text-xs text-purple-500 mt-1">Will keep your descriptions & categories</div>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <div className="text-xl font-bold text-gray-700">{previewData.unmatchedTransactions}</div>
                <div className="text-sm text-gray-600">Unmatched</div>
                <div className="text-xs text-gray-500 mt-1">Ready for categorization</div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <div className="text-xl font-bold text-blue-700">{previewData.rejectedTransactions}</div>
                <div className="text-sm text-blue-600">Rejected</div>
                <div className="text-xs text-blue-500 mt-1">Will use bank descriptions</div>
              </div>
            </div>
          </div>
        </Card>

        {/* What Will Happen */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">What Will Happen</h3>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-medium">1</div>
              <div>
                <p className="font-medium text-gray-900">Delete All Manual Transactions</p>
                <p className="text-sm text-gray-600">Your {previewData.manualTransactionsToDelete} existing manual transactions will be permanently removed.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-medium">2</div>
              <div>
                <p className="font-medium text-gray-900">Import Bank Transactions</p>
                <p className="text-sm text-gray-600">All {previewData.totalImportedTransactions} bank transactions will become your new main transaction data.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-medium">3</div>
              <div>
                <p className="font-medium text-gray-900">Preserve Verified Data</p>
                <p className="text-sm text-gray-600">
                  {previewData.verifiedTransactions} verified transactions will use your detailed descriptions and categories 
                  (e.g., "Amazon - Natural Calico tablecloth" instead of just "Amazon").
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">4</div>
              <div>
                <p className="font-medium text-gray-900">Ready for Categorization</p>
                <p className="text-sm text-gray-600">
                  {previewData.unmatchedTransactions + previewData.rejectedTransactions} transactions will be uncategorized 
                  and ready for you to assign categories.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" asChild>
              <Link href="/import/revolut/reconciliation">
                <Eye className="h-4 w-4 mr-2" />
                Review Matches Again
              </Link>
            </Button>
          </div>
          
          <div className="flex items-center space-x-4">
            {!showConfirmation ? (
              <Button 
                onClick={() => setShowConfirmation(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                <Database className="h-4 w-4 mr-2" />
                Commit Import
              </Button>
            ) : (
              <div className="flex items-center space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowConfirmation(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCommit}
                  disabled={commitImport.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {commitImport.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Committing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Yes, Replace All Data
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {showConfirmation && (
          <Card className="border-red-200 bg-red-50">
            <div className="p-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-6 w-6 text-red-600 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-red-800 mb-2">Final Confirmation</h3>
                  <p className="text-red-700 mb-4">
                    Are you absolutely sure you want to replace all your manual transactions with bank data? 
                    This action cannot be undone.
                  </p>
                  <div className="text-sm text-red-600">
                    <strong>This will:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Delete {previewData.manualTransactionsToDelete} manual transactions permanently</li>
                      <li>Import {previewData.totalImportedTransactions} bank transactions as your new data</li>
                      <li>Preserve {previewData.verifiedTransactions} verified descriptions and categories</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {commitImport.isSuccess && (
          <Card className="border-green-200 bg-green-50">
            <div className="p-6">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-green-800 mb-2">Import Committed Successfully!</h3>
                  <p className="text-green-700 mb-4">
                    Your bank transactions are now your main transaction data. Redirecting to dashboard...
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
