'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/ui/icons';
import { useTransactionMetadata } from '@/hooks/use-transaction-metadata';
import { useCategorySuggestions, type CategorySuggestion } from '@/hooks/use-category-suggestions';
import { CategorySuggestionCard } from './category-suggestion-card';
import { CategoryPicker } from '@/components/categories/category-picker';
import { toast } from 'sonner';
import { FileText, Save, Edit3, StickyNote, X, Receipt, Lightbulb } from 'lucide-react';

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

interface TransactionDetailPanelProps {
  transaction: Transaction;
  isOpen: boolean;
  onClose: () => void;
  onTransactionUpdate?: () => void;
}

// Simple debounce utility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function TransactionDetailPanel({
  transaction,
  isOpen,
  onClose,
  onTransactionUpdate,
}: TransactionDetailPanelProps) {
  const [notes, setNotes] = useState('');
  const [extendedDescription, setExtendedDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);

  const {
    getMetadataForTransaction,
    updateMetadata,
  } = useTransactionMetadata();
  
  const {
    getSuggestionsForTransaction,
    acceptSuggestion,
    updateCategory,
    isUpdatingCategory
  } = useCategorySuggestions();

  // Load existing metadata
  const metadata = getMetadataForTransaction(transaction.id);

  // Initialize form data when metadata loads or transaction changes
  useEffect(() => {
    if (metadata) {
      setNotes(metadata.user_notes || '');
      setExtendedDescription(metadata.extended_description || '');
    } else {
      setNotes('');
      setExtendedDescription('');
    }
    setHasUnsavedChanges(false);
  }, [metadata, transaction.id]);

  // Auto-save functionality with debounce
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSave = useCallback(
    debounce(async (notesValue: string, descriptionValue: string) => {
      if (!hasUnsavedChanges) return;
      
      setIsSaving(true);
      try {
        await updateMetadata({
          transaction_id: transaction.id,
          user_notes: notesValue.trim() || null,
          extended_description: descriptionValue.trim() || null,
        });
        setHasUnsavedChanges(false);
        toast.success('Notes auto-saved');
      } catch (error) {
        console.error('Auto-save failed:', error);
        toast.error('Auto-save failed');
      } finally {
        setIsSaving(false);
      }
    }, 3000),
    [updateMetadata, transaction.id, hasUnsavedChanges]
  );

  // Trigger auto-save when notes or description change
  useEffect(() => {
    if (hasUnsavedChanges) {
      debouncedSave(notes, extendedDescription);
    }
  }, [notes, extendedDescription, hasUnsavedChanges, debouncedSave]);

  // Handle notes change
  const handleNotesChange = (value: string) => {
    setNotes(value);
    setHasUnsavedChanges(true);
  };

  // Handle extended description change
  const handleExtendedDescriptionChange = (value: string) => {
    setExtendedDescription(value);
    setHasUnsavedChanges(true);
  };

  // Get category suggestions
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const loadSuggestions = async () => {
    if (!transaction.category_id) {
      setLoadingSuggestions(true);
      try {
        const suggestions = await getSuggestionsForTransaction(
          transaction.description,
          transaction.amount
        );
        setSuggestions(suggestions);
      } catch (error) {
        console.error('Error loading suggestions:', error);
      } finally {
        setLoadingSuggestions(false);
      }
    }
  };

  const handleAcceptSuggestion = async (suggestion: CategorySuggestion) => {
    try {
      await acceptSuggestion({
        transactionId: transaction.id,
        categoryId: suggestion.category_id,
        description: transaction.description,
        patternId: suggestion.pattern_id,
      });
      setSuggestions(suggestions.filter(s => s !== suggestion));
      onTransactionUpdate?.();
      toast.success('Category suggestion applied');
    } catch {
      toast.error('Failed to apply suggestion');
    }
  };

  const handleManualSave = async () => {
    setIsSaving(true);
    try {
      await updateMetadata({
        transaction_id: transaction.id,
        user_notes: notes.trim() || null,
        extended_description: extendedDescription.trim() || null,
      });
      setHasUnsavedChanges(false);
      toast.success('Notes saved successfully');
    } catch {
      toast.error('Failed to save notes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCategoryChange = async (categoryId: string) => {
    try {
      await updateCategory({
        transactionId: transaction.id,
        categoryId: categoryId,
      });

      // Wait a brief moment for cache to refresh
      await new Promise(resolve => setTimeout(resolve, 100));

      setIsEditingCategory(false);
      onTransactionUpdate?.();
    } catch (error) {
      // Error toast already handled by mutation
      console.error('Failed to update category:', error);
    }
  };

  const handleClearCategory = async () => {
    try {
      await updateCategory({
        transactionId: transaction.id,
        categoryId: null,
      });

      // Wait a brief moment for cache to refresh
      await new Promise(resolve => setTimeout(resolve, 100));

      setIsEditingCategory(false);
      onTransactionUpdate?.();
    } catch (error) {
      // Error toast already handled by mutation
      console.error('Failed to clear category:', error);
    }
  };

  const notesCharCount = notes.length;
  const descriptionCharCount = extendedDescription.length;
  const maxChars = 1000;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Transaction Details
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6 p-6">
          {/* Transaction Info */}
          <div className="bg-muted rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Transaction Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground font-medium">Description:</span>
                <p className="font-semibold text-foreground mt-1">{transaction.description}</p>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Amount:</span>
                <p className="font-semibold text-foreground mt-1">
                  {transaction.type === 'expenditure' ? '-' : ''}£
                  {Math.abs(transaction.amount).toFixed(2)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Date:</span>
                <p className="font-semibold text-foreground mt-1">
                  {new Date(transaction.transaction_date).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Type:</span>
                <Badge variant="outline" className="capitalize mt-1">
                  {transaction.type}
                </Badge>
              </div>
            </div>
            
            {/* Category Section */}
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Category:</span>
                {!isEditingCategory && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingCategory(true)}
                    className="h-7 px-2"
                  >
                    <Edit3 className="h-3 w-3 mr-1" />
                    {transaction.category ? 'Edit' : 'Assign'}
                  </Button>
                )}
              </div>

              {isEditingCategory ? (
                <div className="mt-2 space-y-2">
                  <CategoryPicker
                    type={transaction.type}
                    value={transaction.category_id}
                    onValueChange={handleCategoryChange}
                    placeholder="Select a category"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingCategory(false)}
                      disabled={isUpdatingCategory}
                    >
                      Cancel
                    </Button>
                    {transaction.category_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearCategory}
                        disabled={isUpdatingCategory}
                        className="text-red-600 hover:text-red-700"
                      >
                        Clear Category
                      </Button>
                    )}
                  </div>
                </div>
              ) : transaction.category ? (
                <Badge
                  style={{ backgroundColor: transaction.category.color }}
                  className="mt-2 text-white"
                >
                  {transaction.category.name}
                </Badge>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">No category assigned</p>
              )}
            </div>
          </div>

          {/* Category Suggestions */}
          {!transaction.category_id && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Category Suggestions
                  </h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={loadSuggestions}
                    disabled={loadingSuggestions}
                  >
                    {loadingSuggestions ? (
                      <Icons.spinner className="h-4 w-4 animate-spin" />
                    ) : (
                      <Lightbulb className="h-4 w-4" />
                    )}
                    Get Suggestions
                  </Button>
                </div>
                
                {suggestions.length > 0 && (
                  <div className="space-y-2">
                    {suggestions.map((suggestion, index) => (
                      <CategorySuggestionCard
                        key={index}
                        suggestion={suggestion}
                        onAccept={() => handleAcceptSuggestion(suggestion)}
                        onReject={() => {
                          setSuggestions(suggestions.filter(s => s !== suggestion));
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <Separator />

          {/* Enhanced Notes Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <StickyNote className="h-5 w-5" />
                Notes & Additional Details
                {(notes || extendedDescription) && (
                  <Badge variant="secondary" className="ml-2">
                    Has Notes
                  </Badge>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {isSaving && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icons.spinner className="h-3 w-3 animate-spin" />
                    Saving...
                  </div>
                )}
                {hasUnsavedChanges && !isSaving && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-orange-600">Unsaved changes</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleManualSave}
                      disabled={isSaving}
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Save Now
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Notes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Quick Notes</label>
                  <span className={`text-xs ${notesCharCount > maxChars ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {notesCharCount}/{maxChars}
                  </span>
                </div>
                <Textarea
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="Add quick notes about this transaction..."
                  className="min-h-[120px] resize-none"
                  maxLength={maxChars}
                />
                <p className="text-xs text-muted-foreground">
                  Auto-saves after 3 seconds of inactivity
                </p>
              </div>

              {/* Extended Description */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Extended Description</label>
                  <span className={`text-xs ${descriptionCharCount > maxChars ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {descriptionCharCount}/{maxChars}
                  </span>
                </div>
                <Textarea
                  value={extendedDescription}
                  onChange={(e) => handleExtendedDescriptionChange(e.target.value)}
                  placeholder="Add detailed description, context, or additional information..."
                  className="min-h-[120px] resize-none"
                  maxLength={maxChars}
                />
                <p className="text-xs text-muted-foreground">
                  For longer descriptions and detailed context
                </p>
              </div>
            </div>

            {/* Notes Preview (when not empty) */}
            {(notes || extendedDescription) && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <h4 className="font-medium text-primary mb-2">Notes Summary</h4>
                {notes && (
                  <div className="mb-2">
                    <span className="text-sm font-medium text-primary">Quick Notes:</span>
                    <p className="text-sm text-primary/80 mt-1">{notes}</p>
                  </div>
                )}
                {extendedDescription && (
                  <div>
                    <span className="text-sm font-medium text-primary">Extended Description:</span>
                    <p className="text-sm text-primary/80 mt-1">{extendedDescription}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
