'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function ImportCategoriesPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto py-12 px-6 space-y-8">
        {/* Header */}
        <div className="space-y-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/import" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Import
            </Link>
          </Button>
          
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <FileText className="h-12 w-12 text-primary" />
              <h1 className="text-4xl font-bold tracking-tight text-foreground">Import Categories</h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Upload and validate category data from CSV files to organize your transactions
            </p>
          </div>
        </div>

        {/* Upload Section */}
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl">Upload CSV File</CardTitle>
            <CardDescription className="text-lg">
              Select a CSV file containing your categories to import
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-muted-foreground transition-colors">
              <Upload className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Drop your CSV file here, or click to browse
              </h3>
              <p className="text-muted-foreground mb-6">
                Maximum file size: 5MB. Supported format: CSV
              </p>
              <Button size="lg" className="px-8">
                Choose File
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
              CSV Format Requirements
            </CardTitle>
            <CardDescription className="text-base">
              Ensure your CSV file follows these guidelines for successful import
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-foreground">Header Row Required</h4>
                    <p className="text-muted-foreground text-sm mt-1">
                      {`First row should contain column headers (e.g., "Category Name", "Type", etc.)`}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-foreground">One Category Per Row</h4>
                    <p className="text-muted-foreground text-sm mt-1">
                      Each row should contain one category with its details
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-foreground">UTF-8 Encoding</h4>
                    <p className="text-muted-foreground text-sm mt-1">
                      Save your CSV with UTF-8 encoding to support special characters
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-foreground">Duplicate Handling</h4>
                    <p className="text-muted-foreground text-sm mt-1">
                      Duplicate category names will be automatically skipped
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Example Format */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <FileText className="h-6 w-6 text-primary mr-2" />
              Example CSV Format
            </CardTitle>
            <CardDescription className="text-base">
              {`Here's an example of how your CSV file should be structured`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-4 font-mono text-sm">
              <div className="text-muted-foreground mb-2">Example CSV content:</div>
              <div className="space-y-1">
                <div className="text-foreground">Category Name,Type,Color</div>
                <div className="text-foreground">Wholesale,income,#3B82F6</div>
                <div className="text-foreground">Personal Sale,income,#10B981</div>
                <div className="text-foreground">Shopify - Paypal,income,#8B5CF6</div>
                <div className="text-foreground">Office Supplies,expenditure,#EF4444</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 pt-6">
          <Button variant="outline" size="lg" asChild>
            <Link href="/categories">
              View Existing Categories
            </Link>
          </Button>
          <Button size="lg" asChild>
            <Link href="/import">
              Back to Import Options
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
