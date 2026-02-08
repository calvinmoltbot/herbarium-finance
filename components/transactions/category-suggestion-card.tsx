'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CategorySuggestion } from '@/hooks/use-category-suggestions';

interface CategorySuggestionCardProps {
  suggestion: CategorySuggestion;
  onAccept: () => void;
  onReject: () => void;
}

export function CategorySuggestionCard({
  suggestion,
  onAccept,
  onReject,
}: CategorySuggestionCardProps) {
  const confidencePercentage = Math.round(suggestion.confidence * 100);
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Card className="border-l-4" style={{ borderLeftColor: suggestion.category.color }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Badge
              style={{ backgroundColor: suggestion.category.color }}
              className="text-white"
            >
              {suggestion.category.name}
            </Badge>
            <Badge
              variant="secondary"
              className={getConfidenceColor(suggestion.confidence)}
            >
              {confidencePercentage}% confidence
            </Badge>
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onReject}
              className="text-red-600 hover:text-red-700"
            >
              Reject
            </Button>
            <Button
              size="sm"
              onClick={onAccept}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Accept
            </Button>
          </div>
        </div>
        
        {suggestion.pattern_id && (
          <p className="text-xs text-gray-500 mt-2">
            Based on learned pattern
          </p>
        )}
      </CardContent>
    </Card>
  );
}
