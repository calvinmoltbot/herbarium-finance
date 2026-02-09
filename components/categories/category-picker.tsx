'use client';

import { useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCategories, useCategoryMutations, type Category } from '@/hooks/use-categories';

const DEFAULT_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#6B7280', // Gray
  '#10B981', // Emerald
];

// Modal component for category creation
interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'income' | 'expenditure' | 'capital';
  onSuccess: (category: Category) => void;
}

function CategoryModal({ isOpen, onClose, type, onSuccess }: CategoryModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_COLORS[0]);
  const { createCategory } = useCategoryMutations();

  const handleSubmit = async (e?: React.FormEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    
    if (!name.trim()) {
      return;
    }

    try {
      const result = await createCategory.mutateAsync({
        name: name.trim(),
        type,
        color,
      });
      
      onSuccess(result);
      setName('');
      setColor(DEFAULT_COLORS[0]);
      onClose();
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  };

  const handleClose = () => {
    setName('');
    setColor(DEFAULT_COLORS[0]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            Create New {
              type === 'income' ? 'Income' : 
              type === 'capital' ? 'Capital' : 'Expenditure'
            } Category
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="category-name" className="text-sm font-medium text-foreground">
              Category Name
            </Label>
            <Input
              id="category-name"
              placeholder="Enter category name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit(e);
                } else if (e.key === 'Escape') {
                  handleClose();
                }
              }}
              autoFocus
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-foreground mb-2 block">
              Category Color
            </Label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_COLORS.map((colorOption) => (
                <button
                  key={colorOption}
                  type="button"
                  onClick={() => setColor(colorOption)}
                  className={`w-8 h-8 rounded-full border-2 hover:scale-110 transition-transform ${
                    color === colorOption ? 'border-border' : 'border-border'
                  }`}
                  style={{ backgroundColor: colorOption }}
                  title={`Select ${colorOption}`}
                >
                  {color === colorOption && (
                    <Check className="h-4 w-4 text-white mx-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!name.trim() || createCategory.isPending}
              className="flex-1"
            >
              {createCategory.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Category
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createCategory.isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CategoryPickerProps {
  type: 'income' | 'expenditure' | 'capital';
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  error?: boolean;
}


export function CategoryPicker({ type, value, onValueChange, placeholder, error }: CategoryPickerProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);
  const { data: categories, isLoading } = useCategories(type);

  const handleCategoryCreated = (newCategory: Category) => {
    // Select the newly created category
    onValueChange(newCategory.id);
  };

  const handleAddNewCategory = () => {
    setSelectOpen(false); // Close the dropdown
    setShowModal(true); // Open the modal
  };

  if (isLoading) {
    return <div className="h-10 bg-muted rounded-md animate-pulse" />;
  }

  if (!categories || categories.length === 0) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800 mb-3">
            No {type} categories found. Create your first category below:
          </p>
          <CreateCategoryForm
            type={type}
            onSuccess={(newCategory) => onValueChange(newCategory.id)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Select 
        value={value || ''} 
        onValueChange={onValueChange}
        open={selectOpen}
        onOpenChange={setSelectOpen}
      >
        <SelectTrigger className={error ? 'border-red-500' : ''}>
          <SelectValue placeholder={placeholder || 'Select a category'} />
        </SelectTrigger>
        <SelectContent>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              <div className="flex items-center">
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: category.color }}
                />
                {category.name}
              </div>
            </SelectItem>
          ))}
          <div className="border-t border-border mt-1 pt-1">
            <button
              type="button"
              onClick={handleAddNewCategory}
              className="flex items-center w-full px-2 py-1.5 text-sm text-foreground hover:bg-muted rounded-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add new category
            </button>
          </div>
        </SelectContent>
      </Select>

      <CategoryModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        type={type}
        onSuccess={handleCategoryCreated}
      />
    </div>
  );
}

// Standalone create category form component
interface CreateCategoryFormProps {
  type: 'income' | 'expenditure' | 'capital';
  onSuccess?: (category: Category) => void;
  onCancel?: () => void;
}

export function CreateCategoryForm({ type, onSuccess, onCancel }: CreateCategoryFormProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_COLORS[0]);
  const { createCategory } = useCategoryMutations();

  const handleSubmit = async (e?: React.FormEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    if (!name.trim()) return;

    try {
      const newCategory = await createCategory.mutateAsync({
        name: name.trim(),
        type,
        color,
      });

      onSuccess?.(newCategory);
      setName('');
      setColor(DEFAULT_COLORS[0]);
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Input
          placeholder="Category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          required
        />
      </div>
      
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Color</Label>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_COLORS.map((colorOption) => (
            <button
              key={colorOption}
              type="button"
              onClick={() => setColor(colorOption)}
              className={`w-6 h-6 rounded-full border-2 ${
                color === colorOption ? 'border-border' : 'border-border'
              }`}
              style={{ backgroundColor: colorOption }}
            >
              {color === colorOption && (
                <Check className="h-3 w-3 text-white mx-auto" />
              )}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex space-x-2">
        <Button
          type="button"
          size="sm"
          disabled={!name.trim() || createCategory.isPending}
          className="flex-1"
          onClick={() => handleSubmit()}
        >
          {createCategory.isPending ? (
            <>
              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-2" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="h-3 w-3 mr-2" />
              Create Category
            </>
          )}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
