'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCategorizationPatterns } from '@/hooks/use-categorization-patterns';
import { useCategories } from '@/hooks/use-categories';
import { PatternMatcher } from '@/lib/pattern-matcher';
import { toast } from 'sonner';
import { Sparkles, Loader2, ChevronDown, ChevronUp, List } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';

export function PatternManagement() {
  const [newPattern, setNewPattern] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all');
  const [isLearning, setIsLearning] = useState(false);
  const [learningResults, setLearningResults] = useState<any>(null);
  const [sortBy, setSortBy] = useState<'confidence' | 'matches' | 'pattern'>('confidence');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [editingPattern, setEditingPattern] = useState<any>(null);
  const [viewingTransactions, setViewingTransactions] = useState<string | null>(null);
  const [matchingTransactions, setMatchingTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  const {
    patterns,
    isLoading,
    addPattern,
    updatePattern,
    deletePattern,
    getPatternsByConfidence,
  } = useCategorizationPatterns();

  const queryClient = useQueryClient();

  const { data: categories = [] } = useCategories();

  const handleAddPattern = () => {
    if (!newPattern.trim() || !selectedCategoryId) {
      toast.error('Please enter a pattern and select a category');
      return;
    }

    // Validate regex pattern
    try {
      new RegExp(newPattern);
    } catch (error) {
      toast.error('Invalid regular expression pattern');
      return;
    }

    addPattern({
      pattern: newPattern.trim(),
      category_id: selectedCategoryId,
      confidence_score: 60, // Default confidence
    });

    setNewPattern('');
    setSelectedCategoryId('');
  };

  const handleTestPattern = () => {
    if (!testDescription.trim()) {
      toast.error('Please enter a description to test');
      return;
    }

    const matches = PatternMatcher.matchPatterns(testDescription, patterns);
    setTestResults(matches);

    if (matches.length === 0) {
      toast.info('No pattern matches', {
        description: 'This description does not match any of your patterns.',
      });
    } else {
      toast.success(`Found ${matches.length} matching pattern${matches.length > 1 ? 's' : ''}`, {
        description: 'Results displayed below.',
      });
    }
  };

  const handleDeletePattern = (patternId: string) => {
    if (confirm('Are you sure you want to delete this pattern?')) {
      deletePattern(patternId);
    }
  };

  const handleLearnFromHistory = async () => {
    setIsLearning(true);
    setLearningResults(null);

    try {
      const response = await fetch('/api/patterns/learn', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to learn patterns');
      }

      setLearningResults(data);

      if (data.success) {
        // Refetch patterns after learning
        queryClient.invalidateQueries({ queryKey: ['categorization-patterns'] });

        if (data.totalTransactions === 0) {
          toast.info('No transactions found', {
            description: 'Import and categorize transactions first to learn patterns.',
          });
        } else {
          toast.success('Pattern learning complete!', {
            description: `Created ${data.patternsCreated}, updated ${data.patternsUpdated} patterns from ${data.totalTransactions} transactions.`,
          });
        }
      } else {
        toast.error('Pattern learning failed', {
          description: data.error || 'Unknown error occurred',
        });
      }
    } catch (error) {
      console.error('Error learning patterns:', error);
      toast.error('Pattern learning failed', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsLearning(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 text-green-800';
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return 'High';
    if (confidence >= 60) return 'Medium';
    return 'Low';
  };

  const filteredPatterns = confidenceFilter === 'all'
    ? patterns
    : getPatternsByConfidence(
        confidenceFilter === 'high' ? 80 : confidenceFilter === 'medium' ? 60 : 0,
        confidenceFilter === 'high' ? 100 : confidenceFilter === 'medium' ? 79 : 59
      );

  // Sort patterns
  const sortedPatterns = [...filteredPatterns].sort((a, b) => {
    let comparison = 0;

    if (sortBy === 'confidence') {
      comparison = a.confidence_score - b.confidence_score;
    } else if (sortBy === 'matches') {
      comparison = a.match_count - b.match_count;
    } else if (sortBy === 'pattern') {
      comparison = a.pattern.localeCompare(b.pattern);
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleEditPattern = (pattern: any) => {
    setEditingPattern(pattern);
  };

  const handleSaveEdit = () => {
    if (!editingPattern) return;

    updatePattern({
      id: editingPattern.id,
      category_id: editingPattern.category_id,
      confidence_score: editingPattern.confidence_score,
    });

    setEditingPattern(null);
  };

  const handleViewTransactions = async (pattern: any) => {
    // Toggle off if clicking the same pattern
    if (viewingTransactions === pattern.id) {
      setViewingTransactions(null);
      setMatchingTransactions([]);
      return;
    }

    setViewingTransactions(pattern.id);
    setLoadingTransactions(true);

    try {
      const supabase = createClient();

      // Fetch all transactions with categories
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select(`
          id,
          description,
          amount,
          transaction_date,
          category:categories(id, name, color)
        `)
        .order('transaction_date', { ascending: false })
        .limit(1000); // Limit to prevent huge queries

      if (error) throw error;

      // Filter transactions that match this pattern
      const regex = new RegExp(pattern.pattern, 'i');
      const matches = (transactions || []).filter((transaction: any) =>
        regex.test(PatternMatcher.normalizeText(transaction.description))
      );

      setMatchingTransactions(matches);

      if (matches.length === 0) {
        toast.info('No transactions found', {
          description: 'No existing transactions match this pattern.',
        });
      }
    } catch (error) {
      console.error('Error fetching matching transactions:', error);
      toast.error('Failed to load transactions');
      setMatchingTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Existing Patterns - MOVED TO TOP */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Your Patterns ({sortedPatterns.length})</CardTitle>
            <div className="flex items-center space-x-2">
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confidence">Confidence</SelectItem>
                  <SelectItem value="matches">Matches</SelectItem>
                  <SelectItem value="pattern">Pattern</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
              <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Confidence</SelectItem>
                  <SelectItem value="high">High (80%+)</SelectItem>
                  <SelectItem value="medium">Medium (60-79%)</SelectItem>
                  <SelectItem value="low">Low (0-59%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sortedPatterns.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No patterns found. Use "Learn from History" below or add patterns manually.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
              {sortedPatterns.map(pattern => (
                <div key={pattern.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {pattern.pattern}
                        </code>
                        <Badge
                          style={{ backgroundColor: pattern.category?.color }}
                          className="text-white"
                        >
                          {pattern.category?.name}
                        </Badge>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Matches: {pattern.match_count}</span>
                        <Badge
                          variant="secondary"
                          className={getConfidenceColor(pattern.confidence_score)}
                        >
                          {getConfidenceLabel(pattern.confidence_score)} ({pattern.confidence_score}%)
                        </Badge>
                        {pattern.last_matched && (
                          <span>
                            Last used: {new Date(pattern.last_matched).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewTransactions(pattern)}
                        className="flex items-center space-x-1"
                      >
                        {viewingTransactions === pattern.id ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            <span>Hide</span>
                          </>
                        ) : (
                          <>
                            <List className="h-4 w-4" />
                            <span>View</span>
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditPattern(pattern)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePattern(pattern.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  {/* Matching Transactions Section */}
                  {viewingTransactions === pattern.id && (
                    <div className="mt-4 pt-4 border-t">
                      {loadingTransactions ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                          <span className="ml-2 text-sm text-gray-600">Loading transactions...</span>
                        </div>
                      ) : matchingTransactions.length === 0 ? (
                        <div className="text-center py-4 text-sm text-gray-500">
                          No transactions match this pattern
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-gray-700">
                              Matching Transactions ({matchingTransactions.length})
                            </h4>
                          </div>
                          <div className="max-h-60 overflow-y-auto space-y-2">
                            {matchingTransactions.map((transaction: any) => (
                              <div
                                key={transaction.id}
                                className="p-3 bg-gray-50 rounded border border-gray-200 text-sm"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 truncate">
                                      {transaction.description}
                                    </p>
                                    <div className="flex items-center space-x-3 mt-1 text-xs text-gray-600">
                                      <span>
                                        {new Date(transaction.transaction_date).toLocaleDateString()}
                                      </span>
                                      <span className="font-medium">
                                        £{transaction.amount.toFixed(2)}
                                      </span>
                                      {transaction.category && (
                                        <Badge
                                          style={{
                                            backgroundColor: Array.isArray(transaction.category)
                                              ? transaction.category[0]?.color
                                              : transaction.category.color,
                                          }}
                                          className="text-white text-xs"
                                        >
                                          {Array.isArray(transaction.category)
                                            ? transaction.category[0]?.name
                                            : transaction.category.name}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Pattern Dialog */}
      {editingPattern && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Edit Pattern</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Pattern</label>
                <Input
                  value={editingPattern.pattern}
                  disabled
                  className="mt-1 bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Pattern cannot be changed</p>
              </div>

              <div>
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={editingPattern.category_id}
                  onValueChange={(value) =>
                    setEditingPattern({ ...editingPattern, category_id: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
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

              <div>
                <label className="text-sm font-medium">Confidence Score</label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={editingPattern.confidence_score}
                  onChange={(e) =>
                    setEditingPattern({
                      ...editingPattern,
                      confidence_score: Math.max(1, Math.min(100, Number(e.target.value))),
                    })
                  }
                  className="mt-1"
                />
              </div>

              <div className="flex space-x-2">
                <Button onClick={handleSaveEdit} className="flex-1">
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingPattern(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Learn from History */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <span>Learn from Historical Data</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-700">
            Automatically analyze your existing categorized transactions to create smart patterns.
            This improves future import suggestions by learning from your past categorization decisions.
          </p>

          <Button
            onClick={handleLearnFromHistory}
            disabled={isLearning}
            className="w-full"
          >
            {isLearning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Learning Patterns...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Learn from History
              </>
            )}
          </Button>

          {learningResults && learningResults.success && (
            <div className="mt-4 p-4 bg-white border rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Transactions Analyzed</p>
                  <p className="text-2xl font-bold text-gray-900">{learningResults.totalTransactions}</p>
                </div>
                <div>
                  <p className="text-gray-600">Patterns Created</p>
                  <p className="text-2xl font-bold text-green-600">{learningResults.patternsCreated}</p>
                </div>
                <div>
                  <p className="text-gray-600">Patterns Updated</p>
                  <p className="text-2xl font-bold text-blue-600">{learningResults.patternsUpdated}</p>
                </div>
                <div>
                  <p className="text-gray-600">Patterns Skipped</p>
                  <p className="text-2xl font-bold text-gray-600">{learningResults.patternsSkipped}</p>
                </div>
              </div>

              {learningResults.topPatterns && learningResults.topPatterns.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium text-sm mb-2">Top Patterns Learned:</h4>
                  <div className="space-y-2">
                    {learningResults.topPatterns.slice(0, 5).map((pattern: any, index: number) => (
                      <div key={index} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                        <code className="font-mono">{pattern.pattern}</code>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="text-xs">
                            {pattern.categoryName}
                          </Badge>
                          <span className="text-gray-600">{pattern.confidence}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add New Pattern */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Pattern</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Pattern (Regular Expression)</label>
            <Input
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              placeholder="e.g., amazon|amzn for Amazon transactions"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use regular expressions to match transaction descriptions. Case insensitive.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Category</label>
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
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

          <Button onClick={handleAddPattern} className="w-full">
            Add Pattern
          </Button>
        </CardContent>
      </Card>

      {/* Test Patterns */}
      <Card>
        <CardHeader>
          <CardTitle>Test Patterns</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Test Description</label>
            <Textarea
              value={testDescription}
              onChange={(e) => setTestDescription(e.target.value)}
              placeholder="Enter a transaction description to test against your patterns..."
              className="mt-1"
            />
          </div>

          <Button onClick={handleTestPattern} variant="outline" className="w-full">
            Test Patterns
          </Button>

          {testDescription && testResults.length === 0 && (
            <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                No patterns match this description. Try testing after adding or learning patterns.
              </p>
            </div>
          )}

          {testResults.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Test Results ({testResults.length} match{testResults.length > 1 ? 'es' : ''}):</h4>
              {testResults.map((result, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge
                        style={{ backgroundColor: result.category.color }}
                        className="text-white"
                      >
                        {result.category.name}
                      </Badge>
                      <Badge variant="secondary">
                        {Math.round(result.confidence * 100)}% confidence
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
