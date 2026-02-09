'use client';

import { useState } from 'react';
import { ArrowLeft, CheckCircle, AlertCircle, X, Eye, ThumbsUp, ThumbsDown, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useImportedTransactions, useUpdateMatchStatus, useBulkProcessMatches, useVerifyMatch } from '@/hooks/use-revolut-import';
import { MatchConfidence, MatchStatus } from '@/lib/revolut-types';
import Link from 'next/link';

type FilterType = 'all' | 'matched' | 'potential' | 'unmatched' | 'reviewed';
type ConfidenceFilter = 'all' | 'HIGH' | 'MEDIUM' | 'LOW';

export default function ReconciliationPage() {
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>('all');
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);

  const { data: importedTransactions, isLoading } = useImportedTransactions();
  const updateMatchStatus = useUpdateMatchStatus();
  const bulkProcessMatches = useBulkProcessMatches();
  const verifyMatch = useVerifyMatch();

  // Filter transactions based on selected filters
  const filteredTransactions = importedTransactions?.filter(transaction => {
    if (statusFilter !== 'all' && transaction.match_status !== statusFilter) {
      return false;
    }
    if (confidenceFilter !== 'all' && transaction.match_confidence !== confidenceFilter) {
      return false;
    }
    return true;
  }) || [];

  const handleSelectTransaction = (transactionId: string) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId);
    } else {
      newSelected.add(transactionId);
    }
    setSelectedTransactions(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTransactions.size === filteredTransactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(filteredTransactions.map(t => t.id)));
    }
  };

  const handleAcceptMatch = async (transactionId: string) => {
    try {
      await updateMatchStatus.mutateAsync({
        importedTransactionId: transactionId,
        status: 'matched'
      });
    } catch (error) {
      console.error('Failed to accept match:', error);
    }
  };

  const handleRejectMatch = async (transactionId: string) => {
    try {
      await updateMatchStatus.mutateAsync({
        importedTransactionId: transactionId,
        status: 'reviewed'
      });
    } catch (error) {
      console.error('Failed to reject match:', error);
    }
  };

  const handleVerifyMatch = async (transactionId: string, existingDescription: string) => {
    try {
      await verifyMatch.mutateAsync({
        importedTransactionId: transactionId,
        existingTransactionDescription: existingDescription
      });
    } catch (error) {
      console.error('Failed to verify match:', error);
    }
  };

  const handleBulkAccept = async () => {
    if (selectedTransactions.size === 0) return;
    
    try {
      await bulkProcessMatches.mutateAsync({
        transactionIds: Array.from(selectedTransactions),
        action: 'accept'
      });
      setSelectedTransactions(new Set());
    } catch (error) {
      console.error('Failed to bulk accept:', error);
    }
  };

  const handleBulkReject = async () => {
    if (selectedTransactions.size === 0) return;
    
    try {
      await bulkProcessMatches.mutateAsync({
        transactionIds: Array.from(selectedTransactions),
        action: 'reject'
      });
      setSelectedTransactions(new Set());
    } catch (error) {
      console.error('Failed to bulk reject:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(dateString));
  };

  const getConfidenceBadge = (confidence: MatchConfidence | null) => {
    if (!confidence) return null;
    
    const variants = {
      HIGH: 'text-green-600 border-green-600 bg-green-50',
      MEDIUM: 'text-yellow-600 border-yellow-600 bg-yellow-50',
      LOW: 'text-orange-600 border-orange-600 bg-orange-50'
    };

    return (
      <Badge variant="outline" className={variants[confidence]}>
        {confidence} Confidence
      </Badge>
    );
  };

  const getStatusBadge = (status: MatchStatus) => {
    const variants = {
      matched: 'text-green-600 border-green-600 bg-green-50',
      potential: 'text-yellow-600 border-yellow-600 bg-yellow-50',
      unmatched: 'text-muted-foreground border-muted-foreground bg-muted',
      reviewed: 'text-blue-600 border-blue-600 bg-blue-50',
      verified: 'text-purple-600 border-purple-600 bg-purple-50'
    };

    const labels = {
      matched: 'Matched',
      potential: 'Potential',
      unmatched: 'Unmatched',
      reviewed: 'Reviewed',
      verified: 'Verified'
    };

    return (
      <Badge variant="outline" className={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading imported transactions...</p>
        </div>
      </div>
    );
  }

  if (!importedTransactions || importedTransactions.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto py-12 px-6">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">No Imported Transactions</h1>
            <p className="text-muted-foreground">
              You need to import transactions first before you can reconcile them.
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
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto py-12 px-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/import/revolut">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Import
                </Link>
              </Button>
              <h1 className="text-3xl font-bold text-foreground">Transaction Reconciliation</h1>
            </div>
            <p className="text-muted-foreground">
              Review and approve transaction matches. High confidence matches are likely correct.
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button asChild className="bg-red-600 hover:bg-red-700">
              <Link href="/import/revolut/commit">
                <CheckCircle className="h-4 w-4 mr-2" />
                Commit Import
              </Link>
            </Button>
          </div>
        </div>

        {/* Filters and Bulk Actions */}
        <Card className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FilterType)}
                className="px-3 py-1 border border-border rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="matched">Matched</option>
                <option value="potential">Potential</option>
                <option value="unmatched">Unmatched</option>
                <option value="reviewed">Reviewed</option>
              </select>

              <select
                value={confidenceFilter}
                onChange={(e) => setConfidenceFilter(e.target.value as ConfidenceFilter)}
                className="px-3 py-1 border border-border rounded-md text-sm"
              >
                <option value="all">All Confidence</option>
                <option value="HIGH">High Confidence</option>
                <option value="MEDIUM">Medium Confidence</option>
                <option value="LOW">Low Confidence</option>
              </select>
            </div>

            {selectedTransactions.size > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {selectedTransactions.size} selected
                </span>
                <Button
                  size="sm"
                  onClick={handleBulkAccept}
                  disabled={bulkProcessMatches.isPending}
                >
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkReject}
                  disabled={bulkProcessMatches.isPending}
                >
                  <ThumbsDown className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>Showing {filteredTransactions.length} of {importedTransactions.length} transactions</span>
            </div>
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleSelectAll}
            >
              {selectedTransactions.size === filteredTransactions.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
        </Card>

        {/* Transaction List */}
        <div className="space-y-4">
          {filteredTransactions.map((transaction) => (
            <Card key={transaction.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.has(transaction.id)}
                    onChange={() => handleSelectTransaction(transaction.id)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 space-y-3">
                    {/* Imported Transaction */}
                    <div className="border-l-4 border-blue-500 pl-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-foreground">Imported Transaction</h3>
                        <div className="flex items-center space-x-2">
                          {getConfidenceBadge(transaction.match_confidence)}
                          {getStatusBadge(transaction.match_status)}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Date:</span>
                          <div className="font-medium">{formatDate(transaction.started_date)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Amount:</span>
                          <div className={`font-medium ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(transaction.amount)}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Type:</span>
                          <div className="font-medium">{transaction.revolut_type}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Description:</span>
                          <div className="font-medium">{transaction.original_description}</div>
                        </div>
                      </div>
                    </div>

                    {/* Existing Transaction Match */}
                    {transaction.existing_description && (
                      <div className="border-l-4 border-green-500 pl-4">
                        <h3 className="font-medium text-foreground mb-2">Matched Existing Transaction</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Date:</span>
                            <div className="font-medium">{formatDate(transaction.existing_date || '')}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Amount:</span>
                            <div className="font-medium text-green-600">
                              {/* Amount from existing transaction would be shown here */}
                              {formatCurrency(Math.abs(transaction.amount))}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Category:</span>
                            <div className="font-medium">
                              {transaction.existing_category_name && (
                                <Badge 
                                  variant="outline" 
                                  style={{ 
                                    borderColor: transaction.existing_category_color,
                                    color: transaction.existing_category_color 
                                  }}
                                >
                                  {transaction.existing_category_name}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Description:</span>
                            <div className="font-medium">{transaction.existing_description}</div>
                          </div>
                        </div>

                        {/* Match Reasons */}
                        {transaction.match_reasons && transaction.match_reasons.length > 0 && (
                          <div className="mt-3">
                            <span className="text-muted-foreground text-sm">Match Reasons:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {transaction.match_reasons.map((reason, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {reason}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* No Match */}
                    {!transaction.existing_description && transaction.match_status === 'unmatched' && (
                      <div className="border-l-4 border-border pl-4">
                        <h3 className="font-medium text-muted-foreground mb-2">No Match Found</h3>
                        <p className="text-sm text-muted-foreground">
                          {`This transaction doesn't match any existing manual entries.
                          It may be a new transaction that wasn't manually recorded.`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 ml-4">
                  {(transaction.match_status === 'potential' || transaction.match_status === 'matched') && 
                   transaction.existing_description && (
                    <Button
                      size="sm"
                      variant="default"
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={() => handleVerifyMatch(transaction.id, transaction.existing_description!)}
                      disabled={verifyMatch.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Verify
                    </Button>
                  )}

                  {transaction.match_status === 'potential' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleAcceptMatch(transaction.id)}
                        disabled={updateMatchStatus.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectMatch(transaction.id)}
                        disabled={updateMatchStatus.isPending}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                  
                  {transaction.match_status === 'matched' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectMatch(transaction.id)}
                      disabled={updateMatchStatus.isPending}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  )}

                  {transaction.match_status === 'verified' && (
                    <div className="text-sm text-purple-600 font-medium">
                      ✓ Verified - Data Preserved
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpandedTransaction(
                      expandedTransaction === transaction.id ? null : transaction.id
                    )}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedTransaction === transaction.id && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h4 className="font-medium text-foreground mb-3">Additional Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Revolut Product:</span>
                      <div className="font-medium">{transaction.product}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Currency:</span>
                      <div className="font-medium">{transaction.currency}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Fee:</span>
                      <div className="font-medium">{formatCurrency(transaction.fee)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Balance After:</span>
                      <div className="font-medium">{formatCurrency(transaction.balance)}</div>
                    </div>
                    {transaction.completed_date && (
                      <div>
                        <span className="text-muted-foreground">Completed Date:</span>
                        <div className="font-medium">{formatDate(transaction.completed_date)}</div>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">State:</span>
                      <div className="font-medium">{transaction.state}</div>
                    </div>
                  </div>
                  
                  {transaction.notes && (
                    <div className="mt-4">
                      <span className="text-muted-foreground">Notes:</span>
                      <div className="font-medium">{transaction.notes}</div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>

        {filteredTransactions.length === 0 && (
          <Card className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Transactions Found</h3>
            <p className="text-muted-foreground">
              No transactions match your current filters. Try adjusting the filters above.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
