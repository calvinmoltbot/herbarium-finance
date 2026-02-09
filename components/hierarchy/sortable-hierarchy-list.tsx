'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CategoryHierarchyWithCategories } from '@/hooks/use-category-hierarchies';

interface SortableItemProps {
  hierarchy: CategoryHierarchyWithCategories;
  availableCategories: Array<{
    id: string;
    name: string;
    type: string;
    color?: string;
  }>;
  onDeleteHierarchy: (hierarchyId: string, hierarchyName: string) => void;
  onAssignCategory: (categoryId: string, hierarchyId: string) => void;
  onRemoveCategory: (categoryId: string, hierarchyId: string) => void;
}

function SortableItem({
  hierarchy,
  availableCategories,
  onDeleteHierarchy,
  onAssignCategory,
  onRemoveCategory,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: hierarchy.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-lg p-4 bg-card ${isDragging ? 'shadow-lg' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h4 className="font-medium text-lg">{hierarchy.name}</h4>
            <p className="text-sm text-muted-foreground">Order: {hierarchy.display_order}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">{hierarchy.categories.length} categories</Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeleteHierarchy(hierarchy.id, hierarchy.name)}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>
      
      {hierarchy.categories.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-3">
          {hierarchy.categories.map((category) => (
            <Badge 
              key={category.id} 
              variant="secondary"
              className="flex items-center gap-1"
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              {category.name}
              <button
                onClick={() => onRemoveCategory(category.id, hierarchy.id)}
                className="ml-1 hover:text-red-600"
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-3">No categories assigned</p>
      )}

      <Select
        onValueChange={(categoryId) => {
          onAssignCategory(categoryId, hierarchy.id);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Assign a category..." />
        </SelectTrigger>
        <SelectContent>
          {availableCategories
            .filter(cat => !hierarchy.categories.some(hCat => hCat.id === cat.id))
            .map((category) => (
              <SelectItem key={category.id} value={category.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  {category.name}
                </div>
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface SortableHierarchyListProps {
  hierarchies: CategoryHierarchyWithCategories[];
  availableCategories: Array<{
    id: string;
    name: string;
    type: string;
    color?: string;
  }>;
  onReorder: (hierarchies: CategoryHierarchyWithCategories[]) => void;
  onDeleteHierarchy: (hierarchyId: string, hierarchyName: string) => void;
  onAssignCategory: (categoryId: string, hierarchyId: string) => void;
  onRemoveCategory: (categoryId: string, hierarchyId: string) => void;
  type: 'income' | 'expenditure' | 'capital';
}

export function SortableHierarchyList({
  hierarchies,
  availableCategories,
  onReorder,
  onDeleteHierarchy,
  onAssignCategory,
  onRemoveCategory,
  type,
}: SortableHierarchyListProps) {
  const [items, setItems] = useState(hierarchies);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Update items when hierarchies prop changes
  useEffect(() => {
    setItems(hierarchies);
  }, [hierarchies]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over?.id);
      
      const newItems = arrayMove(items, oldIndex, newIndex);
      
      // Update display orders
      const updatedItems = newItems.map((item, index) => ({
        ...item,
        display_order: index + 1,
      }));
      
      setItems(updatedItems);
      onReorder(updatedItems);
    }
  }

  if (hierarchies.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <div className="h-12 w-12 mx-auto mb-4 text-muted-foreground">
          <GripVertical className="h-full w-full" />
        </div>
        <p>No {type} hierarchies yet</p>
        <p className="text-sm">{`Create your first hierarchy above or use "Setup Defaults"`}</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map(h => h.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {items.map((hierarchy) => (
            <SortableItem
              key={hierarchy.id}
              hierarchy={hierarchy}
              availableCategories={availableCategories}
              onDeleteHierarchy={onDeleteHierarchy}
              onAssignCategory={onAssignCategory}
              onRemoveCategory={onRemoveCategory}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
