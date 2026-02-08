'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Eye, EyeOff, Settings, Shield } from 'lucide-react';
import { useCategories } from '@/hooks/use-categories';

interface TransactionImportPreviewProps {
  data: Record<string, string>[];
  fileName: string;
  onImport: (mappedData: ParsedTransaction[], duplicateStrategy: string, transactionType: 'income' | 'expenditure') => void;
  onCancel: () => void;
}

interface ColumnMapping {
  date: string;
  supplier: string;
  description: string;
  amount: string;
  category: string;
}

interface ParsedTransaction {
  date: string;
  supplier: string;
  description: string;
  amount: number;
  category: string;
  originalRow: Record<string, string>;
  fingerprint: string;
  isDuplicate?: boolean;
  duplicateReason?: string;
}

const DUPLICATE_STRATEGIES = [
  { value: 'skip', label: 'Skip Duplicates', description: 'Skip importing duplicate transactions' },
  { value: 'import', label: 'Import All', description: 'Import all transactions including duplicates' },
  { value: 'update', label: 'Update Existing', description: 'Update existing transactions with new data' },
];

export function TransactionImportPreview({ data, fileName, onImport, onCancel }: TransactionImportPreviewProps) {
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    date: '',
    supplier: '',
    description: '',
    amount: '',
    category: '',
  });
  const [duplicateStrategy, setDuplicateStrategy] = useState('skip');
  const [transactionType, setTransactionType] = useState<'income' | 'expenditure'>('expenditure');
  const [showPreview, setShowPreview] = useState(true);
  const [validationResults, setValidationResults] = useState<{
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
    missingCategories: number;
    issues: string[];
  } | null>(null);

  const { data: categories } = useCategories(transactionType);

  // Get available columns from the data
  const columns = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  // Auto-detect column mappings based on common column names
  useMemo(() => {
    if (columns.length > 0) {
      const mapping: ColumnMapping = {
        date: '',
        supplier: '',
        description: '',
        amount: '',
        category: '',
      };

      columns.forEach(col => {
        const lowerCol = col.toLowerCase();
        if (lowerCol.includes('date') || lowerCol.includes('time')) {
          mapping.date = col;
        } else if (lowerCol.includes('supplier') || lowerCol.includes('merchant') || lowerCol.includes('vendor') || lowerCol.includes('name')) {
          mapping.supplier = col;
        } else if (lowerCol.includes('description') || lowerCol.includes('detail') || lowerCol.includes('memo')) {
          mapping.description = col;
        } else if (lowerCol.includes('amount') || lowerCol.includes('total') || lowerCol.includes('value')) {
          mapping.amount = col;
        } else if (lowerCol.includes('category') || lowerCol.includes('tag') || lowerCol.includes('type')) {
          mapping.category = col;
        }
      });

      setColumnMapping(mapping);
    }
  }, [columns]);

  // Parse and validate transactions
  const parsedTransactions = useMemo(() => {
    if (!data || !columnMapping.date || !columnMapping.supplier || !columnMapping.amount) {
      return [];
    }

    const transactions: ParsedTransaction[] = [];
    const fingerprints = new Set<string>();

    data.forEach((row, index) => {
      try {
        // Parse date
        const dateStr = row[columnMapping.date];
        let dateForStorage: string;
        
        if (dateStr.includes('/')) {
          // Handle DD/MM/YYYY format (UK format)
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]);
            const year = parseInt(parts[2]);
            
            // Validate date parts
            if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) {
              throw new Error('Invalid date values');
            }
            
            // Create timezone-neutral date string in YYYY-MM-DD format
            const paddedMonth = month.toString().padStart(2, '0');
            const paddedDay = day.toString().padStart(2, '0');
            dateForStorage = `${year}-${paddedMonth}-${paddedDay}`;
          } else {
            throw new Error('Invalid date format');
          }
        } else {
          // For other formats, try to parse and convert
          const parsedDate = new Date(dateStr);
          if (isNaN(parsedDate.getTime())) {
            throw new Error('Invalid date');
          }
          dateForStorage = parsedDate.toISOString().split('T')[0];
        }

        // Parse amount
        const amountStr = row[columnMapping.amount].toString().replace(/[£$€,]/g, '');
        const amount = parseFloat(amountStr);
        if (isNaN(amount)) {
          throw new Error('Invalid amount');
        }

        // Get other fields
        const supplier = row[columnMapping.supplier] || '';
        const description = row[columnMapping.description] || '';
        const category = row[columnMapping.category] || '';

        // Create fingerprint for duplicate detection
        const dateKey = dateForStorage;
        const supplierKey = supplier.toLowerCase().trim();
        const amountKey = amount.toFixed(2);
        const descriptionHash = description.toLowerCase().trim().substring(0, 50);
        const fingerprint = `${dateKey}_${supplierKey}_${amountKey}_${descriptionHash}`;

        // Check for duplicates
        const isDuplicate = fingerprints.has(fingerprint);
        if (!isDuplicate) {
          fingerprints.add(fingerprint);
        }

        transactions.push({
          date: dateForStorage,
          supplier,
          description,
          amount,
          category,
          originalRow: row,
          fingerprint,
          isDuplicate,
          duplicateReason: isDuplicate ? 'Exact match found in import data' : undefined,
        });
      } catch (error) {
        console.error(`Error parsing row ${index + 1}:`, error);
      }
    });

    return transactions;
  }, [data, columnMapping]);

  // Validate the mapping and data
  const validateMapping = () => {
    const results = {
      total: parsedTransactions.length,
      valid: 0,
      invalid: 0,
      duplicates: 0,
      missingCategories: 0,
      issues: [] as string[],
    };

    const categoryNames = new Set(categories?.map(c => c.name.toLowerCase()) || []);

    parsedTransactions.forEach((transaction, index) => {
      let isValid = true;

      // Check required fields
      if (!transaction.date || !transaction.supplier || !transaction.amount) {
        results.invalid++;
        results.issues.push(`Row ${index + 1}: Missing required fields`);
        isValid = false;
      }

      // Check category mapping
      if (transaction.category && !categoryNames.has(transaction.category.toLowerCase())) {
        results.missingCategories++;
        if (results.issues.length < 10) { // Limit issues shown
          results.issues.push(`Row ${index + 1}: Category "${transaction.category}" not found`);
        }
      }

      // Check for duplicates
      if (transaction.isDuplicate) {
        results.duplicates++;
      }

      if (isValid) {
        results.valid++;
      }
    });

    setValidationResults(results);
    return results;
  };

  const handleImport = () => {
    const validation = validateMapping();
    if (validation.valid > 0) {
      // Filter out invalid entries based on strategy
      let dataToImport = parsedTransactions.filter(t => t.date && t.supplier && t.amount);
      
      if (duplicateStrategy === 'skip') {
        dataToImport = dataToImport.filter(t => !t.isDuplicate);
      }

      onImport(dataToImport, duplicateStrategy, transactionType);
    }
  };

  const isValidMapping = columnMapping.date && columnMapping.supplier && columnMapping.amount;

  return (
    <div className="space-y-6">
      {/* File Info */}
      <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center space-x-3">
          <CheckCircle className="h-5 w-5 text-blue-600" />
          <div>
            <h4 className="font-medium text-blue-900">File Loaded Successfully</h4>
            <p className="text-sm text-blue-700">
              {fileName} • {data.length} rows • {columns.length} columns
            </p>
          </div>
        </div>
      </div>

      {/* Transaction Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Transaction Type</span>
          </CardTitle>
          <CardDescription>
            {`Select whether you're importing income or expenditure transactions`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <input
                type="radio"
                id="expenditure"
                name="transactionType"
                value="expenditure"
                checked={transactionType === 'expenditure'}
                onChange={(e) => setTransactionType(e.target.value as 'income' | 'expenditure')}
                className="mt-1"
              />
              <div>
                <label htmlFor="expenditure" className="font-medium cursor-pointer text-red-700">
                  Expenditure Transactions
                </label>
                <p className="text-sm text-muted-foreground">Import expenses, purchases, and outgoing payments</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <input
                type="radio"
                id="income"
                name="transactionType"
                value="income"
                checked={transactionType === 'income'}
                onChange={(e) => setTransactionType(e.target.value as 'income' | 'expenditure')}
                className="mt-1"
              />
              <div>
                <label htmlFor="income" className="font-medium cursor-pointer text-green-700">
                  Income Transactions
                </label>
                <p className="text-sm text-muted-foreground">Import sales, revenue, and incoming payments</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Column Mapping */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Map CSV Columns</span>
          </CardTitle>
          <CardDescription>
            Map your CSV columns to the required transaction fields
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Date Column *
              </label>
              <Select value={columnMapping.date} onValueChange={(value) => setColumnMapping(prev => ({ ...prev, date: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select date column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((column) => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">
                Supplier/Merchant Column *
              </label>
              <Select value={columnMapping.supplier} onValueChange={(value) => setColumnMapping(prev => ({ ...prev, supplier: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((column) => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Amount Column *
              </label>
              <Select value={columnMapping.amount} onValueChange={(value) => setColumnMapping(prev => ({ ...prev, amount: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select amount column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((column) => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Description Column
              </label>
              <Select value={columnMapping.description || 'none'} onValueChange={(value) => setColumnMapping(prev => ({ ...prev, description: value === 'none' ? '' : value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select description column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {columns.map((column) => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Category Column
              </label>
              <Select value={columnMapping.category || 'none'} onValueChange={(value) => setColumnMapping(prev => ({ ...prev, category: value === 'none' ? '' : value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {columns.map((column) => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Duplicate Detection Strategy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Duplicate Detection</span>
          </CardTitle>
          <CardDescription>
            Choose how to handle duplicate transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DUPLICATE_STRATEGIES.map((strategy) => (
              <div key={strategy.value} className="flex items-start space-x-3">
                <input
                  type="radio"
                  id={strategy.value}
                  name="duplicateStrategy"
                  value={strategy.value}
                  checked={duplicateStrategy === strategy.value}
                  onChange={(e) => setDuplicateStrategy(e.target.value)}
                  className="mt-1"
                />
                <div>
                  <label htmlFor={strategy.value} className="font-medium cursor-pointer">
                    {strategy.label}
                  </label>
                  <p className="text-sm text-muted-foreground">{strategy.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {isValidMapping && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Transaction Preview</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showPreview ? 'Hide' : 'Show'} Preview
              </Button>
            </CardTitle>
          </CardHeader>
          {showPreview && (
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Showing first 5 transactions from your import
                </div>
                <div className="space-y-2">
                  {parsedTransactions.slice(0, 5).map((transaction, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-sm font-medium">{transaction.date}</div>
                          <div className="text-sm">{transaction.supplier}</div>
                          <div className="text-sm font-medium">£{transaction.amount.toFixed(2)}</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {transaction.category && (
                            <Badge variant="secondary">{transaction.category}</Badge>
                          )}
                          {transaction.isDuplicate && (
                            <Badge variant="destructive">Duplicate</Badge>
                          )}
                        </div>
                      </div>
                      {transaction.description && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {transaction.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Validation Results */}
      {isValidMapping && (
        <Card>
          <CardHeader>
            <CardTitle>Import Validation</CardTitle>
            <CardDescription>
              Review the validation results before importing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={validateMapping} 
              variant="outline" 
              className="mb-4"
            >
              Validate Data
            </Button>
            
            {validationResults && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {validationResults.total}
                    </div>
                    <div className="text-sm text-blue-700">Total</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {validationResults.valid}
                    </div>
                    <div className="text-sm text-green-700">Valid</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {validationResults.duplicates}
                    </div>
                    <div className="text-sm text-yellow-700">Duplicates</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {validationResults.invalid}
                    </div>
                    <div className="text-sm text-red-700">Invalid</div>
                  </div>
                </div>

                {validationResults.issues.length > 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-800">Validation Issues</h4>
                        <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                          {validationResults.issues.slice(0, 5).map((issue: string, index: number) => (
                            <li key={index}>• {issue}</li>
                          ))}
                          {validationResults.issues.length > 5 && (
                            <li>• ... and {validationResults.issues.length - 5} more issues</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleImport}
          disabled={!isValidMapping || !validationResults || validationResults.valid === 0}
        >
          Import {validationResults?.valid || 0} Transactions
        </Button>
      </div>
    </div>
  );
}
