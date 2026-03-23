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
import { StickyNote, Search, Download, Tag } from 'lucide-react';
import { CSVExporter } from '@/lib/csv-export';
import { toast } from 'sonner';
import { useCategorizationPatterns } from '@/hooks/use-categorization-patterns';
import { useNicknameMode } from '@/hooks/use-nickname-mode';
import { PatternMatcher } from '@/lib/pattern-matcher';

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
  const { getMetadataForTransaction } = useTransactionMetadata();
  useCategorySuggestions();
  const { data: categories = [] } = useCategories();
  const { patterns } = useCategorizationPatterns();
  const { showNicknames, toggleNicknames } = useNicknameMode();

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
      default: return 'bg-muted text-foreground';
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card style={{ backgroundColor: '#1e1c27', borderColor: 'transparent' }} className="ring-1 ring-white/5">
        <CardHeader>
          <CardTitle style={{ color: '#e8e6e3' }}>Transaction Filters</CardTitle>
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
                <p className="text-xs text-muted-foreground mt-1">
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
                style={showSuggestionsOnly ? { backgroundColor: '#f59e0b', color: '#17151e' } : undefined}
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
                style={showNotesOnly ? { backgroundColor: '#f59e0b', color: '#17151e' } : undefined}
              >
                <StickyNote className="h-4 w-4" />
                {showNotesOnly ? 'Show All' : 'With Notes Only'}
              </Button>
              
              {(showSuggestionsOnly || showNotesOnly || searchTerm || typeFilter !== 'all' || categoryFilter !== 'all') && (
                <Button
                  variant="secondary"
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
                  
                  CSVExporter.exportTransactions(enhancedTransactions, 'filtered_transactions');
                  toast.success(`Exported ${enhancedTransactions.length} transactions to CSV`);
                } catch {
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
      <Card style={{ backgroundColor: '#1e1c27', borderColor: 'transparent' }} className="ring-1 ring-white/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle style={{ color: '#e8e6e3' }}>
              Transactions ({filteredTransactions.length})
            </CardTitle>
            <Button
              variant={showNicknames ? 'default' : 'outline'}
              size="sm"
              onClick={toggleNicknames}
              className="flex items-center gap-2"
              style={showNicknames ? { backgroundColor: '#f59e0b', color: '#17151e' } : undefined}
            >
              <Tag className="h-4 w-4" />
              {showNicknames ? 'Nicknames On' : 'Nicknames'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredTransactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No transactions match your filters.
              </p>
            ) : (
              filteredTransactions.map((transaction, index) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors"
                  style={{
                    backgroundColor: index % 2 === 0 ? '#1e1c27' : '#222030',
                    borderLeft: selectedTransaction?.id === transaction.id ? '3px solid #f59e0b' : '3px solid transparent',
                  }}
                  onClick={() => setSelectedTransaction(transaction)}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2a2835'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#1e1c27' : '#222030'; }}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div>
                        {(() => {
                          const displayName = showNicknames
                            ? PatternMatcher.resolveDisplayName(transaction.description, patterns)
                            : null;
                          return displayName ? (
                            <>
                              <p className="font-bold">{displayName}</p>
                              <p className="text-xs text-muted-foreground">{transaction.description}</p>
                            </>
                          ) : (
                            <p className="font-medium">{transaction.description}</p>
                          );
                        })()}
                        <p className="text-sm text-muted-foreground">
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
                      <p className="font-medium" style={{
                        color: transaction.type === 'income' ? '#10b981' : transaction.type === 'capital' ? '#7c3aed' : '#f43f5e'
                      }}>
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
