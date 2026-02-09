'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTransactionMetadata } from '@/hooks/use-transaction-metadata';
import { StickyNote, Save, Search, Filter, FileText, Edit3 } from 'lucide-react';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  type: 'income' | 'expenditure' | 'capital';
  category_id?: string;
  category?: {
    id: string;
    name: string;
    color: string;
  };
}

interface TransactionWithNotes extends Transaction {
  notes?: string;
  extendedDescription?: string;
  hasNotes: boolean;
}

export default function TransactionNotesPage() {
  const [transactions, setTransactions] = useState<TransactionWithNotes[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState('');
  const [editingExtended, setEditingExtended] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  const supabase = createClient();
  const { getMetadataForTransaction, updateMetadata } = useTransactionMetadata();

  useEffect(() => {
    fetchTransactions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          transaction_date,
          description,
          amount,
          type,
          category_id,
          categories (
            id,
            name,
            color
          )
        `)
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      // Transform data and add notes information
      const transformedData = (data || []).map(transaction => {
        const metadata = getMetadataForTransaction(transaction.id);
        return {
          ...transaction,
          category: Array.isArray(transaction.categories) ? transaction.categories[0] : transaction.categories,
          notes: metadata?.user_notes || '',
          extendedDescription: metadata?.extended_description || '',
          hasNotes: !!(metadata?.user_notes || metadata?.extended_description)
        };
      });

      setTransactions(transformedData);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleEditStart = (transaction: TransactionWithNotes) => {
    setEditingTransaction(transaction.id);
    setEditingNotes(transaction.notes || '');
    setEditingExtended(transaction.extendedDescription || '');
  };

  const handleSave = async (transactionId: string) => {
    setSaving(transactionId);
    try {
      await updateMetadata({
        transaction_id: transactionId,
        user_notes: editingNotes.trim() || null,
        extended_description: editingExtended.trim() || null,
      });
      
      // Update local state
      setTransactions(prev => prev.map(t => 
        t.id === transactionId 
          ? { 
              ...t, 
              notes: editingNotes.trim(),
              extendedDescription: editingExtended.trim(),
              hasNotes: !!(editingNotes.trim() || editingExtended.trim())
            }
          : t
      ));
      
      setEditingTransaction(null);
      toast.success('Notes saved successfully');
    } catch {
      toast.error('Failed to save notes');
    } finally {
      setSaving(null);
    }
  };

  const handleCancel = () => {
    setEditingTransaction(null);
    setEditingNotes('');
    setEditingExtended('');
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(transaction => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesDescription = transaction.description.toLowerCase().includes(searchLower);
      const matchesNotes = transaction.notes?.toLowerCase().includes(searchLower);
      const matchesExtended = transaction.extendedDescription?.toLowerCase().includes(searchLower);
      
      if (!matchesDescription && !matchesNotes && !matchesExtended) {
        return false;
      }
    }

    // Type filter
    if (filterType === 'with-notes' && !transaction.hasNotes) {
      return false;
    }
    if (filterType === 'without-notes' && transaction.hasNotes) {
      return false;
    }

    return true;
  });

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto py-12 px-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <StickyNote className="h-12 w-12 text-primary" />
              <h1 className="text-4xl font-bold tracking-tight text-foreground">Transaction Notes</h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Loading transactions...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto py-12 px-6 space-y-8">
        {/* Professional Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <StickyNote className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Transaction Notes</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Add and edit notes for your transactions in one dedicated place
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search transactions and notes
                </label>
                <Input
                  placeholder="Search descriptions, notes, or extended descriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Filter by notes</label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Transactions</SelectItem>
                    <SelectItem value="with-notes">With Notes Only</SelectItem>
                    <SelectItem value="without-notes">Without Notes Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Notes List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Transactions ({filteredTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredTransactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No transactions match your filters.
                </p>
              ) : (
                filteredTransactions.map(transaction => (
                  <Card key={transaction.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-6">
                      {/* Transaction Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{transaction.description}</h3>
                            {transaction.hasNotes && (
                              <Badge variant="secondary" className="text-xs">
                                📝 Has Notes
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{new Date(transaction.transaction_date).toLocaleDateString('en-GB')}</span>
                            <Badge className={getTypeColor(transaction.type)}>
                              {transaction.type}
                            </Badge>
                            <span className="font-medium">
                              {formatAmount(transaction.amount, transaction.type)}
                            </span>
                            {transaction.category && (
                              <Badge
                                style={{ backgroundColor: transaction.category.color }}
                                className="text-white"
                              >
                                {transaction.category.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {editingTransaction === transaction.id ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleSave(transaction.id)}
                                disabled={saving === transaction.id}
                              >
                                {saving === transaction.id ? (
                                  <>Saving...</>
                                ) : (
                                  <>
                                    <Save className="h-4 w-4 mr-1" />
                                    Save
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancel}
                                disabled={saving === transaction.id}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditStart(transaction)}
                            >
                              <Edit3 className="h-4 w-4 mr-1" />
                              Edit Notes
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Notes Section */}
                      {editingTransaction === transaction.id ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-foreground mb-2 block">
                              Quick Notes ({editingNotes.length}/1000)
                            </label>
                            <Textarea
                              value={editingNotes}
                              onChange={(e) => setEditingNotes(e.target.value)}
                              placeholder="Add quick notes about this transaction..."
                              className="min-h-[100px] resize-none"
                              maxLength={1000}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-foreground mb-2 block">
                              Extended Description ({editingExtended.length}/1000)
                            </label>
                            <Textarea
                              value={editingExtended}
                              onChange={(e) => setEditingExtended(e.target.value)}
                              placeholder="Add detailed description or context..."
                              className="min-h-[100px] resize-none"
                              maxLength={1000}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {transaction.notes && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <h4 className="font-medium text-blue-900 mb-1">Quick Notes:</h4>
                              <p className="text-blue-800 text-sm">{transaction.notes}</p>
                            </div>
                          )}
                          {transaction.extendedDescription && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <h4 className="font-medium text-green-900 mb-1">Extended Description:</h4>
                              <p className="text-green-800 text-sm">{transaction.extendedDescription}</p>
                            </div>
                          )}
                          {!transaction.hasNotes && (
                            <div className="bg-muted border border-border rounded-lg p-3 text-center">
                              <p className="text-muted-foreground text-sm">No notes added yet</p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
