'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, ArrowLeft, Store, AlertCircle, CheckCircle, BarChart3, Users, Package } from 'lucide-react';
import Link from 'next/link';

const shopifyFeatures = [
  {
    title: 'Sales Data Import',
    description: 'Automatic import of all sales transactions with detailed breakdown',
    icon: BarChart3,
    benefits: ['Order totals and taxes', 'Payment method tracking', 'Refund handling', 'Currency conversion']
  },
  {
    title: 'Product Analytics',
    description: 'Detailed product-level revenue analysis and performance metrics',
    icon: Package,
    benefits: ['Product profitability', 'Inventory insights', 'Seasonal trends', 'Top performers']
  },
  {
    title: 'Customer Insights',
    description: 'Customer transaction patterns and lifetime value analysis',
    icon: Users,
    benefits: ['Customer segments', 'Purchase frequency', 'Average order value', 'Geographic data']
  },
  {
    title: 'Store Management',
    description: 'Multi-store support with consolidated reporting',
    icon: Store,
    benefits: ['Multiple store connections', 'Unified dashboard', 'Store comparisons', 'Cross-store analytics']
  }
];

const integrationSteps = [
  {
    step: 1,
    title: 'Connect Your Store',
    description: 'Securely connect your Shopify store using OAuth authentication',
    details: 'No need to share passwords - we use Shopify\'s secure API connection'
  },
  {
    step: 2,
    title: 'Configure Import Settings',
    description: 'Choose what data to import and how often to sync',
    details: 'Select date ranges, product categories, and sync frequency'
  },
  {
    step: 3,
    title: 'Map Categories',
    description: 'Map Shopify products to your expense and income categories',
    details: 'Automatic suggestions based on product types and descriptions'
  },
  {
    step: 4,
    title: 'Start Syncing',
    description: 'Begin automatic data synchronization with real-time updates',
    details: 'Historical data import followed by ongoing real-time sync'
  }
];

export default function ShopifyIntegrationPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12 px-6 space-y-8">
        {/* Back Navigation */}
        <div className="flex items-center space-x-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/import" className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Database Management</span>
            </Link>
          </Button>
        </div>

        {/* Professional Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <ShoppingCart className="h-12 w-12 text-blue-600" />
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">Shopify Integration</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Connect your Shopify store for comprehensive sales analytics and automated income tracking
          </p>
        </div>

        {/* Coming Soon Notice */}
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-6 w-6 text-purple-600" />
              <CardTitle className="text-xl text-purple-900">Advanced Integration Coming Soon</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-purple-800 text-base leading-relaxed">
              Shopify integration is planned for a future release. This powerful feature will provide 
              detailed sales analytics, customer insights, and automated income tracking that goes far 
              {`beyond what's available in standard Shopify reports.`}
            </CardDescription>
            <div className="mt-4 p-4 bg-purple-100 rounded-lg">
              <p className="text-sm text-purple-800">
                <strong>Planned Release:</strong> Phase 4 of development (advanced integrations phase)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Why Shopify Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Why Connect Your Shopify Store?</CardTitle>
            <CardDescription>
              {`Unlock insights that Shopify's built-in analytics can't provide`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Current Limitations</h4>
                <div className="space-y-3">
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-800">
                      <strong>Limited Financial Integration:</strong> {`Shopify reports don't integrate with your overall financial picture`}
                    </p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-800">
                      <strong>No Expense Correlation:</strong> {`Can't see how product costs relate to revenue`}
                    </p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-800">
                      <strong>Basic Customer Data:</strong> Limited customer lifetime value and behavior analysis
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">HDW Finance Benefits</h4>
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800">
                      <strong>Complete Financial View:</strong> Sales data integrated with all your expenses and income
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800">
                      <strong>True Profitability:</strong> See real profit margins after all costs are considered
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800">
                      <strong>Advanced Analytics:</strong> Customer segments, product performance, and trend analysis
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Planned Features */}
        <div className="grid gap-6 md:grid-cols-2">
          {shopifyFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4">
                    {feature.description}
                  </CardDescription>
                  <div className="space-y-2">
                    {feature.benefits.map((benefit, benefitIndex) => (
                      <div key={benefitIndex} className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
                        {benefit}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Integration Process */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">How Integration Will Work</CardTitle>
            <CardDescription>
              Simple 4-step process to connect your Shopify store
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {integrationSteps.map((step, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{step.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                    <p className="text-xs text-gray-500 mt-2">{step.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Data Examples */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{`What Data You'll Get`}</CardTitle>
            <CardDescription>
              Examples of the detailed insights available through Shopify integration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Sales Analytics</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>• Daily/weekly/monthly revenue trends</div>
                  <div>• Average order value progression</div>
                  <div>• Payment method preferences</div>
                  <div>• Seasonal sales patterns</div>
                  <div>• Refund and return analysis</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Product Insights</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>• Best and worst performing products</div>
                  <div>• Product category profitability</div>
                  <div>• Inventory turnover rates</div>
                  <div>• Cross-selling opportunities</div>
                  <div>• Product lifecycle analysis</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Customer Data</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>• Customer lifetime value</div>
                  <div>• Purchase frequency patterns</div>
                  <div>• Geographic sales distribution</div>
                  <div>• Customer acquisition costs</div>
                  <div>• Repeat customer rates</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Alternatives */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-xl text-blue-900">Current Alternatives</CardTitle>
            <CardDescription className="text-blue-700">
              Ways to track your Shopify income while waiting for full integration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <h4 className="font-medium text-blue-900">Manual Tracking</h4>
                <div className="space-y-2">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Daily Sales Entry:</strong> Manually add daily sales totals as income transactions
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Monthly Summaries:</strong> Use Shopify reports to create monthly income entries
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium text-blue-900">CSV Export Method</h4>
                <div className="space-y-2">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Export Orders:</strong> Download order data from Shopify and import as transactions
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Category Mapping:</strong> Create categories for different product types and revenue streams
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <Button asChild variant="outline" className="h-auto p-4 border-blue-300 hover:bg-blue-50">
                <Link href="/add-income" className="flex flex-col items-center space-y-2">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">Add Sales Manually</span>
                  <span className="text-xs text-blue-600">Enter daily/weekly totals</span>
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="h-auto p-4 border-blue-300 hover:bg-blue-50">
                <Link href="/import/transactions" className="flex flex-col items-center space-y-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">Import CSV Data</span>
                  <span className="text-xs text-blue-600">Upload Shopify exports</span>
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="h-auto p-4 border-blue-300 hover:bg-blue-50">
                <Link href="/categories" className="flex flex-col items-center space-y-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">Setup Categories</span>
                  <span className="text-xs text-blue-600">Prepare for integration</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
