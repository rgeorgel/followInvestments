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


  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!dashboardData) return <div>No data available</div>;

  return (
    <div className="dashboard">
      <h2>Investment Dashboard</h2>


      {/* Summary per Account */}
      <section className="account-summary-section">
        <h3>Summary per Account</h3>
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
              
              return (
                <div key={index} className="account-summary-card">
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
                      </div>
                    )}
                    {cadTotal > 0 && (
                      <div className="currency-total">
                        <span className="currency-label">CAD:</span>
                        <span className="currency-amount">{formatCurrency(cadTotal, 'CAD')}</span>
                      </div>
                    )}
                  </div>
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