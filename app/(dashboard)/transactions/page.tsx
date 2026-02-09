'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/supabase/client';
import { Button } from '@/components/ui/button';
import { EnhancedTransactionList } from '@/components/transactions/enhanced-transaction-list';
import { RefreshCw, List } from 'lucide-react';
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

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

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

      // Transform the data to handle the categories relationship
      const transformedData = (data || []).map(transaction => ({
        ...transaction,
        category: Array.isArray(transaction.categories) ? transaction.categories[0] : transaction.categories
      }));

      setTransactions(transformedData);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto py-12 px-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <List className="h-12 w-12 text-primary" />
              <h1 className="text-4xl font-bold tracking-tight text-foreground">Transaction Management</h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Manage and categorize your transactions
            </p>
            <div className="flex items-center justify-center">
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Loading transactions...
            </div>
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
            <List className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Transaction Management</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Manage and categorize your transactions with enhanced notes functionality
          </p>
          <div className="flex justify-center">
            <Button onClick={fetchTransactions} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Enhanced Transaction List with Notes Functionality */}
        <EnhancedTransactionList 
          transactions={transactions}
          onTransactionUpdate={fetchTransactions}
        />
      </div>
    </div>
  );
}
