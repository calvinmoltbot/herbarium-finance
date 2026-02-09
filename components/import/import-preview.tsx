'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Eye, EyeOff, Settings } from 'lucide-react';

interface ImportPreviewProps {
  data: Record<string, unknown>[];
  fileName: string;
  onImport: (mappedData: CategoryMapping[]) => void;
  onCancel: () => void;
}

interface CategoryMapping {
  name: string;
  type: 'income' | 'expenditure';
  color: string;
}

const PREDEFINED_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
];

export function ImportPreview({ data, fileName, onImport, onCancel }: ImportPreviewProps) {
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [categoryType, setCategoryType] = useState<'income' | 'expenditure'>('expenditure');
  const [showPreview, setShowPreview] = useState(true);
  const [validationResults, setValidationResults] = useState<{
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
    issues: string[];
  } | null>(null);

  // Get available columns from the data
  const columns = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  // Get unique values from selected column
  const categoryValues = useMemo(() => {
    if (!selectedColumn || !data) return [];
    
    const values = data
      .map(row => row[selectedColumn])
      .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
      .map(value => value.trim());
    
    return [...new Set(values)];
  }, [data, selectedColumn]);

  // Prepare mapped data for import
  const mappedData = useMemo(() => {
    if (!selectedColumn || categoryValues.length === 0) return [];
    
    return categoryValues.map((name, index) => ({
      name,
      type: categoryType,
      color: PREDEFINED_COLORS[index % PREDEFINED_COLORS.length],
    }));
  }, [categoryValues, categoryType, selectedColumn]);

  // Validate the mapping
  const validateMapping = () => {
    const results = {
      total: mappedData.length,
      valid: 0,
      invalid: 0,
      duplicates: 0,
      issues: [] as string[],
    };

    const nameSet = new Set();
    
    mappedData.forEach((category, index) => {
      if (!category.name || category.name.length < 2) {
        results.invalid++;
        results.issues.push(`Row ${index + 1}: Category name too short`);
      } else if (nameSet.has(category.name.toLowerCase())) {
        results.duplicates++;
        results.issues.push(`Row ${index + 1}: Duplicate category "${category.name}"`);
      } else {
        results.valid++;
        nameSet.add(category.name.toLowerCase());
      }
    });

    setValidationResults(results);
    return results;
  };

  const handleImport = () => {
    const validation = validateMapping();
    if (validation.valid > 0) {
      // Filter out invalid entries
      const validData = mappedData.filter(category => 
        category.name && category.name.length >= 2
      );
      onImport(validData);
    }
  };

  return (
    <div className="space-y-6">
      {/* File Info */}
      <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center space-x-3">
          <CheckCircle className="h-5 w-5 text-blue-600" />
          <div>
            <h4 className="font-medium text-blue-900">File Loaded Successfully</h4>
            <p className="text-sm text-blue-700">
              {fileName} • {data.length} rows • {columns.length} columns
            </p>
          </div>
        </div>
      </div>

      {/* Column Mapping */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Configure Import Settings</span>
          </CardTitle>
          <CardDescription>
            Select which column contains the category names and configure the import settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Category Name Column
              </label>
              <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                <SelectTrigger>
                  <SelectValue placeholder="Select column containing category names" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((column) => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">
                Category Type
              </label>
              <Select value={categoryType} onValueChange={(value: 'income' | 'expenditure') => setCategoryType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expenditure">Expenditure</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedColumn && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  Found {categoryValues.length} unique categories
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showPreview ? 'Hide' : 'Show'} Preview
                </Button>
              </div>
              
              {showPreview && (
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {categoryValues.slice(0, 20).map((value, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary"
                      style={{ 
                        backgroundColor: PREDEFINED_COLORS[index % PREDEFINED_COLORS.length] + '20',
                        borderColor: PREDEFINED_COLORS[index % PREDEFINED_COLORS.length],
                        color: PREDEFINED_COLORS[index % PREDEFINED_COLORS.length]
                      }}
                    >
                      {value}
                    </Badge>
                  ))}
                  {categoryValues.length > 20 && (
                    <Badge variant="outline">
                      +{categoryValues.length - 20} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation Results */}
      {selectedColumn && (
        <Card>
          <CardHeader>
            <CardTitle>Import Validation</CardTitle>
            <CardDescription>
              Review the validation results before importing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={validateMapping} 
              variant="outline" 
              className="mb-4"
            >
              Validate Data
            </Button>
            
            {validationResults && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {validationResults.total}
                    </div>
                    <div className="text-sm text-blue-700">Total</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {validationResults.valid}
                    </div>
                    <div className="text-sm text-green-700">Valid</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {validationResults.invalid + validationResults.duplicates}
                    </div>
                    <div className="text-sm text-red-700">Issues</div>
                  </div>
                </div>

                {validationResults.issues.length > 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-800">Validation Issues</h4>
                        <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                          {validationResults.issues.slice(0, 5).map((issue: string, index: number) => (
                            <li key={index}>• {issue}</li>
                          ))}
                          {validationResults.issues.length > 5 && (
                            <li>• ... and {validationResults.issues.length - 5} more issues</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleImport}
          disabled={!selectedColumn || !validationResults || validationResults.valid === 0}
        >
          Import {validationResults?.valid || 0} Categories
        </Button>
      </div>
    </div>
  );
}
