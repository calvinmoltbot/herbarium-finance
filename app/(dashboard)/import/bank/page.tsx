'use client';

import { useState } from 'react';
import { Upload, ArrowLeft, CheckCircle, AlertCircle, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useRevolutImport } from '@/hooks/use-revolut-import';
import { useCategorySuggestions } from '@/hooks/use-category-suggestions';
import { useCategories } from '@/hooks/use-categories';
import { useCommitImport } from '@/hooks/use-commit-import';
import { createClient } from '@/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import Link from 'next/link';
import { format } from 'date-fns';
import type { MatchingResult, TransactionMatch } from '@/lib/revolut-types';

interface ImportedTransaction {
  id: string;
  description: string;
  amount: number;
  transaction_date: string;
  type: 'income' | 'expenditure' | 'capital';
  category_id?: string;
  category?: {
    id: string;
    name: string;
    color: string;
  };
}

export default function BankUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [importedTransactions, setImportedTransactions] = useState<ImportedTransaction[]>([]);
  const [importStats, setImportStats] = useState<MatchingResult | null>(null);
  const [currentStep, setCurrentStep] = useState<'upload' | 'processing' | 'review' | 'complete'>('upload');

  const { importCSV, isProcessing } = useRevolutImport();
  const { getSuggestionsForTransaction } = useCategorySuggestions();
  const { data: categories = [] } = useCategories();
  const { mutate: commitImport, isPending: isCommitting } = useCommitImport();
  
  const supabase = createClient();
  
  // Function to save category assignments to database before committing
  const saveCategoryAssignments = async () => {
    const transactionsWithCategories = importedTransactions.filter(t => t.category_id);
    
    if (transactionsWithCategories.length === 0) {
      return;
    }

    for (const transaction of transactionsWithCategories) {
      try {
        const { error } = await supabase
          .from('imported_transactions_test')
          .update({ 
            suggested_category_id: transaction.category_id,
            match_status: 'reviewed' // Mark as reviewed so commit knows to use the category
          })
          .eq('id', transaction.id);

        if (error) {
          console.error(`Failed to save category for transaction ${transaction.id}:`, error);
        }
      } catch (error) {
        console.error(`Error saving category for transaction ${transaction.id}:`, error);
      }
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setCurrentStep('processing');
    
    try {
      // Import the CSV file
      const result = await importCSV(selectedFile);
      
      // Convert the matching result to our transaction format
      const transactions: ImportedTransaction[] = result.matches?.map((match: TransactionMatch) => ({
        id: match.importedTransaction.id,
        description: match.importedTransaction.original_description,
        amount: match.importedTransaction.amount,
        transaction_date: match.importedTransaction.completed_date || match.importedTransaction.started_date,
        type: match.importedTransaction.amount > 0 ? 'income' : 'expenditure',
        category_id: match.suggestedCategory?.id,
        category: match.suggestedCategory,
      })) || [];

      // Sort transactions by date (newest first)
      const sortedTransactions = transactions.sort((a, b) =>
        new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
      );

      setImportedTransactions(sortedTransactions);
      setImportStats(result);
      setCurrentStep('review');

      // Generate suggestions for uncategorized transactions
      await generateSuggestions(transactions);
      
    } catch (error) {
      console.error('Import failed:', error);
      setCurrentStep('upload');
    }
  };

  const generateSuggestions = async (transactions: ImportedTransaction[]) => {
    const uncategorized = transactions.filter(t => !t.category_id);
    
    for (const transaction of uncategorized) {
      try {
        const suggestions = await getSuggestionsForTransaction(
          transaction.description,
          transaction.amount
        );
        
        // Auto-apply high confidence suggestions (80%+)
        const highConfidenceSuggestion = suggestions.find(s => s.confidence >= 0.8);
        if (highConfidenceSuggestion) {
          // Apply the suggestion automatically
          // This would update the transaction in the database
        }
      } catch (error) {
        console.error('Error generating suggestions for transaction:', error);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
            <div className="flex items-center justify-center space-x-3">
              <Upload className="h-12 w-12 text-blue-600" />
              <h1 className="text-4xl font-bold tracking-tight text-gray-900">
                Smart Bank Import
              </h1>
            </div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Import your Revolut CSV with intelligent categorization and duplicate detection
            </p>
          </div>
          
          <div className="w-32"> {/* Spacer for centering */}</div>
        </div>

        {/* Progress Steps */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className={`flex items-center space-x-2 ${currentStep === 'upload' ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'upload' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                  1
                </div>
                <span className="font-medium">Upload File</span>
              </div>
              
              <div className={`flex items-center space-x-2 ${currentStep === 'processing' ? 'text-blue-600' : currentStep === 'review' || currentStep === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'processing' ? 'bg-blue-600 text-white' : currentStep === 'review' || currentStep === 'complete' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                  2
                </div>
                <span className="font-medium">Process & Categorize</span>
              </div>
              
              <div className={`flex items-center space-x-2 ${currentStep === 'review' ? 'text-blue-600' : currentStep === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'review' ? 'bg-blue-600 text-white' : currentStep === 'complete' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                  3
                </div>
                <span className="font-medium">Review & Confirm</span>
              </div>
              
              <div className={`flex items-center space-x-2 ${currentStep === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'complete' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                  ✓
                </div>
                <span className="font-medium">Complete</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 1: File Upload */}
        {currentStep === 'upload' && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Your Revolut CSV File</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                
                {selectedFile ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-lg font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-sm text-gray-600">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    
                    <div className="flex justify-center space-x-3">
                      <Button onClick={() => setSelectedFile(null)} variant="outline">
                        Remove File
                      </Button>
                      <Button onClick={handleImport} disabled={isProcessing}>
                        {isProcessing ? 'Processing...' : 'Import Transactions'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-lg text-gray-600">
                      Drag and drop your Revolut CSV file here, or click to browse
                    </p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileInput}
                      className="hidden"
                      id="file-input"
                    />
                    <label htmlFor="file-input" className="inline-block">
                      <Button variant="outline" className="cursor-pointer" asChild>
                        <span>Browse Files</span>
                      </Button>
                    </label>
                    <p className="text-sm text-gray-500">
                      Supports CSV files up to 10MB
                    </p>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">How to Export from Revolut</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-start space-x-2">
                      <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">1</span>
                      <p>Open Revolut app → More → Statement</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">2</span>
                      <p>Select date range and CSV format</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">3</span>
                      <p>Download and upload here</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Smart Features</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      <p>Intelligent category suggestions</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <p>Automatic duplicate detection</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-blue-500" />
                      <p>Transaction metadata support</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Processing */}
        {currentStep === 'processing' && (
          <Card>
            <CardHeader>
              <CardTitle>Processing Your Import...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    </div>
                    <span>Parsing CSV file and validating transactions</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <span>Generating intelligent category suggestions</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                    </div>
                    <span>Checking for duplicates</span>
                  </div>
                </div>
                
                <Progress value={65} className="h-2" />
                <p className="text-center text-sm text-gray-600">
                  This may take a few moments for large files...
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review */}
        {currentStep === 'review' && importedTransactions.length > 0 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Review Imported Transactions</CardTitle>
                  <div className="space-x-3">
                    <Button variant="outline" onClick={() => setCurrentStep('upload')}>
                      Cancel Import
                    </Button>
                    <Button 
                      onClick={async () => {
                        try {
                          // First save category assignments to database
                          await saveCategoryAssignments();
                          
                          // Then commit the import
                          commitImport(undefined, {
                            onSuccess: () => {
                              setCurrentStep('complete');
                              toast.success('Transactions successfully committed to database!');
                            },
                            onError: (error) => {
                              toast.error(`Failed to commit transactions: ${error.message}`);
                            }
                          });
                        } catch (error) {
                          toast.error('Failed to save category assignments');
                          console.error('Error saving categories:', error);
                        }
                      }}
                      disabled={isCommitting}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isCommitting ? 'Committing...' : `Commit ${importedTransactions.length} Transactions to Database`}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {importStats && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{importStats.totalImported || importedTransactions.length}</div>
                      <div className="text-sm text-gray-600">Total Imported</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {importedTransactions.filter(t => t.category_id).length}
                      </div>
                      <div className="text-sm text-gray-600">Categorized</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {importedTransactions.filter(t => !t.category_id).length}
                      </div>
                      <div className="text-sm text-gray-600">Needs Review</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(importedTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0))}
                      </div>
                      <div className="text-sm text-gray-600">Total Value</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add a clear explanation of the process */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800">Important: Two-Step Process</h4>
                    <p className="text-blue-700 mt-1">
                      Your transactions have been analyzed but are not yet saved to the database.
                      {`Click "Commit Transactions" above to permanently save them. This will replace your existing manual transactions.`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Simple categorization interface for imported transactions */}
            <Card>
              <CardHeader>
                <CardTitle>Imported Transactions - Assign Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {importedTransactions.map((transaction) => (
                    <div key={transaction.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium">{transaction.description}</h3>
                          <p className="text-sm text-gray-600">
                            {formatCurrency(transaction.amount)} • {format(new Date(transaction.transaction_date), 'dd/MM/yyyy')}
                          </p>
                          <Badge className={transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {transaction.type}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          {/* Always show the dropdown, with current category pre-selected */}
                          <div className="flex items-center space-x-2">
                            <Select
                              value={transaction.category_id || ""}
                              onValueChange={(categoryId) => {
                                // Update the transaction with the selected category
                                const selectedCategory = categories.find(c => c.id === categoryId);
                                if (selectedCategory) {
                                  setImportedTransactions(prev => 
                                    prev.map(t => 
                                      t.id === transaction.id 
                                        ? { ...t, category_id: categoryId, category: selectedCategory }
                                        : t
                                    )
                                  );
                                }
                              }}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Select category...">
                                  {transaction.category_id && transaction.category ? (
                                    <div className="flex items-center space-x-2">
                                      <div 
                                        className="w-3 h-3 rounded-full" 
                                        style={{ backgroundColor: transaction.category.color }}
                                      />
                                      <span>{transaction.category.name}</span>
                                      {/* Show if it's a suggestion */}
                                      <span className="text-xs text-blue-600">(suggested)</span>
                                    </div>
                                  ) : (
                                    "Select category..."
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {categories
                                  .filter(category => category.type === transaction.type)
                                  .map(category => (
                                    <SelectItem key={category.id} value={category.id}>
                                      <div className="flex items-center space-x-2">
                                        <div 
                                          className="w-3 h-3 rounded-full" 
                                          style={{ backgroundColor: category.color }}
                                        />
                                        <span>{category.name}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={async () => {
                                try {
                                  const suggestions = await getSuggestionsForTransaction(
                                    transaction.description,
                                    transaction.amount
                                  );
                                  console.log('Suggestions for', transaction.description, ':', suggestions);
                                  if (suggestions.length > 0) {
                                    console.log('Top suggestion:', suggestions[0]);
                                    // Auto-apply the top suggestion
                                    const topSuggestion = suggestions[0];
                                    setImportedTransactions(prev => 
                                      prev.map(t => 
                                        t.id === transaction.id 
                                          ? { ...t, category_id: topSuggestion.category_id, category: topSuggestion.category }
                                          : t
                                      )
                                    );
                                  } else {
                                    console.log('No suggestions found for this transaction');
                                  }
                                } catch (error) {
                                  console.error('Error getting suggestions:', error);
                                }
                              }}
                            >
                              💡 Get Suggestion
                            </Button>
                            
                            {/* Clear category button */}
                            {transaction.category_id && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setImportedTransactions(prev => 
                                    prev.map(t => 
                                      t.id === transaction.id 
                                        ? { ...t, category_id: undefined, category: undefined }
                                        : t
                                    )
                                  );
                                }}
                              >
                                ✕ Clear
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Complete */}
        {currentStep === 'complete' && (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Complete!</h2>
              <p className="text-gray-600 mb-6">
                Your Revolut transactions have been successfully imported and categorized.
              </p>
              
              <div className="flex justify-center space-x-4">
                <Button asChild>
                  <Link href="/transactions">View All Transactions</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/reports/financial/profit-loss">View Reports</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
