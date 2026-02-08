'use client';

import { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useRevolutImport, useImportStatistics, useClearImportedTransactions } from '@/hooks/use-revolut-import';
import { MatchingResult } from '@/lib/revolut-types';
import Link from 'next/link';

export default function RevolutImportPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<MatchingResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const { importCSV, isProcessing, importStats } = useRevolutImport();
  const { data: statistics } = useImportStatistics();
  const clearImportedTransactions = useClearImportedTransactions();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setImportResult(null);
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

    try {
      const result = await importCSV(selectedFile);
      setImportResult(result);
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  const handleClearData = async () => {
    if (confirm('Are you sure you want to clear all imported transaction data? This cannot be undone.')) {
      try {
        await clearImportedTransactions.mutateAsync();
        setImportResult(null);
        setSelectedFile(null);
      } catch (error) {
        console.error('Failed to clear data:', error);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-12 px-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <FileText className="h-12 w-12 text-blue-600" />
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">
              Revolut Bank Import
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Import your Revolut CSV export and match transactions with existing manual entries. 
            {`This is a safe testing environment that won't overwrite your existing data.`}
          </p>
        </div>

        {/* Current Statistics */}
        {statistics && statistics.total > 0 && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Current Import Status</h2>
              <div className="flex items-center space-x-2">
                <Button asChild>
                  <Link href="/import/revolut/reconciliation">
                    Review Matches & Reconcile
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleClearData}
                  disabled={clearImportedTransactions.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear All Data
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{statistics.total}</div>
                <div className="text-sm text-gray-600">Total Imported</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{statistics.byStatus.matched}</div>
                <div className="text-sm text-gray-600">Matched</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{statistics.byStatus.potential}</div>
                <div className="text-sm text-gray-600">Potential</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{statistics.byStatus.unmatched}</div>
                <div className="text-sm text-gray-600">Unmatched</div>
              </div>
            </div>
          </Card>
        )}

        {/* File Upload */}
        <Card className="p-8">
          <h2 className="text-xl font-semibold mb-6">Upload Revolut CSV File</h2>
          
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
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-600">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <Button onClick={() => setSelectedFile(null)} variant="outline" size="sm">
                  Remove File
                </Button>
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
                <label htmlFor="file-input">
                  <Button variant="outline" className="cursor-pointer">
                    Browse Files
                  </Button>
                </label>
                <p className="text-sm text-gray-500">
                  Supports CSV files up to 10MB
                </p>
              </div>
            )}
          </div>

          {selectedFile && (
            <div className="mt-6 flex justify-center">
              <Button 
                onClick={handleImport} 
                disabled={isProcessing}
                className="px-8"
              >
                {isProcessing ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import & Match Transactions
                  </>
                )}
              </Button>
            </div>
          )}
        </Card>

        {/* Processing Progress */}
        {isProcessing && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Processing Import...</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-blue-600 animate-spin" />
                <span>Parsing CSV file and validating transactions</span>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-blue-600 animate-spin" />
                <span>Matching with existing transactions</span>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-blue-600 animate-spin" />
                <span>Calculating confidence scores</span>
              </div>
            </div>
          </Card>
        )}

        {/* Import Statistics */}
        {importStats && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Import Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Transaction Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total Transactions:</span>
                    <span className="font-medium">{importStats.totalTransactions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Completed:</span>
                    <span className="font-medium">{importStats.completedTransactions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date Range:</span>
                    <span className="font-medium">
                      {formatDate(importStats.dateRange.earliest)} - {formatDate(importStats.dateRange.latest)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Financial Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total Amount:</span>
                    <span className="font-medium">{formatCurrency(importStats.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Income:</span>
                    <span className="font-medium">{formatCurrency(importStats.incomeAmount)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Expenditure:</span>
                    <span className="font-medium">{formatCurrency(importStats.expenditureAmount)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Transaction Types</h4>
                <div className="space-y-1 text-sm">
                  {Object.entries(importStats.transactionTypes).map(([type, count]) => (
                    <div key={type} className="flex justify-between">
                      <span>{type}:</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Import Results */}
        {importResult && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Import Results</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{importResult.totalImported}</div>
                <div className="text-sm text-gray-600">Total Imported</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{importResult.highConfidenceMatches}</div>
                <div className="text-sm text-gray-600">High Confidence</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{importResult.mediumConfidenceMatches}</div>
                <div className="text-sm text-gray-600">Medium Confidence</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{importResult.lowConfidenceMatches}</div>
                <div className="text-sm text-gray-600">Low Confidence</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{importResult.unmatched}</div>
                <div className="text-sm text-gray-600">Unmatched</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Matching Progress</h4>
                <span className="text-sm text-gray-600">
                  {importResult.totalImported - importResult.unmatched} of {importResult.totalImported} matched
                </span>
              </div>
              
              <Progress 
                value={((importResult.totalImported - importResult.unmatched) / importResult.totalImported) * 100} 
                className="h-2"
              />

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {importResult.highConfidenceMatches} High Confidence
                </Badge>
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {importResult.mediumConfidenceMatches} Medium Confidence
                </Badge>
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {importResult.lowConfidenceMatches} Low Confidence
                </Badge>
                <Badge variant="outline" className="text-gray-600 border-gray-600">
                  <X className="h-3 w-3 mr-1" />
                  {importResult.unmatched} Unmatched
                </Badge>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <Button asChild>
                <a href="/import/revolut/reconciliation">
                  Review Matches & Reconcile
                </a>
              </Button>
            </div>
          </Card>
        )}

        {/* Instructions */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">How to Export from Revolut</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">1</div>
              <p>Open the Revolut app and go to your account</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">2</div>
              <p>{`Tap on "More" → "Statement" → "Generate Statement"`}</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">3</div>
              <p>{`Select your date range and choose "CSV" format`}</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">4</div>
              <p>Download the file and upload it here</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
