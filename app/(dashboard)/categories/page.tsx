'use client';

import { useState } from 'react';
import { Plus, Edit, Trash2, ArrowLeft, BarChart3, Settings, Layers, AlertTriangle, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageLayout } from '@/components/ui/page-layout';
import { useCategories, useCategoryMutations, useCategoryStats } from '@/hooks/use-categories';
import { useCategoryHierarchiesWithCategories, useCreateCategoryHierarchy, useAssignCategoryToHierarchy, useRemoveCategoryFromHierarchy, useSetupDefaultHierarchies, useDeleteCategoryHierarchy, useReorderCategoryHierarchies } from '@/hooks/use-category-hierarchies';
import { SortableHierarchyList } from '@/components/hierarchy/sortable-hierarchy-list';
import { CollapsiblePLPreview } from '@/components/hierarchy/collapsible-pl-preview';
import { CreateCategoryForm } from '@/components/categories/category-picker';
import { UnallocatedCategoriesPanel } from '@/components/categories/unallocated-categories-panel';
import { useUnallocatedCategoriesStats } from '@/hooks/use-unallocated-categories';
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { toast } from 'sonner';
import Link from 'next/link';

export default function CategoriesPage() {
  const [activeTab, setActiveTab] = useState<'categories' | 'hierarchies' | 'unallocated'>('categories');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryColor, setEditingCategoryColor] = useState('');
  const [newHierarchyName, setNewHierarchyName] = useState('');
  const [newHierarchyType, setNewHierarchyType] = useState<'income' | 'expenditure' | 'capital'>('expenditure');

  const { data: allCategories, isLoading } = useCategories();
  const { data: categoryStats } = useCategoryStats();
  const { data: unallocatedStats } = useUnallocatedCategoriesStats();
  const { deleteCategory, updateCategory } = useCategoryMutations();
  const { showConfirmation, ConfirmationDialog } = useConfirmationDialog();
  
  // Hierarchy hooks
  const { data: incomeHierarchies = [] } = useCategoryHierarchiesWithCategories('income');
  const { data: expenditureHierarchies = [] } = useCategoryHierarchiesWithCategories('expenditure');
  const { data: capitalHierarchies = [] } = useCategoryHierarchiesWithCategories('capital');
  const createHierarchy = useCreateCategoryHierarchy();
  const assignCategory = useAssignCategoryToHierarchy();
  const removeCategory = useRemoveCategoryFromHierarchy();
  const setupDefaults = useSetupDefaultHierarchies();
  const deleteHierarchy = useDeleteCategoryHierarchy();
  const reorderHierarchies = useReorderCategoryHierarchies();

  const incomeCategories = allCategories?.filter(cat => cat.type === 'income') || [];
  const expenditureCategories = allCategories?.filter(cat => cat.type === 'expenditure') || [];
  const capitalCategories = allCategories?.filter(cat => cat.type === 'capital') || [];

  const getCategoryStats = (categoryId: string) => {
    return categoryStats?.find(stat => stat.id === categoryId);
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    showConfirmation({
      title: 'Delete Category',
      description: `Are you sure you want to delete the category "${categoryName}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await deleteCategory.mutateAsync(categoryId);
        } catch (error) {
          console.error('Failed to delete category:', error);
        }
      }
    });
  };

  const handleEditCategory = (category: any) => {
    setEditingCategory(category.id);
    setEditingCategoryName(category.name);
    setEditingCategoryColor(category.color || '#3B82F6');
  };

  const handleSaveEdit = async () => {
    if (editingCategory && editingCategoryName.trim()) {
      try {
        await updateCategory.mutateAsync({
          id: editingCategory,
          data: {
            name: editingCategoryName.trim(),
            color: editingCategoryColor
          }
        });
        setEditingCategory(null);
        setEditingCategoryName('');
        setEditingCategoryColor('');
      } catch (error) {
        console.error('Failed to update category:', error);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditingCategoryName('');
    setEditingCategoryColor('');
  };

  const handleCreateHierarchy = () => {
    if (!newHierarchyName.trim()) return;
    
    // Check for duplicates
    const existingHierarchies = newHierarchyType === 'income' ? incomeHierarchies : expenditureHierarchies;
    const isDuplicate = existingHierarchies.some(h => 
      h.name.toLowerCase() === newHierarchyName.trim().toLowerCase()
    );
    
    if (isDuplicate) {
      alert(`A hierarchy named "${newHierarchyName.trim()}" already exists for ${newHierarchyType}.`);
      return;
    }
    
    createHierarchy.mutate({
      name: newHierarchyName.trim(),
      type: newHierarchyType
    });
    setNewHierarchyName('');
  };

  const handleDeleteHierarchy = async (hierarchyId: string, hierarchyName: string) => {
    showConfirmation({
      title: 'Delete Hierarchy',
      description: `Are you sure you want to delete the hierarchy "${hierarchyName}"? This will also remove all category assignments. This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await deleteHierarchy.mutateAsync(hierarchyId);
        } catch (error) {
          console.error('Failed to delete hierarchy:', error);
        }
      }
    });
  };

  const handleCleanupDuplicates = async () => {
    showConfirmation({
      title: 'Clean Duplicate Hierarchies',
      description: 'This will remove duplicate hierarchies with the same name. Are you sure you want to continue?',
      confirmText: 'Clean Duplicates',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          // Find duplicates in income hierarchies
          const incomeNames = new Set();
          const incomeDuplicates = [];
          for (const hierarchy of incomeHierarchies) {
            if (incomeNames.has(hierarchy.name)) {
              incomeDuplicates.push(hierarchy.id);
            } else {
              incomeNames.add(hierarchy.name);
            }
          }

          // Find duplicates in expenditure hierarchies
          const expenditureNames = new Set();
          const expenditureDuplicates = [];
          for (const hierarchy of expenditureHierarchies) {
            if (expenditureNames.has(hierarchy.name)) {
              expenditureDuplicates.push(hierarchy.id);
            } else {
              expenditureNames.add(hierarchy.name);
            }
          }

          // Delete duplicates
          const allDuplicates = [...incomeDuplicates, ...expenditureDuplicates];
          for (const duplicateId of allDuplicates) {
            await deleteHierarchy.mutateAsync(duplicateId);
          }

          if (allDuplicates.length > 0) {
            toast.success(`Removed ${allDuplicates.length} duplicate hierarchies.`);
          } else {
            toast.info('No duplicate hierarchies found.');
          }
        } catch (error) {
          console.error('Failed to cleanup duplicates:', error);
          toast.error('Failed to cleanup duplicates. Please try again.');
        }
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-gray-200 rounded animate-pulse" />
          <div className="h-64 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const headerActions = (
    <>
      <Link href="/dashboard">
        <Button variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </Link>
      
      {activeTab === 'categories' && (
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      )}
      {activeTab === 'hierarchies' && (
        <>
          <Button onClick={() => setupDefaults.mutate()} variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Setup Defaults
          </Button>
          <Button 
            onClick={handleCleanupDuplicates} 
            variant="outline"
            className="text-orange-600 border-orange-300 hover:bg-orange-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clean Duplicates
          </Button>
        </>
      )}
    </>
  );

  return (
    <PageLayout
      title="Category Management"
      description="Manage your income and expenditure categories and hierarchies for better financial organization"
      icon={BarChart3}
      actions={headerActions}
    >

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit mx-auto">
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'categories'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="h-4 w-4 mr-2 inline" />
            Categories
          </button>
          <button
            onClick={() => setActiveTab('unallocated')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors relative ${
              activeTab === 'unallocated'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <AlertTriangle className="h-4 w-4 mr-2 inline" />
            Unallocated
            {unallocatedStats && unallocatedStats.total > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {unallocatedStats.total}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setActiveTab('hierarchies')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'hierarchies'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Layers className="h-4 w-4 mr-2 inline" />
            Hierarchies
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'categories' && (
          <>
            {/* Create Category Form */}
            {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Category</CardTitle>
            <CardDescription>Add a new category for organizing your transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-3">Income Category</h3>
                <CreateCategoryForm
                  type="income"
                  onSuccess={() => setShowCreateForm(false)}
                  onCancel={() => setShowCreateForm(false)}
                />
              </div>
              <div>
                <h3 className="text-lg font-medium mb-3">Expenditure Category</h3>
                <CreateCategoryForm
                  type="expenditure"
                  onSuccess={() => setShowCreateForm(false)}
                  onCancel={() => setShowCreateForm(false)}
                />
              </div>
              <div>
                <h3 className="text-lg font-medium mb-3">Capital Category</h3>
                <CreateCategoryForm
                  type="capital"
                  onSuccess={() => setShowCreateForm(false)}
                  onCancel={() => setShowCreateForm(false)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
              Income Categories
              <Badge variant="secondary" className="ml-2">
                {incomeCategories.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Categories for organizing your income transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {incomeCategories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No income categories yet</p>
                <p className="text-sm">Create your first income category above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {incomeCategories.map((category) => {
                  const stats = getCategoryStats(category.id);
                  return (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <div>
                          <p className="font-medium">{category.name}</p>
                          {stats && (
                            <p className="text-sm text-gray-500">
                              {stats.transactionCount} transactions • £{stats.totalAmount.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCategory(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCategory(category.id, category.name)}
                          disabled={deleteCategory.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expenditure Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2" />
              Expenditure Categories
              <Badge variant="secondary" className="ml-2">
                {expenditureCategories.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Categories for organizing your expenditure transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {expenditureCategories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No expenditure categories yet</p>
                <p className="text-sm">Create your first expenditure category above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {expenditureCategories.map((category) => {
                  const stats = getCategoryStats(category.id);
                  return (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <div>
                          <p className="font-medium">{category.name}</p>
                          {stats && (
                            <p className="text-sm text-gray-500">
                              {stats.transactionCount} transactions • £{stats.totalAmount.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCategory(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCategory(category.id, category.name)}
                          disabled={deleteCategory.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Capital Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <div className="w-3 h-3 bg-purple-500 rounded-full mr-2" />
              Capital Categories
              <Badge variant="secondary" className="ml-2">
                {capitalCategories.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Categories for tracking capital movements
            </CardDescription>
          </CardHeader>
          <CardContent>
            {capitalCategories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No capital categories yet</p>
                <p className="text-sm">Create your first capital category above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {capitalCategories.map((category) => {
                  const stats = getCategoryStats(category.id);
                  return (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <div>
                          <p className="font-medium">{category.name}</p>
                          {stats && (
                            <p className="text-sm text-gray-500">
                              {stats.transactionCount} transactions • £{stats.totalAmount.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCategory(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCategory(category.id, category.name)}
                          disabled={deleteCategory.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

            {/* Category Usage Statistics */}
            {categoryStats && categoryStats.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Category Usage Statistics</CardTitle>
                  <CardDescription>
                    Overview of how frequently your categories are used
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryStats.slice(0, 6).map((stat) => (
                      <div
                        key={stat.id}
                        className="p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: stat.color }}
                          />
                          <p className="font-medium">{stat.name}</p>
                          <Badge variant={stat.type === 'income' ? 'default' : 'destructive'}>
                            {stat.type}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>{stat.transactionCount} transactions</p>
                          <p className="font-medium">£{stat.totalAmount.toFixed(2)} total</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Unallocated Categories Tab */}
        {activeTab === 'unallocated' && (
          <div className="space-y-6">
            {/* Overview Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-orange-600">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Unallocated Categories Overview
                </CardTitle>
                <CardDescription>
                  Categories that haven't been assigned to any hierarchy yet. Assign them to organize your P&L reports properly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {unallocatedStats ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{unallocatedStats.total}</div>
                      <div className="text-sm text-gray-600">Total Unallocated</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{unallocatedStats.income}</div>
                      <div className="text-sm text-gray-600">Income Categories</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{unallocatedStats.expenditure}</div>
                      <div className="text-sm text-gray-600">Expenditure Categories</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-2xl font-bold text-green-600">✓</div>
                    <div className="text-sm">All categories are properly allocated</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Unallocated Categories Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <UnallocatedCategoriesPanel type="income" />
              <UnallocatedCategoriesPanel type="expenditure" />
              <UnallocatedCategoriesPanel type="capital" />
            </div>
          </div>
        )}

        {/* Hierarchies Tab */}
        {activeTab === 'hierarchies' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Hierarchy Management */}
            <div className="lg:col-span-2 space-y-6">
              {/* Hierarchy Type Filter */}
              <Card>
                <CardHeader>
                  <CardTitle>Hierarchy Management</CardTitle>
                  <CardDescription>
                    Filter and manage your category hierarchies
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                      <button
                        onClick={() => setNewHierarchyType('expenditure')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          newHierarchyType === 'expenditure'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <TrendingDown className="h-4 w-4 mr-2 inline" />
                        Expenditure ({expenditureHierarchies.length})
                      </button>
                      <button
                        onClick={() => setNewHierarchyType('income')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          newHierarchyType === 'income'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <TrendingUp className="h-4 w-4 mr-2 inline" />
                        Income ({incomeHierarchies.length})
                      </button>
                      <button
                        onClick={() => setNewHierarchyType('capital')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          newHierarchyType === 'capital'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <Wallet className="h-4 w-4 mr-2 inline" />
                        Capital ({capitalHierarchies.length})
                      </button>
                    </div>
                  </div>
                  
                  {/* Create New Hierarchy */}
                  <div className="flex gap-4">
                    <Input
                      placeholder={`New ${newHierarchyType} hierarchy name...`}
                      value={newHierarchyName}
                      onChange={(e) => setNewHierarchyName(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleCreateHierarchy}
                      disabled={!newHierarchyName.trim() || createHierarchy.isPending}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create {
                        newHierarchyType === 'income' ? 'Income' : 
                        newHierarchyType === 'capital' ? 'Capital' : 'Expenditure'
                      }
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Filtered Hierarchies Display */}
              {newHierarchyType === 'expenditure' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full mr-2" />
                      Expenditure Hierarchies
                      <Badge variant="secondary" className="ml-2">
                        {expenditureHierarchies.length}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Drag to reorder • Click × to remove categories • 🗑️ to delete hierarchies
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SortableHierarchyList
                      hierarchies={expenditureHierarchies}
                      availableCategories={expenditureCategories}
                      onReorder={(reorderedHierarchies) => {
                        const updates = reorderedHierarchies.map((hierarchy, index) => ({
                          id: hierarchy.id,
                          display_order: index + 1
                        }));
                        reorderHierarchies.mutate({ hierarchies: updates });
                      }}
                      onDeleteHierarchy={handleDeleteHierarchy}
                      onAssignCategory={(categoryId, hierarchyId) => {
                        assignCategory.mutate({ category_id: categoryId, hierarchy_id: hierarchyId });
                      }}
                      onRemoveCategory={(categoryId, hierarchyId) => {
                        removeCategory.mutate({ category_id: categoryId, hierarchy_id: hierarchyId });
                      }}
                      type="expenditure"
                    />
                  </CardContent>
                </Card>
              )}

              {newHierarchyType === 'income' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
                      Income Hierarchies
                      <Badge variant="secondary" className="ml-2">
                        {incomeHierarchies.length}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Drag to reorder • Click × to remove categories • 🗑️ to delete hierarchies
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SortableHierarchyList
                      hierarchies={incomeHierarchies}
                      availableCategories={incomeCategories}
                      onReorder={(reorderedHierarchies) => {
                        const updates = reorderedHierarchies.map((hierarchy, index) => ({
                          id: hierarchy.id,
                          display_order: index + 1
                        }));
                        reorderHierarchies.mutate({ hierarchies: updates });
                      }}
                      onDeleteHierarchy={handleDeleteHierarchy}
                      onAssignCategory={(categoryId, hierarchyId) => {
                        assignCategory.mutate({ category_id: categoryId, hierarchy_id: hierarchyId });
                      }}
                      onRemoveCategory={(categoryId, hierarchyId) => {
                        removeCategory.mutate({ category_id: categoryId, hierarchy_id: hierarchyId });
                      }}
                      type="income"
                    />
                  </CardContent>
                </Card>
              )}

              {newHierarchyType === 'capital' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <div className="w-3 h-3 bg-purple-500 rounded-full mr-2" />
                      Capital Hierarchies
                      <Badge variant="secondary" className="ml-2">
                        {capitalHierarchies.length}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Drag to reorder • Click × to remove categories • 🗑️ to delete hierarchies
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SortableHierarchyList
                      hierarchies={capitalHierarchies}
                      availableCategories={capitalCategories}
                      onReorder={(reorderedHierarchies) => {
                        const updates = reorderedHierarchies.map((hierarchy, index) => ({
                          id: hierarchy.id,
                          display_order: index + 1
                        }));
                        reorderHierarchies.mutate({ hierarchies: updates });
                      }}
                      onDeleteHierarchy={handleDeleteHierarchy}
                      onAssignCategory={(categoryId, hierarchyId) => {
                        assignCategory.mutate({ category_id: categoryId, hierarchy_id: hierarchyId });
                      }}
                      onRemoveCategory={(categoryId, hierarchyId) => {
                        removeCategory.mutate({ category_id: categoryId, hierarchy_id: hierarchyId });
                      }}
                      type="capital"
                    />
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - P&L Preview */}
            <div className="lg:col-span-1">
              <CollapsiblePLPreview 
                incomeHierarchies={incomeHierarchies}
                expenditureHierarchies={expenditureHierarchies}
                capitalHierarchies={capitalHierarchies}
              />
            </div>
          </div>
        )}

      {/* Confirmation Dialog */}
      {ConfirmationDialog}
    </PageLayout>
  );
}
