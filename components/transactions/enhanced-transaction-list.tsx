'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { TransactionDetailPanel } from './transaction-detail-panel';
import { useTransactionMetadata } from '@/hooks/use-transaction-metadata';
import { useCategorySuggestions } from '@/hooks/use-category-suggestions';
import { useCategories } from '@/hooks/use-categories';
import { StickyNote, FileText, Search, Download } from 'lucide-react';
import { CSVExporter } from '@/lib/csv-export';
import { toast } from 'sonner';

interface Transaction {
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

interface EnhancedTransactionListProps {
  transactions: Transaction[];
  onTransactionUpdate?: () => void;
}

export function EnhancedTransactionList({
  transactions,
  onTransactionUpdate,
}: EnhancedTransactionListProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestionsOnly, setShowSuggestionsOnly] = useState(false);
  const [showNotesOnly, setShowNotesOnly] = useState(false);
  const [hoveredTransaction, setHoveredTransaction] = useState<string | null>(null);

  const { getMetadataForTransaction, allMetadata } = useTransactionMetadata();
  const { getSuggestionsForTransaction } = useCategorySuggestions();
  const { data: categories = [] } = useCategories();

  // Enhanced search function that includes notes content
  const searchInTransaction = (transaction: Transaction, searchTerm: string): boolean => {
    if (!searchTerm) return true;
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    // Search in description
    if (transaction.description.toLowerCase().includes(lowerSearchTerm)) {
      return true;
    }
    
    // Search in notes content
    const metadata = getMetadataForTransaction(transaction.id);
    if (metadata) {
      if (metadata.user_notes?.toLowerCase().includes(lowerSearchTerm)) {
        return true;
      }
      if (metadata.extended_description?.toLowerCase().includes(lowerSearchTerm)) {
        return true;
      }
    }
    
    return false;
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(transaction => {
    // Type filter
    if (typeFilter !== 'all' && transaction.type !== typeFilter) {
      return false;
    }

    // Category filter
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'uncategorized' && transaction.category_id) {
        return false;
      }
      if (categoryFilter !== 'uncategorized' && transaction.category_id !== categoryFilter) {
        return false;
      }
    }

    // Enhanced search filter
    if (!searchInTransaction(transaction, searchTerm)) {
      return false;
    }

    // Suggestions filter
    if (showSuggestionsOnly && transaction.category_id) {
      return false;
    }

    // Notes filter
    if (showNotesOnly) {
      const metadata = getMetadataForTransaction(transaction.id);
      const hasNotes = metadata && (metadata.user_notes || metadata.extended_description);
      if (!hasNotes) {
        return false;
      }
    }

    return true;
  });

  const hasMetadata = (transactionId: string) => {
    const metadata = getMetadataForTransaction(transactionId);
    return metadata && (metadata.user_notes || metadata.extended_description || (metadata.tags && metadata.tags.length > 0));
  };

  const formatAmount = (amount: number, type: string) => {
    const prefix = type === 'expenditure' ? '-' : '';
    return `${prefix}£${Math.abs(amount).toFixed(2)}`;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'income': return 'bg-green-100 text-green-800';
      case 'expenditure': return 'bg-red-100 text-red-800';
      case 'capital': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search (includes notes)
              </label>
              <Input
                placeholder="Search transactions and notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1"
              />
              {searchTerm && (
                <p className="text-xs text-gray-500 mt-1">
                  Searching in descriptions, notes, and extended descriptions
                </p>
              )}
            </div>
            
            <div>
              <label className="text-sm font-medium">Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expenditure">Expenditure</SelectItem>
                  <SelectItem value="capital">Capital</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="uncategorized">Uncategorized</SelectItem>
                  {categories.map(category => (
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
            </div>

            <div className="flex items-end">
              <Button
                variant={showSuggestionsOnly ? "default" : "outline"}
                onClick={() => setShowSuggestionsOnly(!showSuggestionsOnly)}
                className="w-full"
              >
                {showSuggestionsOnly ? 'Show All' : 'Needs Categorization'}
              </Button>
            </div>
          </div>
          
          {/* Additional Filter Buttons */}
          <div className="flex gap-2 justify-between">
            <div className="flex gap-2">
              <Button
                variant={showNotesOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowNotesOnly(!showNotesOnly)}
                className="flex items-center gap-2"
              >
                <StickyNote className="h-4 w-4" />
                {showNotesOnly ? 'Show All' : 'With Notes Only'}
              </Button>
              
              {(showSuggestionsOnly || showNotesOnly || searchTerm || typeFilter !== 'all' || categoryFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowSuggestionsOnly(false);
                    setShowNotesOnly(false);
                    setSearchTerm('');
                    setTypeFilter('all');
                    setCategoryFilter('all');
                  }}
                >
                  Clear All Filters
                </Button>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                try {
                  // Create enhanced transaction data with metadata
                  const enhancedTransactions = filteredTransactions.map(transaction => ({
                    ...transaction,
                    metadata: getMetadataForTransaction(transaction.id)
                  }));
                  
                  const dateRange = filteredTransactions.length > 0 
                    ? `${Math.min(...filteredTransactions.map(t => new Date(t.transaction_date).getTime()))} to ${Math.max(...filteredTransactions.map(t => new Date(t.transaction_date).getTime()))}`
                    : 'filtered';
                  
                  CSVExporter.exportTransactions(enhancedTransactions, 'filtered_transactions');
                  toast.success(`Exported ${enhancedTransactions.length} transactions to CSV`);
                } catch (error) {
                  toast.error('Failed to export transactions');
                }
              }}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV ({filteredTransactions.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transaction List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Transactions ({filteredTransactions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredTransactions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No transactions match your filters.
              </p>
            ) : (
              filteredTransactions.map(transaction => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedTransaction(transaction)}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(transaction.transaction_date).toLocaleDateString()}
                        </p>
                      </div>
                      
                      {hasMetadata(transaction.id) && (
                        <Badge variant="secondary" className="text-xs">
                          📝 Notes
                        </Badge>
                      )}
                      
                      {!transaction.category_id && (
                        <Badge variant="outline" className="text-xs text-orange-600">
                          Needs Category
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Badge className={getTypeColor(transaction.type)}>
                      {transaction.type}
                    </Badge>
                    
                    {transaction.category && (
                      <Badge
                        style={{ backgroundColor: transaction.category.color }}
                        className="text-white"
                      >
                        {transaction.category.name}
                      </Badge>
                    )}
                    
                    <div className="text-right">
                      <p className="font-medium">
                        {formatAmount(transaction.amount, transaction.type)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transaction Detail Panel */}
      {selectedTransaction && (
        <TransactionDetailPanel
          transaction={selectedTransaction}
          isOpen={!!selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onTransactionUpdate={() => {
            onTransactionUpdate?.();
            setSelectedTransaction(null);
          }}
        />
      )}
    </div>
  );
}
