// Revolut Import Types and Interfaces

export interface RevolutCSVRow {
  Type: string;
  Product: string;
  'Started Date': string;
  'Completed Date': string;
  Description: string;
  Amount: string;
  Fee: string;
  Currency: string;
  State: string;
  Balance: string;
}

export interface RevolutTransaction {
  type: RevolutTransactionType;
  product: string;
  startedDate: Date;
  completedDate: Date | null;
  description: string;
  amount: number;
  fee: number;
  currency: string;
  state: RevolutTransactionState;
  balance: number;
}

export type RevolutTransactionType = 
  | 'TOPUP'
  | 'CARD_PAYMENT'
  | 'TRANSFER'
  | 'FEE'
  | 'CHARGE'
  | 'CASHBACK'
  | 'REV_PAYMENT'
  | 'REV_PAYMENT_REFUND'
  | 'CARD_REFUND'
  | 'TEMP_BLOCK';

export type RevolutTransactionState = 
  | 'COMPLETED'
  | 'REVERTED'
  | 'PENDING';

export interface ImportedTransaction {
  id: string;
  user_id: string;
  revolut_type: RevolutTransactionType;
  product: string;
  started_date: string;
  completed_date: string | null;
  original_description: string;
  amount: number;
  fee: number;
  currency: string;
  state: RevolutTransactionState;
  balance: number;
  matched_transaction_id: string | null;
  match_confidence: MatchConfidence | null;
  match_status: MatchStatus;
  match_reasons: string[] | null;
  suggested_category_id: string | null;
  processed: boolean;
  reviewed: boolean;
  verified: boolean;
  verification_note: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Fields from matched_transactions_view
  existing_description?: string;
  existing_date?: string;
  existing_type?: 'income' | 'expenditure';
  existing_category_name?: string;
  existing_category_color?: string;
}

export type MatchConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export type MatchStatus = 'matched' | 'potential' | 'unmatched' | 'reviewed' | 'verified';

export interface TransactionMatch {
  importedTransaction: ImportedTransaction;
  existingTransaction?: {
    id: string;
    description: string;
    amount: number;
    transaction_date: string;
    type: 'income' | 'expenditure';
    category?: {
      id: string;
      name: string;
      color: string;
      type: 'income' | 'expenditure';
    };
  };
  matchConfidence: MatchConfidence;
  matchReasons: string[];
  suggestedCategory?: {
    id: string;
    name: string;
    color: string;
    type: 'income' | 'expenditure';
  };
  status: MatchStatus;
}

export interface MatchingResult {
  totalImported: number;
  highConfidenceMatches: number;
  mediumConfidenceMatches: number;
  lowConfidenceMatches: number;
  unmatched: number;
  matches: TransactionMatch[];
}

export interface RevolutImportStats {
  totalTransactions: number;
  completedTransactions: number;
  revertedTransactions: number;
  dateRange: {
    earliest: Date;
    latest: Date;
  };
  transactionTypes: Record<RevolutTransactionType, number>;
  totalAmount: number;
  incomeAmount: number;
  expenditureAmount: number;
}

// Utility functions for transaction type mapping
export const getTransactionTypeCategory = (type: RevolutTransactionType): 'income' | 'expenditure' | 'neutral' => {
  switch (type) {
    case 'TOPUP':
    case 'CASHBACK':
    case 'REV_PAYMENT_REFUND':
    case 'CARD_REFUND':
      return 'income';
    case 'CARD_PAYMENT':
    case 'FEE':
    case 'CHARGE':
      return 'expenditure';
    case 'TRANSFER':
    case 'REV_PAYMENT':
    case 'TEMP_BLOCK':
      return 'neutral'; // These could be either, depends on amount sign
    default:
      return 'neutral';
  }
};

export const isIncomeTransaction = (transaction: RevolutTransaction): boolean => {
  const typeCategory = getTransactionTypeCategory(transaction.type);
  if (typeCategory === 'income') return true;
  if (typeCategory === 'expenditure') return false;
  // For neutral types, check the amount
  return transaction.amount > 0;
};

export const getTransactionDescription = (transaction: RevolutTransaction): string => {
  // Clean up common Revolut description patterns
  let description = transaction.description;
  
  // Remove common prefixes
  description = description.replace(/^Payment from /, '');
  description = description.replace(/^To /, '');
  description = description.replace(/^Apple Pay Top-Up by \*\d+/, 'Apple Pay Top-Up');
  
  return description.trim();
};

// Date parsing utility for Revolut format (supports both YYYY-MM-DD HH:MM:SS and DD/MM/YYYY HH:MM)
export const parseRevolutDate = (dateString: string): Date => {
  if (!dateString || dateString.trim() === '') {
    throw new Error('Invalid date string: empty or null');
  }
  
  const trimmedDate = dateString.trim();
  
  // Check if it's ISO format (YYYY-MM-DD HH:MM:SS)
  if (trimmedDate.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
    const date = new Date(trimmedDate);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid ISO date: ${trimmedDate}`);
    }
    return date;
  }
  
  // Check if it's DD/MM/YYYY HH:MM format
  if (trimmedDate.match(/^\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2}$/)) {
    const [datePart, timePart] = trimmedDate.split(' ');
    const [day, month, year] = datePart.split('/');
    const [hours, minutes] = timePart.split(':');
    
    const date = new Date(
      parseInt(year),
      parseInt(month) - 1, // Month is 0-indexed
      parseInt(day),
      parseInt(hours),
      parseInt(minutes)
    );
    
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid DD/MM/YYYY date: ${trimmedDate}`);
    }
    return date;
  }
  
  // Try parsing as a general date string
  const date = new Date(trimmedDate);
  if (isNaN(date.getTime())) {
    throw new Error(`Unable to parse date: ${trimmedDate}`);
  }
  
  return date;
};

// Amount parsing utility
export const parseRevolutAmount = (amountString: string): number => {
  if (!amountString) return 0;
  return parseFloat(amountString.replace(/[^\d.-]/g, ''));
};
