// Revolut CSV Parser Utility

import { 
  RevolutCSVRow, 
  RevolutTransaction, 
  RevolutTransactionType, 
  RevolutTransactionState,
  RevolutImportStats,
  parseRevolutDate,
  parseRevolutAmount,
  isIncomeTransaction
} from './revolut-types';

export class RevolutCSVParser {
  private static readonly REQUIRED_HEADERS = [
    'Type',
    'Product', 
    'Started Date',
    'Completed Date',
    'Description',
    'Amount',
    'Fee',
    'Currency',
    'State',
    'Balance'
  ];

  /**
   * Parse CSV text content into Revolut transactions
   */
  static parseCSV(csvContent: string): RevolutTransaction[] {
    const lines = csvContent.trim().split('\n');
    
    if (lines.length < 2) {
      throw new Error('CSV file must contain at least a header row and one data row');
    }

    const headers = this.parseCSVRow(lines[0]);
    this.validateHeaders(headers);

    const transactions: RevolutTransaction[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const row = this.parseCSVRow(lines[i]);
        const csvRow = this.mapRowToObject(headers, row);
        const transaction = this.parseTransaction(csvRow);
        
        // Only include completed transactions for now
        if (transaction.state === 'COMPLETED') {
          transactions.push(transaction);
        }
      } catch (error) {
        console.warn(`Error parsing row ${i + 1}:`, error);
        // Continue processing other rows
      }
    }

    return transactions;
  }

  /**
   * Parse a single CSV row, handling quoted values and commas
   */
  private static parseCSVRow(row: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  /**
   * Validate that all required headers are present
   */
  private static validateHeaders(headers: string[]): void {
    const missingHeaders = this.REQUIRED_HEADERS.filter(
      required => !headers.includes(required)
    );
    
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
    }
  }

  /**
   * Map array of values to object using headers
   */
  private static mapRowToObject(headers: string[], values: string[]): RevolutCSVRow {
    const obj: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });
    
    return obj as unknown as RevolutCSVRow;
  }

  /**
   * Parse a CSV row object into a RevolutTransaction
   */
  private static parseTransaction(row: RevolutCSVRow): RevolutTransaction {
    // Normalize type: convert to uppercase and replace spaces with underscores
    const type = row.Type.toUpperCase().replace(/\s+/g, '_') as RevolutTransactionType;
    // Normalize state: convert to uppercase
    const state = row.State.toUpperCase() as RevolutTransactionState;

    if (!this.isValidTransactionType(type)) {
      throw new Error(`Invalid transaction type: ${type}`);
    }

    if (!this.isValidTransactionState(state)) {
      throw new Error(`Invalid transaction state: ${state}`);
    }

    const startedDate = parseRevolutDate(row['Started Date']);
    const completedDate = row['Completed Date'] ? parseRevolutDate(row['Completed Date']) : null;
    const amount = parseRevolutAmount(row.Amount);
    const fee = parseRevolutAmount(row.Fee);
    const balance = parseRevolutAmount(row.Balance);

    return {
      type,
      product: row.Product,
      startedDate,
      completedDate,
      description: row.Description,
      amount,
      fee,
      currency: row.Currency,
      state,
      balance
    };
  }

  /**
   * Check if transaction type is valid
   */
  private static isValidTransactionType(type: string): type is RevolutTransactionType {
    const validTypes: RevolutTransactionType[] = [
      'TOPUP', 'CARD_PAYMENT', 'TRANSFER', 'FEE', 'CHARGE', 
      'CASHBACK', 'REV_PAYMENT', 'REV_PAYMENT_REFUND', 'CARD_REFUND', 'TEMP_BLOCK'
    ];
    return validTypes.includes(type as RevolutTransactionType);
  }

  /**
   * Check if transaction state is valid
   */
  private static isValidTransactionState(state: string): state is RevolutTransactionState {
    const validStates: RevolutTransactionState[] = ['COMPLETED', 'REVERTED', 'PENDING'];
    return validStates.includes(state as RevolutTransactionState);
  }

  /**
   * Generate statistics from parsed transactions
   */
  static generateStats(transactions: RevolutTransaction[]): RevolutImportStats {
    if (transactions.length === 0) {
      return {
        totalTransactions: 0,
        completedTransactions: 0,
        revertedTransactions: 0,
        dateRange: {
          earliest: new Date(),
          latest: new Date()
        },
        transactionTypes: {} as Record<RevolutTransactionType, number>,
        totalAmount: 0,
        incomeAmount: 0,
        expenditureAmount: 0
      };
    }

    const stats: RevolutImportStats = {
      totalTransactions: transactions.length,
      completedTransactions: transactions.filter(t => t.state === 'COMPLETED').length,
      revertedTransactions: transactions.filter(t => t.state === 'REVERTED').length,
      dateRange: {
        earliest: new Date(Math.min(...transactions.map(t => t.startedDate.getTime()))),
        latest: new Date(Math.max(...transactions.map(t => t.startedDate.getTime())))
      },
      transactionTypes: {} as Record<RevolutTransactionType, number>,
      totalAmount: 0,
      incomeAmount: 0,
      expenditureAmount: 0
    };

    // Count transaction types and calculate amounts
    transactions.forEach(transaction => {
      // Count types
      stats.transactionTypes[transaction.type] = 
        (stats.transactionTypes[transaction.type] || 0) + 1;

      // Calculate amounts (only for completed transactions)
      if (transaction.state === 'COMPLETED') {
        const absAmount = Math.abs(transaction.amount);
        stats.totalAmount += absAmount;

        if (isIncomeTransaction(transaction)) {
          stats.incomeAmount += absAmount;
        } else {
          stats.expenditureAmount += absAmount;
        }
      }
    });

    return stats;
  }

  /**
   * Filter transactions by date range
   */
  static filterByDateRange(
    transactions: RevolutTransaction[], 
    startDate: Date, 
    endDate: Date
  ): RevolutTransaction[] {
    return transactions.filter(transaction => {
      const transactionDate = transaction.startedDate;
      return transactionDate >= startDate && transactionDate <= endDate;
    });
  }

  /**
   * Filter transactions by type
   */
  static filterByType(
    transactions: RevolutTransaction[], 
    types: RevolutTransactionType[]
  ): RevolutTransaction[] {
    return transactions.filter(transaction => types.includes(transaction.type));
  }

  /**
   * Filter transactions by state
   */
  static filterByState(
    transactions: RevolutTransaction[], 
    states: RevolutTransactionState[]
  ): RevolutTransaction[] {
    return transactions.filter(transaction => states.includes(transaction.state));
  }

  /**
   * Sort transactions by date (newest first by default)
   */
  static sortByDate(
    transactions: RevolutTransaction[], 
    ascending: boolean = false
  ): RevolutTransaction[] {
    return [...transactions].sort((a, b) => {
      const dateA = a.startedDate.getTime();
      const dateB = b.startedDate.getTime();
      return ascending ? dateA - dateB : dateB - dateA;
    });
  }

  /**
   * Validate CSV file before processing
   */
  static validateCSVFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        reject(new Error('File must be a CSV file'));
        return;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        reject(new Error('File size must be less than 10MB'));
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (!content) {
          reject(new Error('Failed to read file content'));
          return;
        }

        try {
          // Basic validation - check if it looks like a Revolut CSV
          const lines = content.trim().split('\n');
          if (lines.length < 2) {
            reject(new Error('CSV file appears to be empty or invalid'));
            return;
          }

          const headers = this.parseCSVRow(lines[0]);
          this.validateHeaders(headers);
          
          resolve(content);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }
}
