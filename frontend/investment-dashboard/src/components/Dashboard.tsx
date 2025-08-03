import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { DashboardData } from '../types/Investment';
import { getCategoryLabel } from '../types/Investment';
import { investmentApi } from '../services/api';
import { currencyApi } from '../services/currencyApi';
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
  const [currencyRates, setCurrencyRates] = useState<{[key: string]: number}>({});
  const [valuesHidden, setValuesHidden] = useState<boolean>(() => {
    // Load saved privacy setting from localStorage, default to false (values visible)
    return localStorage.getItem('dashboardValuesHidden') === 'true';
  });

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return '#27ae60'; // Green - Goal reached
    if (progress >= 75) return '#3498db';   // Blue - Halfway
    if (progress >= 50) return '#f39c12';   // Orange - Close to goal
    return '#e74c3c'; // Red - Far from goal
  };

  useEffect(() => {
    let isMounted = true;
    
    // Fetch both dashboard data and currency rates in parallel for better performance
    Promise.all([
      fetchDashboardData(),
      loadCurrencyRates()
    ]).catch(error => {
      if (isMounted) {
        console.error('Failed to load initial data:', error);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const loadCurrencyRates = async () => {
    try {
      // Get current rates (no need to refresh separately as getAllRates handles caching)
      const rates = await currencyApi.getAllRates();
      setCurrencyRates(rates);
    } catch (error) {
      console.warn('Failed to load currency rates:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await investmentApi.getDashboard();
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
    if (!timelineData) {
      return timelineData;
    }

    if (selectedCurrency === 'Original') {
      // For Original mode, convert to base currency (CAD) for proportional accuracy
      // but maintain original currency display in tooltips
      return {
        ...timelineData,
        timelinePoints: timelineData.timelinePoints.map((point: any) => ({
          ...point,
          totalValue: convertCurrency(point.brlValue, 'BRL', 'CAD') + convertCurrency(point.cadValue, 'CAD', 'CAD'),
          brlValue: convertCurrency(point.brlValue, 'BRL', 'CAD'),
          cadValue: convertCurrency(point.cadValue, 'CAD', 'CAD'),
          // Keep original values for display
          originalBrlValue: point.brlValue,
          originalCadValue: point.cadValue,
          displayMode: 'original'
        })),
        goalMarkers: timelineData.goalMarkers.map((goal: any) => ({
          ...goal,
          value: convertCurrency(goal.value, goal.currency, 'CAD'),
          originalValue: goal.value,
          originalCurrency: goal.currency,
          displayMode: 'original'
        })),
        currentTotalValue: convertCurrency(timelineData.currentBrlValue, 'BRL', 'CAD') + convertCurrency(timelineData.currentCadValue, 'CAD', 'CAD'),
        currentBrlValue: convertCurrency(timelineData.currentBrlValue, 'BRL', 'CAD'),
        currentCadValue: convertCurrency(timelineData.currentCadValue, 'CAD', 'CAD'),
        originalCurrentBrlValue: timelineData.currentBrlValue,
        originalCurrentCadValue: timelineData.currentCadValue,
        displayMode: 'original'
      };
    } else {
      // For converted mode, convert to selected currency
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
    }
  };

  const formatCurrency = (value: number, originalCurrency: string) => {
    if (valuesHidden) {
      return '•••••'; // Hide monetary values
    }
    
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
    return currencyApi.convertCurrencySync(amount, fromCurrency, toCurrency);
  };

  const getCurrencyRateDisplay = () => {
    if (!currencyRates || Object.keys(currencyRates).length === 0) {
      return null;
    }

    if (selectedCurrency === 'Original') {
      // For Original mode, show comprehensive cross rates with USD context
      const cadToBrl = currencyRates['CADBRL'];
      const cadToUsd = currencyRates['CADUSD'];
      const brlToUsd = currencyRates['BRLUSD'];
      
      if (cadToBrl && cadToUsd && brlToUsd) {
        return `1 CAD = ${cadToBrl.toFixed(3)} BRL = ${cadToUsd.toFixed(3)} USD`;
      } else if (cadToBrl && cadToUsd) {
        return `1 CAD = ${cadToBrl.toFixed(3)} BRL = ${cadToUsd.toFixed(3)} USD`;
      } else if (cadToBrl) {
        return `1 CAD = ${cadToBrl.toFixed(3)} BRL`;
      }
      
      // Fallback with reverse rates
      const brlToCad = currencyRates['BRLCAD'];
      if (brlToCad && brlToUsd) {
        const cadToUsdCalc = brlToUsd / brlToCad; // Calculate CAD to USD via BRL
        return `1 BRL = ${brlToCad.toFixed(3)} CAD | 1 CAD ≈ ${(1/brlToCad).toFixed(3)} BRL = ${cadToUsdCalc.toFixed(3)} USD`;
      } else if (brlToCad) {
        return `1 BRL = ${brlToCad.toFixed(3)} CAD`;
      }
      
      return '1 CAD ≈ 4.0 BRL ≈ 0.73 USD'; // Fallback
    } else {
      // For converted mode, show the rate to the selected currency
      // Determine the primary base currency from portfolio
      const hasBrl = dashboardData?.accountGoals?.some(account => account.currency === 'BRL');
      const hasCad = dashboardData?.accountGoals?.some(account => account.currency === 'CAD');
      
      let fromCurrency = 'CAD'; // Default
      if (hasBrl && !hasCad) {
        fromCurrency = 'BRL';
      } else if (hasBrl && hasCad) {
        // Show both major rates, but avoid showing 1:1 conversions
        const brlRate = currencyRates[`BRL${selectedCurrency}`] || (1 / (currencyRates[`${selectedCurrency}BRL`] || 1));
        const cadRate = currencyRates[`CAD${selectedCurrency}`] || (1 / (currencyRates[`${selectedCurrency}CAD`] || 1));
        
        if (selectedCurrency === 'BRL') {
          // When BRL is selected, show CAD to BRL and BRL to USD
          const brlToUsd = currencyRates['BRLUSD'] || (1 / (currencyRates['USDBRL'] || 1));
          if (cadRate && brlToUsd) {
            return `1 CAD = ${cadRate.toFixed(3)} BRL | 1 BRL = ${brlToUsd.toFixed(3)} USD`;
          }
        } else if (selectedCurrency === 'CAD') {
          // When CAD is selected, show BRL to CAD and CAD to USD  
          const cadToUsd = currencyRates['CADUSD'] || (1 / (currencyRates['USDCAD'] || 1));
          if (brlRate && cadToUsd) {
            return `1 BRL = ${brlRate.toFixed(3)} CAD | 1 CAD = ${cadToUsd.toFixed(3)} USD`;
          }
        } else {
          // For other currencies, show both rates normally
          if (brlRate && cadRate) {
            return `1 BRL = ${brlRate.toFixed(3)} ${selectedCurrency} | 1 CAD = ${cadRate.toFixed(3)} ${selectedCurrency}`;
          }
        }
      }
      
      // Show single rate, but avoid 1:1 conversions by showing USD rate instead
      if (fromCurrency === selectedCurrency) {
        // When converting to same currency, show USD rate instead
        const toUsdRate = currencyRates[`${fromCurrency}USD`] || (1 / (currencyRates[`USD${fromCurrency}`] || 1));
        if (toUsdRate && toUsdRate !== 1) {
          return `1 ${fromCurrency} = ${toUsdRate.toFixed(3)} USD`;
        }
      } else {
        const rate = currencyRates[`${fromCurrency}${selectedCurrency}`] || (1 / (currencyRates[`${selectedCurrency}${fromCurrency}`] || 1));
        
        if (rate && rate !== 1) {
          return `1 ${fromCurrency} = ${rate.toFixed(3)} ${selectedCurrency}`;
        }
      }
    }
    
    return null;
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

  const toggleValuesVisibility = () => {
    const newHiddenState = !valuesHidden;
    setValuesHidden(newHiddenState);
    // Save to localStorage for persistence
    localStorage.setItem('dashboardValuesHidden', newHiddenState.toString());
  };

  const getConvertedValue = (value: number, originalCurrency: string): number => {
    if (selectedCurrency === 'Original') {
      return value;
    }
    return convertCurrency(value, originalCurrency, selectedCurrency);
  };


  const calculateTotalPortfolioValue = (): { total: number, display: string } => {
    if (!dashboardData?.accountGoals) {
      return { total: 0, display: valuesHidden ? '•••••' : '$0' };
    }

    if (valuesHidden) {
      return { total: 0, display: '•••••' };
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
  const convertAccountChartData = (data: any[]) => {
    const convertedData = data.map((item: any) => {
      // Always recalculate from individual investments for accurate proportions
      const accountInvestments = dashboardData?.allInvestments?.filter(
        (inv: any) => inv.account.name === item.account
      ) || [];

      if (selectedCurrency === 'Original') {
        // For Original mode, calculate proportional value using a base currency (CAD)
        // This ensures correct proportions while preserving display in original currencies
        const proportionalTotal = accountInvestments.reduce((sum: number, inv: any) => {
          const invValue = inv.total || (inv.value * inv.quantity);
          return sum + convertCurrency(invValue, inv.currency, 'CAD');
        }, 0);

        return {
          ...item,
          total: proportionalTotal,
          originalTotal: item.total, // Keep original for display
          displayMode: 'original'
        };
      } else {
        // For converted mode, convert to selected currency
        const convertedTotal = accountInvestments.reduce((sum: number, inv: any) => {
          const invValue = inv.total || (inv.value * inv.quantity);
          return sum + getConvertedValue(invValue, inv.currency);
        }, 0);

        return {
          ...item,
          total: convertedTotal
        };
      }
    });

    // Sort by total amount (highest to lowest) using converted values
    return convertedData.sort((a, b) => b.total - a.total);
  };

  const convertCountryData = (data: any[]) => {
    return data.map((item: any) => {
      // Always recalculate from individual investments for accurate proportions
      const countryInvestments = dashboardData?.allInvestments?.filter(
        (inv: any) => inv.country === item.country
      ) || [];

      if (selectedCurrency === 'Original') {
        // For Original mode, calculate proportional value using a base currency (CAD)
        const proportionalTotal = countryInvestments.reduce((sum: number, inv: any) => {
          const invValue = inv.total || (inv.value * inv.quantity);
          return sum + convertCurrency(invValue, inv.currency, 'CAD');
        }, 0);

        return {
          ...item,
          total: proportionalTotal,
          originalTotal: item.total,
          displayMode: 'original'
        };
      } else {
        // For converted mode, convert to selected currency
        const convertedTotal = countryInvestments.reduce((sum: number, inv: any) => {
          const invValue = inv.total || (inv.value * inv.quantity);
          return sum + getConvertedValue(invValue, inv.currency);
        }, 0);

        return {
          ...item,
          total: convertedTotal
        };
      }
    });
  };

  const convertCategoryData = (data: any[]) => {
    return data.map((item: any) => {
      // Get all investments in this category
      const categoryInvestments = dashboardData?.allInvestments.filter(
        (inv: any) => inv.category === item.category
      ) || [];

      if (selectedCurrency === 'Original') {
        // For Original mode, calculate proportional value using a base currency (CAD)
        const proportionalTotal = categoryInvestments.reduce((sum: number, inv: any) => {
          const invValue = inv.total || (inv.value * inv.quantity);
          return sum + convertCurrency(invValue, inv.currency, 'CAD');
        }, 0);

        return {
          ...item,
          total: proportionalTotal,
          originalTotal: item.total,
          displayMode: 'original',
          percentage: 0 // Will be recalculated
        };
      } else {
        // For converted mode, convert to selected currency
        const convertedTotal = categoryInvestments.reduce((sum: number, inv: any) => {
          const invValue = inv.total || (inv.value * inv.quantity);
          return sum + getConvertedValue(invValue, inv.currency);
        }, 0);

        return {
          ...item,
          total: convertedTotal,
          percentage: 0 // Will be recalculated
        };
      }
    });
  };

  const portfolioTotal = calculateTotalPortfolioValue();

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-title-section">
          <div className="dashboard-title-with-toggle">
            <h2>Investment Dashboard</h2>
            <button 
              className="privacy-toggle-btn"
              onClick={toggleValuesVisibility}
              title={valuesHidden ? "Show values" : "Hide values"}
            >
              {valuesHidden ? '👁️' : '🙈'}
            </button>
          </div>
          <div className="portfolio-total">
            <div className="portfolio-total-main">
              <span className="total-label">Total Portfolio:</span>
              <span className="total-value">{portfolioTotal.display}</span>
            </div>
          </div>
        </div>
        <div className="currency-selector-section">
          <CurrencySelector
            selectedCurrency={selectedCurrency}
            onCurrencyChange={handleCurrencyChange}
          />
          {getCurrencyRateDisplay() && (
            <div className="currency-rate-display">
              <span className="rate-label">Rate:</span>
              <span className="rate-value">{getCurrencyRateDisplay()}</span>
            </div>
          )}
        </div>
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
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={convertAccountChartData(dashboardData.assetsByAccount)} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="account" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  fontSize={12}
                  stroke="#666"
                />
                <YAxis stroke="#666" fontSize={12} />
                <Tooltip formatter={(value, _name, props: any) => {
                  if (selectedCurrency === 'Original' && props.payload?.displayMode === 'original') {
                    // Show original currency values for each account
                    const accountInvestments = dashboardData?.allInvestments?.filter(
                      (inv: any) => inv.account.name === props.payload.account
                    ) || [];
                    
                    const brlTotal = accountInvestments
                      .filter(inv => inv.currency === 'BRL')
                      .reduce((sum, inv) => sum + (inv.total || (inv.value * inv.quantity)), 0);
                    const cadTotal = accountInvestments
                      .filter(inv => inv.currency === 'CAD')
                      .reduce((sum, inv) => sum + (inv.total || (inv.value * inv.quantity)), 0);
                    const usdTotal = accountInvestments
                      .filter(inv => inv.currency === 'USD')
                      .reduce((sum, inv) => sum + (inv.total || (inv.value * inv.quantity)), 0);
                    
                    const parts = [];
                    if (brlTotal > 0) parts.push(formatCurrency(brlTotal, 'BRL'));
                    if (cadTotal > 0) parts.push(formatCurrency(cadTotal, 'CAD'));
                    if (usdTotal > 0) parts.push(formatCurrency(usdTotal, 'USD'));
                    
                    return [parts.join(' + '), 'Total'];
                  } else {
                    return [
                      selectedCurrency !== 'Original' 
                        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedCurrency }).format(value as number)
                        : `$${value}`, 
                      'Total'
                    ];
                  }
                }} />
                <Bar dataKey="total">
                  {convertAccountChartData(dashboardData.assetsByAccount).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
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
                  formatter={(value, _name, props: any) => {
                    if (selectedCurrency === 'Original' && props.payload?.displayMode === 'original') {
                      // Show original currency breakdown for each category
                      const categoryInvestments = dashboardData?.allInvestments?.filter(
                        (inv: any) => inv.category === props.payload.category
                      ) || [];
                      
                      const brlTotal = categoryInvestments
                        .filter(inv => inv.currency === 'BRL')
                        .reduce((sum, inv) => sum + (inv.total || (inv.value * inv.quantity)), 0);
                      const cadTotal = categoryInvestments
                        .filter(inv => inv.currency === 'CAD')
                        .reduce((sum, inv) => sum + (inv.total || (inv.value * inv.quantity)), 0);
                      const usdTotal = categoryInvestments
                        .filter(inv => inv.currency === 'USD')
                        .reduce((sum, inv) => sum + (inv.total || (inv.value * inv.quantity)), 0);
                      
                      const parts = [];
                      if (brlTotal > 0) parts.push(formatCurrency(brlTotal, 'BRL'));
                      if (cadTotal > 0) parts.push(formatCurrency(cadTotal, 'CAD'));
                      if (usdTotal > 0) parts.push(formatCurrency(usdTotal, 'USD'));
                      
                      return [
                        `${parts.join(' + ')} (${props.payload.percentage}%)`,
                        `${getCategoryLabel(props.payload.category)} - ${props.payload.count} investments`
                      ];
                    } else {
                      return [
                        `${selectedCurrency !== 'Original' 
                          ? new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedCurrency }).format(value as number)
                          : `$${value}`
                        } (${props.payload.percentage}%)`,
                        `${getCategoryLabel(props.payload.category)} - ${props.payload.count} investments`
                      ];
                    }
                  }}
                />
                <Legend
                  formatter={(_value, entry: any) => getCategoryLabel(entry.payload.category)}
                />
              </PieChart>
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
                  label={(entry: any) => {
                    if (selectedCurrency === 'Original' && entry.displayMode === 'original') {
                      // Show original currency values for each country
                      const countryInvestments = dashboardData?.allInvestments?.filter(
                        (inv: any) => inv.country === entry.country
                      ) || [];
                      
                      const brlTotal = countryInvestments
                        .filter(inv => inv.currency === 'BRL')
                        .reduce((sum, inv) => sum + (inv.total || (inv.value * inv.quantity)), 0);
                      const cadTotal = countryInvestments
                        .filter(inv => inv.currency === 'CAD')
                        .reduce((sum, inv) => sum + (inv.total || (inv.value * inv.quantity)), 0);
                      const usdTotal = countryInvestments
                        .filter(inv => inv.currency === 'USD')
                        .reduce((sum, inv) => sum + (inv.total || (inv.value * inv.quantity)), 0);
                      
                      const parts = [];
                      if (brlTotal > 0) parts.push(formatCurrency(brlTotal, 'BRL'));
                      if (cadTotal > 0) parts.push(formatCurrency(cadTotal, 'CAD'));
                      if (usdTotal > 0) parts.push(formatCurrency(usdTotal, 'USD'));
                      
                      return `${entry.country}: ${parts.join(' + ')}`;
                    } else {
                      return `${entry.country}: ${selectedCurrency !== 'Original' 
                        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedCurrency }).format(entry.total)
                        : `$${entry.total}`
                      }`;
                    }
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="total"
                >
                  {dashboardData.assetsByCountry.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, _name, props: any) => {
                  if (selectedCurrency === 'Original' && props.payload?.displayMode === 'original') {
                    // Show original currency values for each country
                    const countryInvestments = dashboardData?.allInvestments?.filter(
                      (inv: any) => inv.country === props.payload.country
                    ) || [];
                    
                    const brlTotal = countryInvestments
                      .filter(inv => inv.currency === 'BRL')
                      .reduce((sum, inv) => sum + (inv.total || (inv.value * inv.quantity)), 0);
                    const cadTotal = countryInvestments
                      .filter(inv => inv.currency === 'CAD')
                      .reduce((sum, inv) => sum + (inv.total || (inv.value * inv.quantity)), 0);
                    const usdTotal = countryInvestments
                      .filter(inv => inv.currency === 'USD')
                      .reduce((sum, inv) => sum + (inv.total || (inv.value * inv.quantity)), 0);
                    
                    const parts = [];
                    if (brlTotal > 0) parts.push(formatCurrency(brlTotal, 'BRL'));
                    if (cadTotal > 0) parts.push(formatCurrency(cadTotal, 'CAD'));
                    if (usdTotal > 0) parts.push(formatCurrency(usdTotal, 'USD'));
                    
                    return [parts.join(' + '), 'Total'];
                  } else {
                    return [
                      selectedCurrency !== 'Original' 
                        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedCurrency }).format(value as number)
                        : `$${value}`, 
                      'Total'
                    ];
                  }
                }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Portfolio Growth Timeline */}
          <div className="chart-item timeline-chart-item">
            {dashboardData.timelineData ? (
              <InvestmentTimeline 
                timelineData={getConvertedTimelineData(dashboardData.timelineData)} 
                displayCurrency={selectedCurrency !== 'Original' ? selectedCurrency : undefined}
                valuesHidden={valuesHidden}
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
