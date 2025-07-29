import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { DashboardData } from '../types/Investment';
import { getCategoryLabel } from '../types/Investment';
import { investmentApi } from '../services/api';

interface DashboardProps {
  onNavigateToAccount?: (account: string) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Dashboard: React.FC<DashboardProps> = ({ onNavigateToAccount }) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return '#27ae60'; // Green - Goal reached
    if (progress >= 75) return '#f39c12';   // Orange - Close to goal
    if (progress >= 50) return '#3498db';   // Blue - Halfway
    return '#e74c3c'; // Red - Far from goal
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

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

  const formatCurrency = (value: number, currency: string) => {
    const currencyCode = currency === 'BRL' ? 'BRL' : 'CAD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(value);
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

  return (
    <div className="dashboard">
      <h2>Investment Dashboard</h2>

      {/* Enhanced Summary per Account with Goal Progress */}
      <section className="account-summary-section">
        <h3>Account Summary & Goals Progress</h3>
        <div className="account-summary-grid">
          {dashboardData.assetsByAccount && Array.isArray(dashboardData.assetsByAccount) &&
            dashboardData.assetsByAccount.map((accountData: any, index: number) => {
              const accountInvestments = dashboardData.allInvestments.filter(inv => inv.account.name === accountData.account);
              const brlTotal = accountInvestments
                .filter(inv => inv.currency === 'BRL')
                .reduce((sum, inv) => sum + (inv.total || (inv.value * inv.quantity)), 0);
              const cadTotal = accountInvestments
                .filter(inv => inv.currency === 'CAD')
                .reduce((sum, inv) => sum + (inv.total || (inv.value * inv.quantity)), 0);

              // Determine primary country based on which currency has higher total
              const primaryCountry = brlTotal >= cadTotal ? 'Brazil' : 'Canada';
              const countryCode = primaryCountry === 'Brazil' ? 'BRA' : 'CAN';

              // Find corresponding account goals data
              const accountGoals = dashboardData.accountGoals?.find(
                (goal: any) => goal.accountName === accountData.account
              );

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
                    {brlTotal > 0 && (
                      <div className="currency-total">
                        <span className="currency-label">BRL:</span>
                        <span className="currency-amount">{formatCurrency(brlTotal, 'BRL')}</span>
                        {accountGoals?.performance && accountGoals.currency === 'BRL' && accountGoals.performance.totalGainLoss !== 0 && (
                          <div className="performance-indicator">
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
                      <div className="currency-total">
                        <span className="currency-label">CAD:</span>
                        <span className="currency-amount">{formatCurrency(cadTotal, 'CAD')}</span>
                        {accountGoals?.performance && accountGoals.currency === 'CAD' && accountGoals.performance.totalGainLoss !== 0 && (
                          <div className="performance-indicator">
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
            <h3>Assets by Account</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData.assetsByAccount}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="account" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, 'Total']} />
                <Legend />
                <Bar dataKey="total" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Assets by Country */}
          <div className="chart-item">
            <h3>Assets by Country</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dashboardData.assetsByCountry}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ country, total }) => `${country}: $${total}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="total"
                >
                  {dashboardData.assetsByCountry.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`$${value}`, 'Total']} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Asset Allocation Breakdown */}
          <div className="chart-item">
            <h3>Asset Allocation Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dashboardData.assetsByCategory}
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
                    `$${value} (${props.payload.percentage}%)`,
                    `${getCategoryLabel(props.payload.category)} - ${props.payload.count} investments`
                  ]}
                />
                <Legend
                  formatter={(_value, entry: any) => getCategoryLabel(entry.payload.category)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
