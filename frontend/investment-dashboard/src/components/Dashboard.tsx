import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { DashboardData, InvestmentTimelineData } from '../types/Investment';
import { getCategoryLabel } from '../types/Investment';
import { investmentApi } from '../services/api';
import InvestmentTimeline from './InvestmentTimeline';
import CurrencySelector from './CurrencySelector';

interface DashboardProps {
  onNavigateToAccount?: (account: string) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Dashboard: React.FC<DashboardProps> = ({ onNavigateToAccount }) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>(() => {
    // Load saved currency from localStorage, default to 'Original' if not found
    return localStorage.getItem('dashboardCurrency') || 'Original';
  });
  const [exchangeRates, setExchangeRates] = useState<{[key: string]: number}>({});
  const [convertedData, setConvertedData] = useState<any>(null);

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return '#27ae60'; // Green - Goal reached
    if (progress >= 75) return '#3498db';   // Blue - Halfway
    if (progress >= 50) return '#f39c12';   // Orange - Close to goal
    return '#e74c3c'; // Red - Far from goal
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await investmentApi.getDashboard();

      // Fetch real timeline data based on actual investment dates
      const timelineData = await investmentApi.getTimeline();
      data.timelineData = timelineData;

      setDashboardData(data);
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Convert timeline data based on selected currency
  const getConvertedTimelineData = (timelineData: any) => {
    if (!timelineData || selectedCurrency === 'Original') {
      return timelineData;
    }

    return {
      ...timelineData,
      timelinePoints: timelineData.timelinePoints.map((point: any) => ({
        ...point,
        totalValue: getConvertedValue(point.brlValue, 'BRL') + getConvertedValue(point.cadValue, 'CAD'),
        brlValue: getConvertedValue(point.brlValue, 'BRL'),
        cadValue: getConvertedValue(point.cadValue, 'CAD')
      })),
      goalMarkers: timelineData.goalMarkers.map((goal: any) => ({
        ...goal,
        value: getConvertedValue(goal.value, goal.currency),
        currency: selectedCurrency,
        label: goal.label.replace(goal.currency, selectedCurrency)
      })),
      currentTotalValue: getConvertedValue(timelineData.currentBrlValue, 'BRL') + getConvertedValue(timelineData.currentCadValue, 'CAD'),
      currentBrlValue: getConvertedValue(timelineData.currentBrlValue, 'BRL'),
      currentCadValue: getConvertedValue(timelineData.currentCadValue, 'CAD')
    };
  };

  const formatCurrency = (value: number, originalCurrency: string) => {
    if (selectedCurrency === 'Original') {
      // Display in original currency
      const currencyCode = originalCurrency === 'BRL' ? 'BRL' : (originalCurrency === 'USD' ? 'USD' : 'CAD');
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
      }).format(value);
    } else {
      // Display in selected currency with conversion
      const convertedValue = convertCurrency(value, originalCurrency, selectedCurrency);
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: selectedCurrency,
      }).format(convertedValue);
    }
  };

  const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string): number => {
    if (fromCurrency === toCurrency || selectedCurrency === 'Original') {
      return amount;
    }

    // Simple conversion using mock rates (since Yahoo Finance is rate-limited)
    // In a real implementation, these would come from the exchange rates API
    const mockRates: {[key: string]: {[key: string]: number}} = {
      'BRL': { 'USD': 0.18, 'CAD': 0.25 },
      'CAD': { 'USD': 0.73, 'BRL': 4.0 },
      'USD': { 'CAD': 1.37, 'BRL': 5.5 }
    };

    if (mockRates[fromCurrency] && mockRates[fromCurrency][toCurrency]) {
      return amount * mockRates[fromCurrency][toCurrency];
    }

    return amount; // Fallback to original amount
  };

  const formatPerformance = (gainLoss: number, percentage: number, currency: string) => {
    const formattedAmount = formatCurrency(Math.abs(gainLoss), currency);
    const formattedPercentage = percentage.toFixed(2);
    const sign = gainLoss >= 0 ? '+' : '';
    return {
      amount: `${sign}${formattedAmount}`,
      percentage: `${sign}${formattedPercentage}%`,
      isPositive: gainLoss >= 0
    };
  };


  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!dashboardData) return <div>No data available</div>;

  const handleCurrencyChange = (currency: string) => {
    setSelectedCurrency(currency);
    // Save selected currency to localStorage
    localStorage.setItem('dashboardCurrency', currency);
    console.log(`Currency changed to: ${currency} (saved to localStorage)`);
  };

  const getConvertedValue = (value: number, originalCurrency: string): number => {
    if (selectedCurrency === 'Original') {
      return value;
    }
    return convertCurrency(value, originalCurrency, selectedCurrency);
  };

  const getDisplayCurrency = (originalCurrency: string): string => {
    return selectedCurrency === 'Original' ? originalCurrency : selectedCurrency;
  };

  const calculateTotalPortfolioValue = (): { total: number, display: string } => {
    if (!dashboardData?.accountGoals) {
      return { total: 0, display: '$0' };
    }

    if (selectedCurrency === 'Original') {
      // For original currency, calculate totals per currency
      let brlTotal = 0;
      let cadTotal = 0;
      let usdTotal = 0;

      dashboardData.accountGoals.forEach((account: any) => {
        if (account.currency === 'BRL') {
          brlTotal += account.currentValue;
        } else if (account.currency === 'CAD') {
          cadTotal += account.currentValue;
        } else if (account.currency === 'USD') {
          usdTotal += account.currentValue;
        }
      });

      // Format as multiple currencies if more than one exists
      const parts = [];
      if (brlTotal > 0) parts.push(formatCurrency(brlTotal, 'BRL'));
      if (cadTotal > 0) parts.push(formatCurrency(cadTotal, 'CAD'));
      if (usdTotal > 0) parts.push(formatCurrency(usdTotal, 'USD'));
      
      return { 
        total: brlTotal + cadTotal + usdTotal, 
        display: parts.length > 1 ? parts.join(' + ') : (parts[0] || '$0')
      };
    } else {
      // For converted currency, sum all converted values
      const convertedTotal = dashboardData.accountGoals.reduce((sum: number, account: any) => {
        return sum + getConvertedValue(account.currentValue, account.currency);
      }, 0);

      return {
        total: convertedTotal,
        display: formatCurrency(convertedTotal, selectedCurrency)
      };
    }
  };

  // Helper functions for chart data conversion
  const convertChartData = (data: any[]) => {
    if (selectedCurrency === 'Original') {
      return data; // No conversion needed
    }

    return data.map((item: any) => {
      // For account-based data, convert based on account's primary currency
      if (item.account) {
        const accountData = dashboardData?.accountGoals?.find((goal: any) => goal.accountName === item.account);
        const accountCurrency = accountData?.currency || 'CAD';
        return {
          ...item,
          total: getConvertedValue(item.total, accountCurrency)
        };
      }

      // For other data, handle differently based on context
      return {
        ...item,
        total: item.total // Will be handled per chart type
      };
    });
  };

  const convertCountryData = (data: any[]) => {
    if (selectedCurrency === 'Original') {
      return data;
    }

    return data.map((item: any) => {
      // Convert based on country's primary currency
      const countryCurrency = item.country === 'Brazil' ? 'BRL' : 'CAD';
      return {
        ...item,
        total: getConvertedValue(item.total, countryCurrency)
      };
    });
  };

  const convertCategoryData = (data: any[]) => {
    if (selectedCurrency === 'Original') {
      return data;
    }

    // For category data, we need to convert each category's total
    // This is more complex as categories span multiple currencies
    return data.map((item: any) => {
      // Get all investments in this category
      const categoryInvestments = dashboardData?.allInvestments.filter(
        (inv: any) => inv.category === item.category
      ) || [];

      // Convert each investment's value and sum them
      const convertedTotal = categoryInvestments.reduce((sum: number, inv: any) => {
        const invValue = inv.total || (inv.value * inv.quantity);
        return sum + getConvertedValue(invValue, inv.currency);
      }, 0);

      return {
        ...item,
        total: convertedTotal,
        // Recalculate percentage based on new totals
        percentage: 0 // Will be recalculated below
      };
    });
  };

  const portfolioTotal = calculateTotalPortfolioValue();

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-title-section">
          <h2>Investment Dashboard</h2>
          <div className="portfolio-total">
            <span className="total-label">Total Portfolio:</span>
            <span className="total-value">{portfolioTotal.display}</span>
          </div>
        </div>
        <CurrencySelector
          selectedCurrency={selectedCurrency}
          onCurrencyChange={handleCurrencyChange}
        />
      </div>

      {/* Enhanced Summary per Account with Goal Progress */}
      <section className="account-summary-section">
        <h3>Account Summary & Goals Progress</h3>
        <div className="account-summary-grid">
          {dashboardData.assetsByAccount && Array.isArray(dashboardData.assetsByAccount) &&
            dashboardData.assetsByAccount.map((accountData: any, index: number) => {
              const accountInvestments = dashboardData.allInvestments.filter(inv => inv.account.name === accountData.account);

              // Find corresponding account goals data
              const accountGoals = dashboardData.accountGoals?.find(
                (goal: any) => goal.accountName === accountData.account
              );

              // Use current value from performance if available, otherwise use invested value
              let brlTotal = 0;
              let cadTotal = 0;

              if (accountGoals?.performance) {
                // Use current values from performance data
                const brlInvestments = accountGoals.performance.investments.filter((inv: any) => inv.currency === 'BRL');
                const cadInvestments = accountGoals.performance.investments.filter((inv: any) => inv.currency === 'CAD');
                brlTotal = brlInvestments.reduce((sum: number, inv: any) => sum + inv.currentValue, 0);
                cadTotal = cadInvestments.reduce((sum: number, inv: any) => sum + inv.currentValue, 0);
              } else {
                // Fallback to invested values
                brlTotal = accountInvestments
                  .filter(inv => inv.currency === 'BRL')
                  .reduce((sum, inv) => sum + (inv.total || (inv.value * inv.quantity)), 0);
                cadTotal = accountInvestments
                  .filter(inv => inv.currency === 'CAD')
                  .reduce((sum, inv) => sum + (inv.total || (inv.value * inv.quantity)), 0);
              }

              // For display: convert all values to selected currency for comparison if not "Original"
              let displayBrlTotal = brlTotal;
              let displayCadTotal = cadTotal;
              
              if (selectedCurrency !== 'Original') {
                // Convert both to selected currency and combine them
                const convertedBrl = getConvertedValue(brlTotal, 'BRL');
                const convertedCad = getConvertedValue(cadTotal, 'CAD');
                const combinedTotal = convertedBrl + convertedCad;
                
                // Show combined total in selected currency
                displayBrlTotal = brlTotal > 0 ? combinedTotal : 0;
                displayCadTotal = cadTotal > 0 && brlTotal === 0 ? combinedTotal : 0;
              }

              // Determine primary country based on which currency has higher original total
              const primaryCountry = brlTotal >= cadTotal ? 'Brazil' : 'Canada';
              const countryCode = primaryCountry === 'Brazil' ? 'BRA' : 'CAN';

              return (
                <div key={index} className="account-summary-card enhanced">
                  <div className="account-summary-header">
                    <div className="account-name-with-flag">
                      <h4>{accountData.account}</h4>
                      <span className={`country-code ${primaryCountry.toLowerCase()}`}>{countryCode}</span>
                    </div>
                    <span className="investment-count">{accountInvestments.length} investments</span>
                  </div>

                  <div className="account-summary-totals">
                    {selectedCurrency === 'Original' ? (
                      // Original currency display
                      <>
                        {brlTotal > 0 && (
                          <div className="currency-total-wrapper">
                            <div className="currency-total">
                              <span className="currency-label">BRL:</span>
                              <span className="currency-amount">{formatCurrency(brlTotal, 'BRL')}</span>
                            </div>
                            {accountGoals?.performance && accountGoals.currency === 'BRL' && accountGoals.performance.totalGainLoss !== 0 && (
                              <div className="performance-indicator-below">
                                <span className={`performance-amount ${accountGoals.performance.totalGainLoss >= 0 ? 'positive' : 'negative'}`}>
                                  {formatPerformance(accountGoals.performance.totalGainLoss, accountGoals.performance.totalGainLossPercentage, 'BRL').amount}
                                </span>
                                <span className={`performance-percentage ${accountGoals.performance.totalGainLoss >= 0 ? 'positive' : 'negative'}`}>
                                  ({formatPerformance(accountGoals.performance.totalGainLoss, accountGoals.performance.totalGainLossPercentage, 'BRL').percentage})
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                        {cadTotal > 0 && (
                          <div className="currency-total-wrapper">
                            <div className="currency-total">
                              <span className="currency-label">CAD:</span>
                              <span className="currency-amount">{formatCurrency(cadTotal, 'CAD')}</span>
                            </div>
                            {accountGoals?.performance && accountGoals.currency === 'CAD' && accountGoals.performance.totalGainLoss !== 0 && (
                              <div className="performance-indicator-below">
                                <span className={`performance-amount ${accountGoals.performance.totalGainLoss >= 0 ? 'positive' : 'negative'}`}>
                                  {formatPerformance(accountGoals.performance.totalGainLoss, accountGoals.performance.totalGainLossPercentage, 'CAD').amount}
                                </span>
                                <span className={`performance-percentage ${accountGoals.performance.totalGainLoss >= 0 ? 'positive' : 'negative'}`}>
                                  ({formatPerformance(accountGoals.performance.totalGainLoss, accountGoals.performance.totalGainLossPercentage, 'CAD').percentage})
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      // Converted currency display
                      <div className="currency-total-wrapper">
                        <div className="currency-total">
                          <span className="currency-label">{selectedCurrency}:</span>
                          <span className="currency-amount">
                            {formatCurrency(getConvertedValue(brlTotal, 'BRL') + getConvertedValue(cadTotal, 'CAD'), selectedCurrency)}
                          </span>
                        </div>
                        <div className="conversion-note">
                          <small>Converted from {brlTotal > 0 && cadTotal > 0 ? 'BRL + CAD' : (brlTotal > 0 ? 'BRL' : 'CAD')}</small>
                        </div>
                        {accountGoals?.performance && accountGoals.performance.totalGainLoss !== 0 && (
                          <div className="performance-indicator-below">
                            <span className={`performance-amount ${accountGoals.performance.totalGainLoss >= 0 ? 'positive' : 'negative'}`}>
                              {(accountGoals.performance.totalGainLoss >= 0 ? '+' : '') + formatCurrency(getConvertedValue(Math.abs(accountGoals.performance.totalGainLoss), accountGoals.currency), selectedCurrency)}
                            </span>
                            <span className={`performance-percentage ${accountGoals.performance.totalGainLoss >= 0 ? 'positive' : 'negative'}`}>
                              ({accountGoals.performance.totalGainLoss >= 0 ? '+' : ''}{accountGoals.performance.totalGainLossPercentage.toFixed(2)}%)
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Compact Goal Progress Bars */}
                  {accountGoals && (
                    <div className="compact-goals-progress">
                      <h5>Financial Goals</h5>
                      <div className="compact-goals-grid">
                        {[1, 2, 3, 4, 5].map((year) => {
                          const goalKey = `year${year}` as keyof typeof accountGoals.goals;
                          const goalValue = accountGoals.goals[goalKey];

                          if (!goalValue) return null;

                          const currentValue = accountGoals.currentValue;
                          const progress = Math.min((currentValue / goalValue) * 100, 100);
                          const progressColor = getProgressColor(progress);
                          const displayYear = 2024 + year; // 2025, 2026, 2027, 2028, 2029

                          return (
                            <div key={year} className="compact-goal-item">
                              <div className="compact-goal-header">
                                <span className="goal-year-label">{displayYear}</span>
                                <span className="goal-percentage">{Math.round(progress)}%</span>
                              </div>
                              <div className="compact-progress-bar-container">
                                <div
                                  className="compact-progress-bar"
                                  style={{
                                    width: `${progress}%`,
                                    backgroundColor: progressColor
                                  }}
                                />
                              </div>
                              <div className="goal-target-value">
                                {formatCurrency(goalValue, accountGoals.currency)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Account Performance Summary */}
                  {accountGoals?.performance && accountGoals.performance.totalGainLoss !== 0 && (
                    <div className="account-performance-summary">
                      <div className="performance-label">Overall Performance:</div>
                      <div className="performance-values">
                        <span className={`performance-amount ${accountGoals.performance.totalGainLoss >= 0 ? 'positive' : 'negative'}`}>
                          {formatPerformance(accountGoals.performance.totalGainLoss, accountGoals.performance.totalGainLossPercentage, accountGoals.currency).amount}
                        </span>
                        <span className={`performance-percentage ${accountGoals.performance.totalGainLoss >= 0 ? 'positive' : 'negative'}`}>
                          ({formatPerformance(accountGoals.performance.totalGainLoss, accountGoals.performance.totalGainLossPercentage, accountGoals.currency).percentage})
                        </span>
                      </div>
                    </div>
                  )}

                  <button
                    className="view-account-btn"
                    onClick={() => onNavigateToAccount?.(accountData.account)}
                  >
                    View Details →
                  </button>
                </div>
              );
            })
          }
        </div>
      </section>

      {/* Charts Section */}
      <section className="charts-section">
        <div className="charts-container">
          {/* Assets by Account */}
          <div className="chart-item">
            <h3>Assets by Account {selectedCurrency !== 'Original' ? `(${selectedCurrency})` : ''}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={convertChartData(dashboardData.assetsByAccount)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="account" />
                <YAxis />
                <Tooltip formatter={(value) => [
                  selectedCurrency !== 'Original' 
                    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedCurrency }).format(value as number)
                    : `$${value}`, 
                  'Total'
                ]} />
                <Legend />
                <Bar dataKey="total" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Assets by Country */}
          <div className="chart-item">
            <h3>Assets by Country {selectedCurrency !== 'Original' ? `(${selectedCurrency})` : ''}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={convertCountryData(dashboardData.assetsByCountry)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ country, total }) => 
                    `${country}: ${selectedCurrency !== 'Original' 
                      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedCurrency }).format(total)
                      : `$${total}`
                    }`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="total"
                >
                  {dashboardData.assetsByCountry.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [
                  selectedCurrency !== 'Original' 
                    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedCurrency }).format(value as number)
                    : `$${value}`, 
                  'Total'
                ]} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Asset Allocation Breakdown */}
          <div className="chart-item">
            <h3>Asset Allocation Breakdown {selectedCurrency !== 'Original' ? `(${selectedCurrency})` : ''}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={(() => {
                    const convertedData = convertCategoryData(dashboardData.assetsByCategory);
                    const totalConverted = convertedData.reduce((sum, item) => sum + item.total, 0);
                    
                    // Recalculate percentages based on converted totals
                    return convertedData.map(item => ({
                      ...item,
                      percentage: totalConverted > 0 ? Math.round((item.total / totalConverted) * 100 * 100) / 100 : 0
                    }));
                  })()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) =>
                    `${getCategoryLabel(entry.category)}: ${entry.percentage}%`
                  }
                  outerRadius={80}
                  fill="#82ca9d"
                  dataKey="total"
                >
                  {dashboardData.assetsByCategory.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, _name, props: any) => [
                    `${selectedCurrency !== 'Original' 
                      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedCurrency }).format(value as number)
                      : `$${value}`
                    } (${props.payload.percentage}%)`,
                    `${getCategoryLabel(props.payload.category)} - ${props.payload.count} investments`
                  ]}
                />
                <Legend
                  formatter={(_value, entry: any) => getCategoryLabel(entry.payload.category)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Portfolio Growth Timeline */}
          <div className="chart-item timeline-chart-item">
            {dashboardData.timelineData ? (
              <InvestmentTimeline 
                timelineData={getConvertedTimelineData(dashboardData.timelineData)} 
                displayCurrency={selectedCurrency !== 'Original' ? selectedCurrency : undefined}
              />
            ) : (
              <div className="timeline-loading">Loading timeline data...</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
