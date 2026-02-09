'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calculator, TrendingUp, TrendingDown, Settings, ChevronDown, ChevronRight, Expand, Minimize, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useIncomeTransactions, useExpenditureTransactions } from '@/hooks/use-income-transactions';
import { useCapitalTransactions } from '@/hooks/use-capital-transactions';
import { useCategoryHierarchiesWithCategories } from '@/hooks/use-category-hierarchies';
import { DateRangePicker, DateRange, filterTransactionsByDateRange } from '@/components/ui/date-range-picker';
import { format } from 'date-fns';

export default function ProfitLossReport() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null, preset: 'all' });
  const [expandedHierarchies, setExpandedHierarchies] = useState<Record<string, boolean>>({});
  
  const { data: allIncomeTransactions = [] } = useIncomeTransactions();
  const { data: allExpenditureTransactions = [] } = useExpenditureTransactions();
  const { data: allCapitalTransactions = [] } = useCapitalTransactions();
  const { data: incomeHierarchies = [] } = useCategoryHierarchiesWithCategories('income');
  const { data: expenditureHierarchies = [] } = useCategoryHierarchiesWithCategories('expenditure');

  // Filter transactions by date range
  const incomeTransactions = useMemo(() => 
    filterTransactionsByDateRange(allIncomeTransactions, dateRange), 
    [allIncomeTransactions, dateRange]
  );
  
  const expenditureTransactions = useMemo(() => 
    filterTransactionsByDateRange(allExpenditureTransactions, dateRange), 
    [allExpenditureTransactions, dateRange]
  );
  
  const capitalTransactions = useMemo(() => 
    filterTransactionsByDateRange(allCapitalTransactions, dateRange), 
    [allCapitalTransactions, dateRange]
  );

  // Fetch capital hierarchies separately
  const { data: capitalHierarchies = [] } = useCategoryHierarchiesWithCategories('capital');

  // Calculate totals and breakdowns
  const reportData = useMemo(() => {
    // Define capital movement hierarchies
    const CAPITAL_INJECTION_HIERARCHY = "Capital Injection";
    // Director Withdrawals hierarchy name: "Directors Drawings" (matches database)
    
    // Use the directly fetched capital hierarchies
    // This ensures we get all hierarchies of type 'capital'
    
    // Income breakdown by hierarchy (excluding capital hierarchies)
    const incomeByHierarchy = incomeHierarchies
      .filter(h => h.type === 'income')
      .map(hierarchy => {
      const categoryIds = hierarchy.categories.map(cat => cat.id);
      const hierarchyTransactions = incomeTransactions.filter(t => 
        t.category_id && categoryIds.includes(t.category_id)
      );
      
      const categoryBreakdown = hierarchy.categories.map(category => {
        const categoryTransactions = incomeTransactions.filter(t => t.category_id === category.id);
        const total = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
        return { category: category.name, total };
      }).filter(item => item.total > 0);

      const hierarchyTotal = hierarchyTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      return {
        name: hierarchy.name,
        total: hierarchyTotal,
        categories: categoryBreakdown
      };
    }).filter(item => item.total > 0);

    // Handle uncategorized income (excluding capital transactions)
    const categorizedIncomeIds = incomeHierarchies.flatMap(h => h.categories.map(c => c.id));
    const uncategorizedIncome = incomeTransactions
      .filter(t => (!t.category_id || !categorizedIncomeIds.includes(t.category_id)) && t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    if (uncategorizedIncome > 0) {
      incomeByHierarchy.push({
        name: 'Uncategorized Income',
        total: uncategorizedIncome,
        categories: [{ category: 'Uncategorized', total: uncategorizedIncome }]
      });
    }

    const totalIncome = incomeByHierarchy.reduce((sum, h) => sum + h.total, 0);

    // Expenditure breakdown by hierarchy (excluding capital hierarchies)
    const expenditureByHierarchy = expenditureHierarchies
      .filter(h => h.type === 'expenditure')
      .map(hierarchy => {
      const categoryIds = hierarchy.categories.map(cat => cat.id);
      const hierarchyTransactions = expenditureTransactions.filter(t => 
        t.category_id && categoryIds.includes(t.category_id)
      );
      
      const categoryBreakdown = hierarchy.categories.map(category => {
        const categoryTransactions = expenditureTransactions.filter(t => t.category_id === category.id);
        const total = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
        return { category: category.name, total };
      }).filter(item => item.total > 0);

      const hierarchyTotal = hierarchyTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      return {
        name: hierarchy.name,
        total: hierarchyTotal,
        categories: categoryBreakdown
      };
    }).filter(item => item.total > 0);

    // Handle uncategorized expenditure
    const categorizedExpenditureIds = expenditureHierarchies.flatMap(h => h.categories.map(c => c.id));
    const uncategorizedExpenditure = expenditureTransactions
      .filter(t => !t.category_id || !categorizedExpenditureIds.includes(t.category_id))
      .reduce((sum, t) => sum + t.amount, 0);

    if (uncategorizedExpenditure > 0) {
      expenditureByHierarchy.push({
        name: 'Other Business Expenses',
        total: uncategorizedExpenditure,
        categories: [{ category: 'Uncategorized', total: uncategorizedExpenditure }]
      });
    }

    const totalExpenditure = expenditureByHierarchy.reduce((sum, h) => sum + h.total, 0);
    const netProfit = totalIncome - totalExpenditure;
    
    // Prepare capital movements data
    const capitalMovements = capitalHierarchies.map(hierarchy => {
      const isInjection = hierarchy.name === CAPITAL_INJECTION_HIERARCHY || 
                         hierarchy.name.toLowerCase().includes('injection');
      
      const categoryIds = hierarchy.categories.map(cat => cat.id);
      const hierarchyTransactions = capitalTransactions.filter(t => 
        t.category_id && categoryIds.includes(t.category_id)
      );
      
      
      const categoryBreakdown = hierarchy.categories.map(category => {
        const categoryTransactions = capitalTransactions.filter(t => t.category_id === category.id);
        const total = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
        return { category: category.name, total };
      }).filter(item => item.total > 0);

      const hierarchyTotal = hierarchyTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      return {
        name: hierarchy.name,
        total: hierarchyTotal,
        type: isInjection ? 'injection' : 'withdrawal',
        categories: categoryBreakdown
      };
    }).filter(item => item.total > 0);
    
    const totalCapitalInjection = capitalMovements
      .filter(m => m.type === 'injection')
      .reduce((sum, m) => sum + m.total, 0);
      
    const totalCapitalWithdrawal = capitalMovements
      .filter(m => m.type === 'withdrawal')
      .reduce((sum, m) => sum + m.total, 0);
    const grossProfitMargin = totalIncome > 0 ? ((totalIncome - totalExpenditure) / totalIncome) * 100 : 0;

    // Calculate total after capital movements
    const totalAfterCapitalMovements = netProfit + totalCapitalInjection - totalCapitalWithdrawal;
    
    return {
      incomeByHierarchy,
      totalIncome,
      expenditureByHierarchy,
      totalExpenditure,
      netProfit,
      grossProfitMargin,
      capitalMovements,
      totalCapitalInjection,
      totalCapitalWithdrawal,
      totalAfterCapitalMovements
    };
  }, [incomeTransactions, expenditureTransactions, capitalTransactions, incomeHierarchies, expenditureHierarchies, capitalHierarchies]);

  const getReportPeriod = () => {
    if (dateRange.from && dateRange.to) {
      return `For the period ${format(dateRange.from, 'dd/MM/yyyy')} to ${format(dateRange.to, 'dd/MM/yyyy')}`;
    }
    return `For the period ended ${format(new Date(), 'do MMMM yyyy')}`;
  };

  const isHierarchyExpanded = (hierarchyName: string) => {
    return expandedHierarchies[hierarchyName] ?? true; // Default to expanded
  };

  const toggleHierarchy = (hierarchyName: string) => {
    setExpandedHierarchies(prev => ({
      ...prev,
      [hierarchyName]: !isHierarchyExpanded(hierarchyName)
    }));
  };

  const expandAll = () => {
    const allHierarchies = [
      ...reportData.incomeByHierarchy.map(h => h.name),
      ...reportData.expenditureByHierarchy.map(h => h.name),
      ...(reportData.capitalMovements || []).map(m => m.name)
    ];
    const newState: Record<string, boolean> = {};
    allHierarchies.forEach(name => {
      newState[name] = true;
    });
    setExpandedHierarchies(newState);
  };

  const collapseAll = () => {
    const allHierarchies = [
      ...reportData.incomeByHierarchy.map(h => h.name),
      ...reportData.expenditureByHierarchy.map(h => h.name),
      ...(reportData.capitalMovements || []).map(m => m.name)
    ];
    const newState: Record<string, boolean> = {};
    allHierarchies.forEach(name => {
      newState[name] = false;
    });
    setExpandedHierarchies(newState);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto py-8 px-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/reports" className="flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Reports</span>
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Trading & Profit and Loss Account</h1>
              <p className="text-muted-foreground">{getReportPeriod()}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={expandAll} title="Expand All Sections">
              <Expand className="h-4 w-4 mr-1" />
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll} title="Collapse All Sections">
              <Minimize className="h-4 w-4 mr-1" />
              Collapse All
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/categories" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Manage Categories</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Date Range Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Report Period</CardTitle>
            <CardDescription>Select the date range for this P&L report</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <DateRangePicker value={dateRange} onChange={setDateRange} />
            </div>
          </CardContent>
        </Card>

        {/* Revenue Section */}
        <Card>
          <CardHeader className="bg-green-50 border-b border-green-200">
            <CardTitle className="text-xl text-green-900 flex items-center">
              <TrendingUp className="h-6 w-6 mr-2" />
              SALES/TURNOVER
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-0">
              {reportData.incomeByHierarchy.map((hierarchy, index) => (
                <div key={`${hierarchy.name}-${index}`} className="border-b border-border">
                  {/* Hierarchy Header - Clickable */}
                  <div 
                    className="bg-green-100 px-6 py-3 border-b border-green-200 cursor-pointer hover:bg-green-150 transition-colors"
                    onClick={() => toggleHierarchy(hierarchy.name)}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-green-900 uppercase tracking-wide text-sm flex items-center">
                        {isHierarchyExpanded(hierarchy.name) ? (
                          <ChevronDown className="h-4 w-4 mr-2" />
                        ) : (
                          <ChevronRight className="h-4 w-4 mr-2" />
                        )}
                        {hierarchy.name}
                      </h4>
                      <span className="font-semibold text-green-900">
                        £{hierarchy.total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  
                  {/* Categories - Collapsible */}
                  {isHierarchyExpanded(hierarchy.name) && (
                    <table className="w-full">
                      <tbody>
                        {hierarchy.categories.map((item) => (
                          <tr key={item.category} className="border-b border-border">
                            <td className="py-2 px-6 pl-8 text-foreground">{item.category}</td>
                            <td className="py-2 px-6 text-right text-foreground">
                              {item.total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-green-50 border-b-2 border-green-300">
                          <td className="py-3 px-6 font-semibold text-green-900">Sub-total</td>
                          <td className="py-3 px-6 text-right font-semibold text-green-900">
                            £{hierarchy.total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
              
              {/* Total Sales */}
              <div className="bg-green-50 border-t-2 border-green-300">
                <table className="w-full">
                  <tbody>
                    <tr>
                      <td className="py-4 px-6 font-bold text-green-900">TOTAL SALES</td>
                      <td className="py-4 px-6 text-right font-bold text-green-900">
                        £{reportData.totalIncome.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expenditure Section */}
        <Card>
          <CardHeader className="bg-red-50 border-b border-red-200">
            <CardTitle className="text-xl text-red-900 flex items-center">
              <TrendingDown className="h-6 w-6 mr-2" />
              EXPENDITURE
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-0">
              {reportData.expenditureByHierarchy.map((hierarchy, index) => (
                <div key={`${hierarchy.name}-${index}`} className="border-b border-border">
                  {/* Hierarchy Header - Clickable */}
                  <div 
                    className="bg-muted px-6 py-3 border-b border-border cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => toggleHierarchy(hierarchy.name)}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-foreground uppercase tracking-wide text-sm flex items-center">
                        {isHierarchyExpanded(hierarchy.name) ? (
                          <ChevronDown className="h-4 w-4 mr-2" />
                        ) : (
                          <ChevronRight className="h-4 w-4 mr-2" />
                        )}
                        {hierarchy.name}
                      </h4>
                      <span className="font-semibold text-foreground">
                        £{hierarchy.total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  
                  {/* Categories - Collapsible */}
                  {isHierarchyExpanded(hierarchy.name) && (
                    <table className="w-full">
                      <tbody>
                        {hierarchy.categories.map((item) => (
                          <tr key={item.category} className="border-b border-border">
                            <td className="py-2 px-6 pl-8 text-foreground">- {item.category}</td>
                            <td className="py-2 px-6 text-right text-foreground">
                              {item.total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-muted border-b-2 border-border">
                          <td className="py-3 px-6 font-semibold text-foreground">Sub-total</td>
                          <td className="py-3 px-6 text-right font-semibold text-foreground">
                            £{hierarchy.total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
              
              {/* Total Expenditure */}
              <div className="bg-red-50 border-t-2 border-red-300">
                <table className="w-full">
                  <tbody>
                    <tr>
                      <td className="py-4 px-6 font-bold text-red-900">TOTAL EXPENDITURE</td>
                      <td className="py-4 px-6 text-right font-bold text-red-900">
                        £{reportData.totalExpenditure.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Capital Movements Section */}
        {reportData.capitalMovements && reportData.capitalMovements.length > 0 && (
          <Card>
            <CardHeader className="bg-purple-50 border-b border-purple-200">
              <CardTitle className="text-xl text-purple-900 flex items-center">
                <Wallet className="h-6 w-6 mr-2" />
                CAPITAL MOVEMENTS
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-0">
                {reportData.capitalMovements.map((movement, index) => (
                  <div key={`${movement.name}-${index}`} className="border-b border-border">
                    {/* Movement Header - Clickable */}
                    <div 
                      className={`px-6 py-3 border-b cursor-pointer hover:bg-opacity-80 transition-colors ${
                        movement.type === 'injection' 
                          ? 'bg-blue-100 border-blue-200' 
                          : 'bg-orange-100 border-orange-200'
                      }`}
                      onClick={() => toggleHierarchy(movement.name)}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className={`font-bold uppercase tracking-wide text-sm flex items-center ${
                          movement.type === 'injection' ? 'text-blue-900' : 'text-orange-900'
                        }`}>
                          {isHierarchyExpanded(movement.name) ? (
                            <ChevronDown className="h-4 w-4 mr-2" />
                          ) : (
                            <ChevronRight className="h-4 w-4 mr-2" />
                          )}
                          {movement.name}
                        </h4>
                        <span className={`font-semibold ${
                          movement.type === 'injection' ? 'text-blue-900' : 'text-orange-900'
                        }`}>
                          £{movement.total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    
                    {/* Categories - Collapsible */}
                    {isHierarchyExpanded(movement.name) && (
                      <table className="w-full">
                        <tbody>
                          {movement.categories.map((item) => (
                            <tr key={item.category} className="border-b border-border">
                              <td className="py-2 px-6 pl-8 text-foreground">{item.category}</td>
                              <td className="py-2 px-6 text-right text-foreground">
                                {item.total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                          <tr className={`border-b-2 ${
                            movement.type === 'injection' 
                              ? 'bg-blue-50 border-blue-300' 
                              : 'bg-orange-50 border-orange-300'
                          }`}>
                            <td className={`py-3 px-6 font-semibold ${
                              movement.type === 'injection' ? 'text-blue-900' : 'text-orange-900'
                            }`}>Sub-total</td>
                            <td className={`py-3 px-6 text-right font-semibold ${
                              movement.type === 'injection' ? 'text-blue-900' : 'text-orange-900'
                            }`}>
                              £{movement.total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
                
                {/* Capital Movements Summary */}
                <div className="bg-purple-50 border-t-2 border-purple-300">
                  <table className="w-full">
                    <tbody>
                      {reportData.totalCapitalInjection > 0 && (
                        <tr className="border-b border-purple-200">
                          <td className="py-3 px-6 font-semibold text-blue-900">Total Capital Injection</td>
                          <td className="py-3 px-6 text-right font-semibold text-blue-900">
                            £{reportData.totalCapitalInjection.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      )}
                      {reportData.totalCapitalWithdrawal > 0 && (
                        <tr className="border-b border-purple-200">
                          <td className="py-3 px-6 font-semibold text-orange-900">Total Director Withdrawals</td>
                          <td className="py-3 px-6 text-right font-semibold text-orange-900">
                            £{reportData.totalCapitalWithdrawal.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td className="py-4 px-6 font-bold text-purple-900">NET CAPITAL MOVEMENT</td>
                        <td className="py-4 px-6 text-right font-bold text-purple-900">
                          £{(reportData.totalCapitalInjection - reportData.totalCapitalWithdrawal).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Operating Profit Section */}
        <Card>
          <CardHeader className={`border-b ${reportData.netProfit >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
            <CardTitle className={`text-xl flex items-center ${reportData.netProfit >= 0 ? 'text-blue-900' : 'text-red-900'}`}>
              <Calculator className="h-6 w-6 mr-2" />
              OPERATING PROFIT (BEFORE CAPITAL MOVEMENTS)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <tbody>
                <tr className={`${reportData.netProfit >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
                  <td className={`py-6 px-6 text-2xl font-bold ${reportData.netProfit >= 0 ? 'text-blue-900' : 'text-red-900'}`}>
                    {reportData.netProfit >= 0 ? 'PROFIT' : 'LOSS'}
                  </td>
                  <td className={`py-6 px-6 text-right text-2xl font-bold ${reportData.netProfit >= 0 ? 'text-blue-900' : 'text-red-900'}`}>
                    £{Math.abs(reportData.netProfit).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Total After Capital Movements Section */}
        {reportData.capitalMovements && reportData.capitalMovements.length > 0 && (
          <Card>
            <CardHeader className={`border-b ${reportData.totalAfterCapitalMovements >= 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-red-50 border-red-200'}`}>
              <CardTitle className={`text-xl flex items-center ${reportData.totalAfterCapitalMovements >= 0 ? 'text-indigo-900' : 'text-red-900'}`}>
                <Calculator className="h-6 w-6 mr-2" />
                TOTAL AFTER CAPITAL MOVEMENTS
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <tbody>
                  <tr className={`${reportData.totalAfterCapitalMovements >= 0 ? 'bg-indigo-50' : 'bg-red-50'}`}>
                    <td className="py-3 px-6 text-foreground">Operating Profit</td>
                    <td className="py-3 px-6 text-right text-foreground">
                      £{reportData.netProfit.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  {reportData.totalCapitalInjection > 0 && (
                    <tr className={`${reportData.totalAfterCapitalMovements >= 0 ? 'bg-indigo-50' : 'bg-red-50'}`}>
                      <td className="py-3 px-6 text-foreground">Add: Capital Injection</td>
                      <td className="py-3 px-6 text-right text-foreground">
                        £{reportData.totalCapitalInjection.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                  {reportData.totalCapitalWithdrawal > 0 && (
                    <tr className={`${reportData.totalAfterCapitalMovements >= 0 ? 'bg-indigo-50' : 'bg-red-50'}`}>
                      <td className="py-3 px-6 text-foreground">Less: Director Withdrawals</td>
                      <td className="py-3 px-6 text-right text-foreground">
                        £{reportData.totalCapitalWithdrawal.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                  <tr className={`border-t-2 ${reportData.totalAfterCapitalMovements >= 0 ? 'border-indigo-300 bg-indigo-50' : 'border-red-300 bg-red-50'}`}>
                    <td className={`py-6 px-6 text-2xl font-bold ${reportData.totalAfterCapitalMovements >= 0 ? 'text-indigo-900' : 'text-red-900'}`}>
                      {reportData.totalAfterCapitalMovements >= 0 ? 'NET POSITION' : 'NET DEFICIT'}
                    </td>
                    <td className={`py-6 px-6 text-right text-2xl font-bold ${reportData.totalAfterCapitalMovements >= 0 ? 'text-indigo-900' : 'text-red-900'}`}>
                      £{Math.abs(reportData.totalAfterCapitalMovements).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Key Performance Indicators */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Key Performance Indicators</CardTitle>
            <CardDescription>Financial ratios and performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-3">
                <h4 className="font-medium text-foreground">Profitability Ratios</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm text-foreground">Net Profit Margin:</span>
                    <span className={`font-medium ${reportData.grossProfitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {reportData.grossProfitMargin.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm text-foreground">Total Revenue:</span>
                    <span className="font-medium text-foreground">
                      £{reportData.totalIncome.toLocaleString('en-GB')}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-foreground">Expenditure Analysis</h4>
                <div className="space-y-2">
                  {reportData.expenditureByHierarchy
                    .slice(0, 3)
                    .map((hierarchy, index) => {
                      const percentage = reportData.totalExpenditure > 0 ? (hierarchy.total / reportData.totalExpenditure) * 100 : 0;
                      return (
                        <div key={`${hierarchy.name}-${index}`} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <span className="text-sm text-foreground">{hierarchy.name}:</span>
                          <span className="font-medium text-foreground">{percentage.toFixed(1)}%</span>
                        </div>
                      );
                    })}
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-foreground">Financial Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-sm text-green-700">Total Income:</span>
                    <span className="font-medium text-green-800">
                      £{reportData.totalIncome.toLocaleString('en-GB')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="text-sm text-red-700">Total Expenditure:</span>
                    <span className="font-medium text-red-800">
                      £{reportData.totalExpenditure.toLocaleString('en-GB')}
                    </span>
                  </div>
                  <div className={`flex justify-between items-center p-3 rounded-lg ${reportData.netProfit >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
                    <span className={`text-sm ${reportData.netProfit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>Net Result:</span>
                    <span className={`font-medium ${reportData.netProfit >= 0 ? 'text-blue-800' : 'text-red-800'}`}>
                      £{Math.abs(reportData.netProfit).toLocaleString('en-GB')}
                    </span>
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
