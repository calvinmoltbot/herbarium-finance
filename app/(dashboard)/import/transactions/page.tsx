'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, FileText, CheckCircle, AlertCircle, Database } from 'lucide-react';
import Link from 'next/link';
import { FileUploader } from '@/components/import/file-uploader';
import { TransactionImportPreview } from '@/components/import/transaction-import-preview';
import { ProgressTracker } from '@/components/import/progress-tracker';
import { useTransactionImport } from '@/hooks/import/use-transaction-import';

type ImportStep = 'upload' | 'preview' | 'importing' | 'complete';

export default function ImportTransactionsPage() {
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([]);
  const [importResults, setImportResults] = useState<{ total: number; successful: number; duplicates: number; failed: number; strategy: string; errors: string[]; duplicateDetails?: { transaction: { date: string; supplier: string; description: string; amount: number }; reason: string; fingerprint: string }[] } | null>(null);

  const { importTransactions, isImporting } = useTransactionImport();

  const handleFileUpload = (file: File, data: Record<string, string>[]) => {
    setUploadedFile(file);
    setParsedData(data);
    setCurrentStep('preview');
  };

  const handleImport = async (mappedData: { date: string; supplier: string; description: string; amount: number; category: string; fingerprint: string }[], duplicateStrategy: string, transactionType: 'income' | 'expenditure') => {
    setCurrentStep('importing');
    try {
      const results = await importTransactions(mappedData, duplicateStrategy, transactionType);
      setImportResults(results);
      setCurrentStep('complete');
    } catch (error) {
      console.error('Import failed:', error);
      // Handle error - could show error step
    }
  };

  const handleStartOver = () => {
    setCurrentStep('upload');
    setUploadedFile(null);
    setParsedData([]);
    setImportResults(null);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <FileUploader
            onFileUpload={handleFileUpload}
            acceptedTypes=".csv"
            maxSize={10 * 1024 * 1024} // 10MB
            description="Upload a CSV file containing your transaction data. The file should include columns for date, supplier, description, amount, and category."
          />
        );

      case 'preview':
        return (
          <TransactionImportPreview
            data={parsedData}
            fileName={uploadedFile?.name || ''}
            onImport={handleImport}
            onCancel={() => setCurrentStep('upload')}
          />
        );

      case 'importing':
        return (
          <ProgressTracker
            isImporting={isImporting}
            message="Importing transactions..."
          />
        );

      case 'complete':
        return (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Import Complete!</h3>
              <p className="text-muted-foreground mt-2">
                Your transactions have been successfully imported.
              </p>
            </div>
            {importResults && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Total Processed:</span>
                    <span className="ml-2">{importResults.total}</span>
                  </div>
                  <div>
                    <span className="font-medium">Successfully Imported:</span>
                    <span className="ml-2 text-green-600">{importResults.successful}</span>
                  </div>
                  <div>
                    <span className="font-medium">Duplicates Detected:</span>
                    <span className="ml-2 text-yellow-600">{importResults.duplicates}</span>
                  </div>
                  <div>
                    <span className="font-medium">Failed:</span>
                    <span className="ml-2 text-red-600">{importResults.failed}</span>
                  </div>
                </div>
                {importResults.duplicateDetails && importResults.duplicateDetails.length > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <h4 className="font-medium text-yellow-800 mb-2">Duplicate Detection Summary</h4>
                    <div className="text-sm text-yellow-700">
                      <p>Found {importResults.duplicateDetails.length} potential duplicates</p>
                      <p className="mt-1">Strategy used: {importResults.strategy}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-center space-x-4">
              <Button onClick={handleStartOver} variant="outline">
                Import More Transactions
              </Button>
              <Button asChild>
                <Link href="/dashboard">
                  View Dashboard
                </Link>
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'upload':
        return 'Upload Transaction Data';
      case 'preview':
        return 'Preview & Configure Import';
      case 'importing':
        return 'Importing Transactions';
      case 'complete':
        return 'Import Complete';
      default:
        return 'Import Transactions';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 'upload':
        return 'Select a CSV file containing your transaction data';
      case 'preview':
        return 'Review the data, map columns, and configure duplicate detection';
      case 'importing':
        return 'Please wait while we import your transactions';
      case 'complete':
        return 'Your transactions have been successfully imported';
      default:
        return 'Import your transaction data from a CSV file';
    }
  };

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
            <h1 className="text-3xl font-bold tracking-tight">Import Transactions</h1>
            <p className="text-muted-foreground">
              Bulk import transaction data with smart duplicate detection
            </p>
          </div>
        </div>
        <Database className="h-8 w-8 text-muted-foreground" />
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-4 py-4">
        {[
          { key: 'upload', label: 'Upload', icon: Upload },
          { key: 'preview', label: 'Preview', icon: FileText },
          { key: 'importing', label: 'Import', icon: Database },
          { key: 'complete', label: 'Complete', icon: CheckCircle },
        ].map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.key;
          const isCompleted = ['upload', 'preview', 'importing'].indexOf(currentStep) > ['upload', 'preview', 'importing'].indexOf(step.key);
          
          return (
            <div key={step.key} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                isActive 
                  ? 'border-blue-500 bg-blue-500 text-white' 
                  : isCompleted 
                    ? 'border-green-500 bg-green-500 text-white'
                    : 'border-border bg-card text-muted-foreground'
              }`}>
                <Icon className="h-4 w-4" />
              </div>
              <span className={`ml-2 text-sm font-medium ${
                isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'
              }`}>
                {step.label}
              </span>
              {index < 3 && (
                <div className={`w-8 h-0.5 mx-4 ${
                  isCompleted ? 'bg-green-500' : 'bg-muted'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>{getStepTitle()}</CardTitle>
          <CardDescription>{getStepDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Help Section */}
      {currentStep === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>CSV Format Requirements</CardTitle>
            <CardDescription>
              Ensure your CSV file follows these guidelines for successful import
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-medium">Required Columns</h4>
                  <p className="text-sm text-muted-foreground">
                    Date, Supplier/Merchant, Description, Amount, and Category columns
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-medium">Date Format</h4>
                  <p className="text-sm text-muted-foreground">
                    Supports DD/MM/YYYY, MM/DD/YYYY, and YYYY-MM-DD formats
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-medium">Amount Format</h4>
                  <p className="text-sm text-muted-foreground">
                    Numeric values with optional currency symbols (£ preferred)
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <h4 className="font-medium">Duplicate Detection</h4>
                  <p className="text-sm text-muted-foreground">
                    Smart duplicate detection using date, supplier, amount, and description matching
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
