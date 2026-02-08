'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Download, Search, Filter, TrendingUp, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { useIncomeTransactions } from '@/hooks/use-income-transactions';
import { useCategories } from '@/hooks/use-categories';
import { DateRangePicker, DateRange, filterTransactionsByDateRange } from '@/components/ui/date-range-picker';
import { format } from 'date-fns';

type SortField = 'date' | 'description' | 'amount' | 'category';
type SortDirection = 'asc' | 'desc';

export default function IncomeTransactionsReport() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null, preset: 'all' });
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const { data: allTransactions = [], isLoading } = useIncomeTransactions();
  const { data: categories = [] } = useCategories();

  // Filter income categories
  const incomeCategories = categories.filter(cat => cat.type === 'income');

  // Filter transactions by date range first
  const dateFilteredTransactions = useMemo(() => 
    filterTransactionsByDateRange(allTransactions, dateRange), 
    [allTransactions, dateRange]
  );

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    const filtered = dateFilteredTransactions.filter(transaction => {
      // Search filter
      const matchesSearch = (transaction.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (transaction.category?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      // Category filter
      const matchesCategory = selectedCategory === 'all' || transaction.category?.id === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });

    // Sort transactions
    filtered.sort((a, b) => {
      let aValue: string | number | Date, bValue: string | number | Date;
      
      switch (sortField) {
        case 'date':
          aValue = new Date(a.transaction_date);
          bValue = new Date(b.transaction_date);
          break;
        case 'description':
          aValue = (a.description || '').toLowerCase();
          bValue = (b.description || '').toLowerCase();
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'category':
          aValue = a.category?.name.toLowerCase() || '';
          bValue = b.category?.name.toLowerCase() || '';
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [dateFilteredTransactions, searchTerm, selectedCategory, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Description', 'Amount', 'Category'];
    const csvData = filteredTransactions.map(transaction => [
      format(new Date(transaction.transaction_date), 'dd/MM/yyyy'),
      transaction.description || '',
      `£${transaction.amount.toFixed(2)}`,
      transaction.category?.name || 'Uncategorized'
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `income-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totalAmount = filteredTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/reports" className="flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Reports</span>
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Income Transactions Report</h1>
              <p className="text-gray-600">Detailed analysis of all income transactions</p>
            </div>
          </div>
          <Button onClick={exportToCSV} className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filters & Search</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Category</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {incomeCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="col-span-2">
                <DateRangePicker value={dateRange} onChange={setDateRange} />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Summary</label>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      Total: £{totalAmount.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    {filteredTransactions.length} transactions
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Income Transactions</CardTitle>
            <CardDescription>
              {filteredTransactions.length} of {allTransactions.length} transactions shown
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">Loading transactions...</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4">
                        <button
                          onClick={() => handleSort('date')}
                          className="flex items-center space-x-1 font-medium text-gray-900 hover:text-blue-600"
                        >
                          <span>Date</span>
                          <ArrowUpDown className="h-4 w-4" />
                        </button>
                      </th>
                      <th className="text-left py-3 px-4">
                        <button
                          onClick={() => handleSort('description')}
                          className="flex items-center space-x-1 font-medium text-gray-900 hover:text-blue-600"
                        >
                          <span>Description</span>
                          <ArrowUpDown className="h-4 w-4" />
                        </button>
                      </th>
                      <th className="text-left py-3 px-4">
                        <button
                          onClick={() => handleSort('category')}
                          className="flex items-center space-x-1 font-medium text-gray-900 hover:text-blue-600"
                        >
                          <span>Category</span>
                          <ArrowUpDown className="h-4 w-4" />
                        </button>
                      </th>
                      <th className="text-right py-3 px-4">
                        <button
                          onClick={() => handleSort('amount')}
                          className="flex items-center justify-end space-x-1 font-medium text-gray-900 hover:text-blue-600"
                        >
                          <span>Amount</span>
                          <ArrowUpDown className="h-4 w-4" />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {format(new Date(transaction.transaction_date), 'dd/MM/yyyy')}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {transaction.description || ''}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {transaction.category?.name || 'Uncategorized'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-right text-green-600">
                          £{transaction.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredTransactions.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-500">No transactions found matching your criteria</div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
