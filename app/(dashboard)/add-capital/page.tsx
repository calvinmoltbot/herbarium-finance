'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CategoryPicker } from '@/components/categories/category-picker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Wallet, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const capitalSchema = z.object({
  amount: z.string().min(1, 'Amount is required').refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    'Amount must be a positive number'
  ),
  categoryId: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  transactionDate: z.string().min(1, 'Date is required'),
});

type CapitalFormData = z.infer<typeof capitalSchema>;

export default function AddCapitalPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<CapitalFormData>({
    resolver: zodResolver(capitalSchema),
    defaultValues: {
      transactionDate: new Date().toISOString().split('T')[0],
    },
  });

  const addCapitalMutation = useMutation({
    mutationFn: async (data: CapitalFormData) => {
      if (!user?.id) throw new Error('User not authenticated');

      const supabase = createClient();
      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          category_id: data.categoryId,
          amount: Number(data.amount),
          type: 'capital',
          description: data.description || null,
          transaction_date: data.transactionDate,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Capital transaction added successfully!');
      reset();
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-data'] });
      queryClient.invalidateQueries({ queryKey: ['category-breakdown'] });
      queryClient.invalidateQueries({ queryKey: ['recent-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['capital-transactions'] });
    },
    onError: (error) => {
      console.error('Error adding capital transaction:', error);
      toast.error('Failed to add capital transaction. Please try again.');
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const onSubmit = async (data: CapitalFormData) => {
    setIsSubmitting(true);
    addCapitalMutation.mutate(data);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please log in to add capital transactions.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto py-12 px-6 space-y-8">
        {/* Header */}
        <div className="space-y-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>

          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <Wallet className="h-12 w-12 text-purple-600" />
              <h1 className="text-4xl font-bold tracking-tight text-foreground">Add Capital</h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Record capital injections or director drawings
            </p>
          </div>
        </div>

        {/* Form */}
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle>Capital Transaction Details</CardTitle>
            <CardDescription>
              Enter the details of a capital injection or director drawing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (£)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register('amount')}
                  className={errors.amount ? 'border-red-500' : ''}
                />
                {errors.amount && (
                  <p className="text-sm text-red-600">{errors.amount.message}</p>
                )}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <CategoryPicker
                  type="capital"
                  value={watch('categoryId') || ''}
                  onValueChange={(value) => setValue('categoryId', value)}
                  placeholder="Select a capital category"
                  error={!!errors.categoryId}
                />
                {errors.categoryId && (
                  <p className="text-sm text-red-600">{errors.categoryId.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Choose a capital injection or director drawing category
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Enter a description for this capital transaction..."
                  {...register('description')}
                  rows={3}
                />
                {errors.description && (
                  <p className="text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="transactionDate">Date</Label>
                <Input
                  id="transactionDate"
                  type="date"
                  {...register('transactionDate')}
                  className={errors.transactionDate ? 'border-red-500' : ''}
                />
                {errors.transactionDate && (
                  <p className="text-sm text-red-600">{errors.transactionDate.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex space-x-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Adding Capital...
                    </>
                  ) : (
                    <>
                      <Wallet className="h-4 w-4 mr-2" />
                      Add Capital Transaction
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => reset()}
                  disabled={isSubmitting}
                >
                  Clear Form
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
