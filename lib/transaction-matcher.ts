// Transaction Matching Engine
// Intelligently matches imported Revolut transactions with existing manual entries

import { 
  RevolutTransaction, 
  TransactionMatch, 
  MatchConfidence, 
  MatchStatus,
  ImportedTransaction,
  isIncomeTransaction,
  getTransactionDescription
} from './revolut-types';

interface ExistingTransaction {
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
}

export class TransactionMatcher {
  private static readonly DATE_TOLERANCE_DAYS = 2;
  private static readonly DESCRIPTION_SIMILARITY_THRESHOLD = 0.6;
  private static readonly HIGH_CONFIDENCE_THRESHOLD = 0.9;
  private static readonly MEDIUM_CONFIDENCE_THRESHOLD = 0.6;

  /**
   * Match imported Revolut transactions with existing transactions
   */
  static matchTransactions(
    importedTransactions: ImportedTransaction[],
    existingTransactions: ExistingTransaction[]
  ): TransactionMatch[] {
    const matches: TransactionMatch[] = [];

    for (const imported of importedTransactions) {
      const match = this.findBestMatch(imported, existingTransactions);
      matches.push(match);
    }

    return matches;
  }

  /**
   * Find the best match for a single imported transaction
   */
  private static findBestMatch(
    imported: ImportedTransaction,
    existingTransactions: ExistingTransaction[]
  ): TransactionMatch {
    let bestMatch: ExistingTransaction | undefined;
    let bestScore = 0;
    let matchReasons: string[] = [];

    for (const existing of existingTransactions) {
      const { score, reasons } = this.calculateMatchScore(imported, existing);
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = existing;
        matchReasons = reasons;
      }
    }

    const confidence = this.getMatchConfidence(bestScore);
    const status = this.getMatchStatus(confidence, bestScore);

    return {
      importedTransaction: imported,
      existingTransaction: bestMatch,
      matchConfidence: confidence,
      matchReasons,
      suggestedCategory: bestMatch?.category,
      status
    };
  }

  /**
   * Calculate match score between imported and existing transaction
   */
  private static calculateMatchScore(
    imported: ImportedTransaction,
    existing: ExistingTransaction
  ): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    // 1. Amount matching (40% weight)
    const amountMatch = this.compareAmounts(imported.amount, existing.amount);
    if (amountMatch.isExact) {
      score += 0.4;
      reasons.push('Exact amount match');
    } else if (amountMatch.isClose) {
      score += 0.2;
      reasons.push('Similar amount');
    }

    // 2. Date matching (30% weight)
    const dateMatch = this.compareDates(imported.started_date, existing.transaction_date);
    if (dateMatch.isExact) {
      score += 0.3;
      reasons.push('Same date');
    } else if (dateMatch.isWithinTolerance) {
      score += 0.15;
      reasons.push(`Date within ${dateMatch.daysDifference} days`);
    }

    // 3. Description similarity (20% weight)
    const descriptionSimilarity = this.compareDescriptions(
      imported.original_description, 
      existing.description
    );
    if (descriptionSimilarity > this.DESCRIPTION_SIMILARITY_THRESHOLD) {
      score += 0.2 * descriptionSimilarity;
      reasons.push(`Description similarity: ${Math.round(descriptionSimilarity * 100)}%`);
    }

    // 4. Transaction type matching (10% weight)
    const typeMatch = this.compareTransactionTypes(imported, existing);
    if (typeMatch) {
      score += 0.1;
      reasons.push('Transaction type matches');
    }

    return { score, reasons };
  }

  /**
   * Compare amounts with tolerance for rounding differences
   */
  private static compareAmounts(
    importedAmount: number, 
    existingAmount: number
  ): { isExact: boolean; isClose: boolean } {
    const absImported = Math.abs(importedAmount);
    const absExisting = Math.abs(existingAmount);
    
    const isExact = Math.abs(absImported - absExisting) < 0.01;
    const isClose = Math.abs(absImported - absExisting) < 1.0;

    return { isExact, isClose };
  }

  /**
   * Compare dates with tolerance
   */
  private static compareDates(
    importedDate: string, 
    existingDate: string
  ): { isExact: boolean; isWithinTolerance: boolean; daysDifference: number } {
    const imported = new Date(importedDate);
    const existing = new Date(existingDate);
    
    // Reset time to compare dates only
    imported.setHours(0, 0, 0, 0);
    existing.setHours(0, 0, 0, 0);
    
    const daysDifference = Math.abs(
      (imported.getTime() - existing.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const isExact = daysDifference === 0;
    const isWithinTolerance = daysDifference <= this.DATE_TOLERANCE_DAYS;

    return { isExact, isWithinTolerance, daysDifference };
  }

  /**
   * Compare description similarity using simple string matching
   */
  private static compareDescriptions(
    importedDescription: string, 
    existingDescription: string
  ): number {
    const imported = this.normalizeDescription(importedDescription);
    const existing = this.normalizeDescription(existingDescription);

    // Simple similarity calculation
    return this.calculateStringSimilarity(imported, existing);
  }

  /**
   * Normalize description for comparison
   */
  private static normalizeDescription(description: string): string {
    return description
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Calculate string similarity using Jaccard similarity
   */
  private static calculateStringSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(' '));
    const words2 = new Set(str2.split(' '));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * Compare transaction types (income vs expenditure)
   */
  private static compareTransactionTypes(
    imported: ImportedTransaction,
    existing: ExistingTransaction
  ): boolean {
    // Convert imported transaction to income/expenditure type
    const importedType = imported.amount > 0 ? 'income' : 'expenditure';
    return importedType === existing.type;
  }

  /**
   * Determine match confidence based on score
   */
  private static getMatchConfidence(score: number): MatchConfidence {
    if (score >= this.HIGH_CONFIDENCE_THRESHOLD) {
      return 'HIGH';
    } else if (score >= this.MEDIUM_CONFIDENCE_THRESHOLD) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  /**
   * Determine match status based on confidence and score
   */
  private static getMatchStatus(confidence: MatchConfidence, score: number): MatchStatus {
    if (score === 0) {
      return 'unmatched';
    } else if (confidence === 'HIGH') {
      return 'matched';
    } else {
      return 'potential';
    }
  }

  /**
   * Filter matches by confidence level
   */
  static filterByConfidence(
    matches: TransactionMatch[], 
    confidence: MatchConfidence
  ): TransactionMatch[] {
    return matches.filter(match => match.matchConfidence === confidence);
  }

  /**
   * Filter matches by status
   */
  static filterByStatus(
    matches: TransactionMatch[], 
    status: MatchStatus
  ): TransactionMatch[] {
    return matches.filter(match => match.status === status);
  }

  /**
   * Get matching statistics
   */
  static getMatchingStats(matches: TransactionMatch[]) {
    const stats = {
      total: matches.length,
      highConfidence: 0,
      mediumConfidence: 0,
      lowConfidence: 0,
      matched: 0,
      potential: 0,
      unmatched: 0,
      withCategories: 0
    };

    matches.forEach(match => {
      // Count by confidence
      switch (match.matchConfidence) {
        case 'HIGH':
          stats.highConfidence++;
          break;
        case 'MEDIUM':
          stats.mediumConfidence++;
          break;
        case 'LOW':
          stats.lowConfidence++;
          break;
      }

      // Count by status
      switch (match.status) {
        case 'matched':
          stats.matched++;
          break;
        case 'potential':
          stats.potential++;
          break;
        case 'unmatched':
          stats.unmatched++;
          break;
      }

      // Count with categories
      if (match.suggestedCategory) {
        stats.withCategories++;
      }
    });

    return stats;
  }

  /**
   * Sort matches by confidence and score
   */
  static sortMatches(matches: TransactionMatch[]): TransactionMatch[] {
    const confidenceOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
    
    return [...matches].sort((a, b) => {
      // First sort by confidence
      const confidenceDiff = confidenceOrder[b.matchConfidence] - confidenceOrder[a.matchConfidence];
      if (confidenceDiff !== 0) return confidenceDiff;
      
      // Then by number of match reasons (more reasons = better match)
      const reasonsDiff = b.matchReasons.length - a.matchReasons.length;
      if (reasonsDiff !== 0) return reasonsDiff;
      
      // Finally by date (newer first)
      const dateA = new Date(a.importedTransaction.started_date);
      const dateB = new Date(b.importedTransaction.started_date);
      return dateB.getTime() - dateA.getTime();
    });
  }

  /**
   * Validate a manual match suggestion
   */
  static validateManualMatch(
    imported: ImportedTransaction,
    existing: ExistingTransaction
  ): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    let isValid = true;

    // Check amount difference
    const amountDiff = Math.abs(Math.abs(imported.amount) - Math.abs(existing.amount));
    if (amountDiff > 1.0) {
      warnings.push(`Large amount difference: £${amountDiff.toFixed(2)}`);
    }

    // Check date difference
    const dateMatch = this.compareDates(imported.started_date, existing.transaction_date);
    if (dateMatch.daysDifference > 7) {
      warnings.push(`Date difference: ${dateMatch.daysDifference} days`);
    }

    // Check transaction type
    const importedType = imported.amount > 0 ? 'income' : 'expenditure';
    if (importedType !== existing.type) {
      warnings.push('Transaction types do not match (income vs expenditure)');
      isValid = false;
    }

    return { isValid, warnings };
  }
}
