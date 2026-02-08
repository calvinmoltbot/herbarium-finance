// CSV Export Utility Functions
export interface CSVExportOptions {
  filename: string;
  headers: string[];
  data: any[];
  dateRange?: string;
}

export class CSVExporter {
  // Escape CSV field content
  private static escapeCSVField(field: any): string {
    if (field === null || field === undefined) {
      return '';
    }
    
    const stringField = String(field);
    
    // If field contains comma, quote, or newline, wrap in quotes and escape quotes
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    
    return stringField;
  }

  // Convert array of objects to CSV string
  private static arrayToCSV(headers: string[], data: any[]): string {
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => 
      headers.map(header => this.escapeCSVField(row[header])).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
  }

  // Generate filename with timestamp
  private static generateFilename(baseName: string, dateRange?: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const dateRangePart = dateRange ? `_${dateRange.replace(/\s+/g, '_')}` : '';
    return `${baseName}${dateRangePart}_${timestamp}.csv`;
  }

  // Download CSV file
  private static downloadCSV(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

  // Export transactions to CSV
  static exportTransactions(transactions: any[], dateRange?: string): void {
    const headers = [
      'transaction_id',
      'date',
      'description',
      'amount',
      'type',
      'category_name',
      'category_type',
      'user_notes',
      'extended_description',
      'tags',
      'created_at',
      'updated_at'
    ];

    const data = transactions.map(transaction => ({
      transaction_id: transaction.id,
      date: transaction.transaction_date,
      description: transaction.description || '',
      amount: transaction.amount,
      type: transaction.type,
      category_name: transaction.category?.name || 'Uncategorized',
      category_type: transaction.category?.type || '',
      user_notes: transaction.metadata?.user_notes || '',
      extended_description: transaction.metadata?.extended_description || '',
      tags: transaction.metadata?.tags ? transaction.metadata.tags.join('; ') : '',
      created_at: transaction.created_at,
      updated_at: transaction.updated_at
    }));

    const csvContent = this.arrayToCSV(headers, data);
    const filename = this.generateFilename('transactions', dateRange);
    
    this.downloadCSV(csvContent, filename);
  }

  // Export P&L summary to CSV
  static exportPLSummary(plData: any, dateRange?: string): void {
    const headers = [
      'section_type',
      'hierarchy_name',
      'category_name',
      'amount',
      'transaction_count',
      'is_uncategorized'
    ];

    const data: any[] = [];

    // Add income data
    plData.income?.forEach((hierarchy: any) => {
      hierarchy.categories?.forEach((category: any) => {
        data.push({
          section_type: 'Income',
          hierarchy_name: hierarchy.name,
          category_name: category.name,
          amount: category.total_amount,
          transaction_count: category.transaction_count,
          is_uncategorized: hierarchy.id.startsWith('uncategorized-') ? 'Yes' : 'No'
        });
      });
    });

    // Add expenditure data
    plData.expenditure?.forEach((hierarchy: any) => {
      hierarchy.categories?.forEach((category: any) => {
        data.push({
          section_type: 'Expenditure',
          hierarchy_name: hierarchy.name,
          category_name: category.name,
          amount: category.total_amount,
          transaction_count: category.transaction_count,
          is_uncategorized: hierarchy.id.startsWith('uncategorized-') ? 'Yes' : 'No'
        });
      });
    });

    // Add capital data
    plData.capital?.forEach((hierarchy: any) => {
      hierarchy.categories?.forEach((category: any) => {
        data.push({
          section_type: 'Capital',
          hierarchy_name: hierarchy.name,
          category_name: category.name,
          amount: category.total_amount,
          transaction_count: category.transaction_count,
          is_uncategorized: hierarchy.id.startsWith('uncategorized-') ? 'Yes' : 'No'
        });
      });
    });

    // Add totals
    data.push({
      section_type: 'TOTAL',
      hierarchy_name: 'Income Total',
      category_name: '',
      amount: plData.totals?.total_income || 0,
      transaction_count: '',
      is_uncategorized: 'No'
    });

    data.push({
      section_type: 'TOTAL',
      hierarchy_name: 'Expenditure Total',
      category_name: '',
      amount: plData.totals?.total_expenditure || 0,
      transaction_count: '',
      is_uncategorized: 'No'
    });

    data.push({
      section_type: 'TOTAL',
      hierarchy_name: 'Net Operating Profit',
      category_name: '',
      amount: plData.totals?.net_operating_profit || 0,
      transaction_count: '',
      is_uncategorized: 'No'
    });

    data.push({
      section_type: 'TOTAL',
      hierarchy_name: 'Capital Movements Total',
      category_name: '',
      amount: plData.totals?.total_capital_movements || 0,
      transaction_count: '',
      is_uncategorized: 'No'
    });

    data.push({
      section_type: 'TOTAL',
      hierarchy_name: 'Profit After Capital Movements',
      category_name: '',
      amount: plData.totals?.profit_after_capital_movements || 0,
      transaction_count: '',
      is_uncategorized: 'No'
    });

    const csvContent = this.arrayToCSV(headers, data);
    const filename = this.generateFilename('pl_summary', dateRange);
    
    this.downloadCSV(csvContent, filename);
  }

  // Export P&L detailed transactions to CSV
  static exportPLDetailed(plData: any, dateRange?: string): void {
    const headers = [
      'section_type',
      'hierarchy_name',
      'category_name',
      'transaction_id',
      'date',
      'description',
      'amount',
      'transaction_type',
      'is_uncategorized'
    ];

    const data: any[] = [];

    // Helper function to add transactions from a section
    const addTransactions = (sections: any[], sectionType: string) => {
      sections?.forEach((hierarchy: any) => {
        hierarchy.categories?.forEach((category: any) => {
          category.transactions?.forEach((transaction: any) => {
            data.push({
              section_type: sectionType,
              hierarchy_name: hierarchy.name,
              category_name: category.name,
              transaction_id: transaction.id,
              date: transaction.date,
              description: transaction.description,
              amount: transaction.amount,
              transaction_type: transaction.type,
              is_uncategorized: hierarchy.id.startsWith('uncategorized-') ? 'Yes' : 'No'
            });
          });
        });
      });
    };

    // Add all transactions
    addTransactions(plData.income, 'Income');
    addTransactions(plData.expenditure, 'Expenditure');
    addTransactions(plData.capital, 'Capital');

    const csvContent = this.arrayToCSV(headers, data);
    const filename = this.generateFilename('pl_detailed', dateRange);
    
    this.downloadCSV(csvContent, filename);
  }
}
