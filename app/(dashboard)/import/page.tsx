'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Upload, CreditCard, ShoppingCart, RotateCcw, CheckCircle } from 'lucide-react';
import Link from 'next/link';

const managementSections = [
  {
    title: 'Revolut Import',
    description: 'Import your Revolut CSV with intelligent categorization and duplicate detection',
    icon: CreditCard,
    href: '/import/bank',
    status: 'Available',
    statusColor: 'blue',
    features: [
      'Smart category suggestions',
      'Automatic duplicate detection',
      'Transaction metadata support',
      'Pattern-based learning'
    ],
    action: 'Import Revolut CSV',
    featured: true,
  },
  {
    title: 'Pattern Management',
    description: 'Manage categorization patterns for intelligent transaction processing',
    icon: Database,
    href: '/patterns',
    status: 'Available',
    statusColor: 'purple',
    features: [
      'Create custom categorization rules',
      'Test patterns before applying',
      'Confidence scoring system',
      'Pattern effectiveness analytics'
    ],
    action: 'Manage Patterns',
  },
  {
    title: 'Shopify Integration',
    description: 'Connect your Shopify store for detailed sales analytics and income tracking',
    icon: ShoppingCart,
    href: '/import/shopify',
    status: 'Coming Soon',
    statusColor: 'yellow',
    features: [
      'Automatic sales data import',
      'Product-level revenue analysis',
      'Customer transaction details',
      'Real-time synchronization'
    ],
    action: 'Connect Store',
  },
  {
    title: 'Database Reset',
    description: 'Clean slate option to reset all data and start fresh',
    icon: RotateCcw,
    href: '/import/reset',
    status: 'Available',
    statusColor: 'red',
    features: [
      'Complete data removal',
      'Preserve user account settings',
      'Backup before reset option',
      'Selective data clearing'
    ],
    action: 'Reset Database',
  },
];

// Archived sections (completed setup)
const archivedSections = [
  {
    title: 'Initial Data Migration',
    description: 'Historical data import completed',
    icon: CheckCircle,
    href: '/import/transactions',
    status: 'Completed',
    statusColor: 'green',
    action: 'Review Data',
  },
];

export default function DatabaseManagementPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12 px-6 space-y-8">
        {/* Professional Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <Database className="h-12 w-12 text-blue-600" />
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">Database Management</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Comprehensive tools for managing your financial data, imports, and integrations
          </p>
        </div>

        {/* Management Sections Grid */}
        <div className="grid gap-8 md:grid-cols-2">
          {managementSections.map((section) => {
            const Icon = section.icon;
            const isCompleted = section.status === 'Completed';
            const isAvailable = section.status === 'Available' || section.status === 'Completed';
            const isComingSoon = section.status === 'Coming Soon';
            
            return (
              <Card key={section.title} className={`relative transition-all duration-200 hover:shadow-lg ${
                !isAvailable ? 'opacity-75' : 'hover:scale-[1.02]'
              }`}>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-xl ${
                        section.statusColor === 'green' ? 'bg-green-100 text-green-600' :
                        section.statusColor === 'blue' ? 'bg-blue-100 text-blue-600' :
                        section.statusColor === 'yellow' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-semibold text-gray-900">
                          {section.title}
                        </CardTitle>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            section.statusColor === 'green' ? 'bg-green-100 text-green-800' :
                            section.statusColor === 'blue' ? 'bg-blue-100 text-blue-800' :
                            section.statusColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {isCompleted && <CheckCircle className="w-3 h-3 mr-1" />}
                            {section.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <CardDescription className="text-base leading-relaxed text-gray-600">
                    {section.description}
                  </CardDescription>
                  
                  {/* Features List */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900">Key Features:</h4>
                    <ul className="space-y-1">
                      {section.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-600">
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-3 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Action Button */}
                  <div className="pt-4">
                    {isAvailable ? (
                      <Button asChild className="w-full" variant={isCompleted ? "outline" : "default"}>
                        <Link href={section.href}>
                          {section.action}
                        </Link>
                      </Button>
                    ) : (
                      <Button disabled className="w-full">
                        {section.action} - Coming Soon
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Access Panel */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-xl text-blue-900">Quick Access</CardTitle>
            <CardDescription className="text-blue-700">
              Common database management tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Button asChild variant="outline" className="h-auto p-4 border-blue-300 hover:bg-blue-50">
                <Link href="/import/categories" className="flex flex-col items-center space-y-2">
                  <Database className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">Manage Categories</span>
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="h-auto p-4 border-blue-300 hover:bg-blue-50">
                <Link href="/dashboard" className="flex flex-col items-center space-y-2">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">View Dashboard</span>
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="h-auto p-4 border-blue-300 hover:bg-blue-50">
                <Link href="/import/reset" className="flex flex-col items-center space-y-2">
                  <RotateCcw className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">Reset Options</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Status Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Database Status Summary</CardTitle>
            <CardDescription>
              Overview of your current data management setup
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Completed Setup</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm text-green-800">Initial Data Migration</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm text-green-800">Category Configuration</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Available Features</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm text-blue-800">Bank Statement Upload</span>
                    <span className="text-xs px-2 py-1 bg-blue-200 text-blue-800 rounded-full">Ready</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <span className="text-sm text-yellow-800">Shopify Integration</span>
                    <span className="text-xs px-2 py-1 bg-yellow-200 text-yellow-800 rounded-full">Soon</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
