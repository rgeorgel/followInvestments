import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { Investment, AccountPerformance } from '../types/Investment';
import { getCategoryLabel } from '../types/Investment';
import { investmentApi } from '../services/api';
import EditInvestmentForm from './EditInvestmentForm';

interface AccountInvestmentsProps {
  account: string;
  onBack: () => void;
}

type SortField = 'name' | 'date' | 'category' | 'purchasePrice' | 'currentPrice' | 'quantity' | 'currentValue' | 'percentage' | 'gainLoss';
type SortDirection = 'asc' | 'desc';

const AccountInvestments: React.FC<AccountInvestmentsProps> = ({ account, onBack }) => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [accountPerformance, setAccountPerformance] = useState<AccountPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [sortField, setSortField] = useState<SortField>('percentage');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    fetchInvestments();
  }, [account]);

  const fetchInvestments = async () => {
    try {
      setLoading(true);
      const allInvestments = await investmentApi.getAll();
      // Filter investments by account
      const accountInvestments = allInvestments.filter(inv => inv.account.name === account);
      setInvestments(accountInvestments);

      // Fetch account performance data
      if (accountInvestments.length > 0) {
        await fetchAccountPerformance(accountInvestments[0].accountId);
      }
    } catch (err) {
      setError('Failed to fetch investments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountPerformance = async (accountId: number) => {
    try {
      const response = await fetch(`http://localhost:9900/api/investments/account/${accountId}/performance`);
      if (response.ok) {
        const performance = await response.json();
        setAccountPerformance(performance);
      }
    } catch (err) {
      console.error('Failed to fetch account performance:', err);
      // Don't set error state since performance is optional
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortedInvestments = () => {
    const totalAccountValue = accountPerformance ? 
      accountPerformance.currentValue : 
      investments.reduce((sum, inv) => sum + (inv.total || (inv.value * inv.quantity)), 0);

    return [...investments].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      const aPerformance = accountPerformance?.investments.find(ip => ip.investmentId === a.id);
      const bPerformance = accountPerformance?.investments.find(ip => ip.investmentId === b.id);

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'category':
          aValue = getCategoryLabel(a.category).toLowerCase();
          bValue = getCategoryLabel(b.category).toLowerCase();
          break;
        case 'purchasePrice':
          aValue = a.value;
          bValue = b.value;
          break;
        case 'currentPrice':
          aValue = aPerformance?.currentPrice || 0;
          bValue = bPerformance?.currentPrice || 0;
          break;
        case 'quantity':
          aValue = a.quantity;
          bValue = b.quantity;
          break;
        case 'currentValue':
          aValue = aPerformance ? aPerformance.currentValue : (a.total || (a.value * a.quantity));
          bValue = bPerformance ? bPerformance.currentValue : (b.total || (b.value * b.quantity));
          break;
        case 'percentage':
          const aCurrentValue = aPerformance ? aPerformance.currentValue : (a.total || (a.value * a.quantity));
          const bCurrentValue = bPerformance ? bPerformance.currentValue : (b.total || (b.value * b.quantity));
          aValue = totalAccountValue > 0 ? (aCurrentValue / totalAccountValue) * 100 : 0;
          bValue = totalAccountValue > 0 ? (bCurrentValue / totalAccountValue) * 100 : 0;
          break;
        case 'gainLoss':
          aValue = aPerformance?.gainLoss || 0;
          bValue = bPerformance?.gainLoss || 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
    });
  };

  const handleEdit = (investment: Investment) => {
    setEditingInvestment(investment);
  };

  const handleDelete = async (investmentId: number) => {
    if (window.confirm('Are you sure you want to delete this investment?')) {
      try {
        await investmentApi.delete(investmentId);
        await fetchInvestments(); // Refresh the data
      } catch (err) {
        setError('Failed to delete investment');
        console.error(err);
      }
    }
  };

  const handleEditSuccess = () => {
    setEditingInvestment(null);
    fetchInvestments(); // Refresh the data
  };

  const totalBRL = investments.filter(inv => inv.currency === 'BRL').reduce((sum, inv) => sum + (inv.total || (inv.value * inv.quantity)), 0);
  const totalCAD = investments.filter(inv => inv.currency === 'CAD').reduce((sum, inv) => sum + (inv.total || (inv.value * inv.quantity)), 0);

  // Group investments by name for the breakdown chart
  const investmentBreakdown = investments.reduce((acc, investment) => {
    const total = investment.total || (investment.value * investment.quantity);
    const existingItem = acc.find(item => item.name === investment.name);

    if (existingItem) {
      existingItem.value += total;
      existingItem.quantity += investment.quantity;
    } else {
      acc.push({
        name: investment.name,
        value: total,
        quantity: investment.quantity,
        category: getCategoryLabel(investment.category),
        currency: investment.currency
      });
    }

    return acc;
  }, [] as Array<{name: string; value: number; quantity: number; category: string; currency: string}>);

  // Sort by value descending
  investmentBreakdown.sort((a, b) => b.value - a.value);

  // Colors for the pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#d084d0', '#ffb347'];

  if (loading) return <div>Loading investments...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="account-investments">
      <div className="account-header">
        <button onClick={onBack} className="back-btn">← Back to Dashboard</button>
        <h2>Investments - {account}</h2>
        <div className="account-summary">
          <div className="summary-item">
            <span className="label">Total Investments:</span>
            <span className="value">{investments.length}</span>
          </div>
          {totalBRL > 0 && (
            <div className="summary-item">
              <span className="label">Total BRL:</span>
              <span className="value">{formatCurrency(totalBRL, 'BRL')}</span>
            </div>
          )}
          {totalCAD > 0 && (
            <div className="summary-item">
              <span className="label">Total CAD:</span>
              <span className="value">{formatCurrency(totalCAD, 'CAD')}</span>
            </div>
          )}
          {accountPerformance && (
            <>
              <div className="summary-item performance-summary">
                <span className="label">Current Value:</span>
                <span className="value">{formatCurrency(accountPerformance.currentValue, accountPerformance.investments[0]?.currency || 'CAD')}</span>
              </div>
              <div className="summary-item performance-summary">
                <span className="label">Total Invested:</span>
                <span className="value">{formatCurrency(accountPerformance.totalInvested, accountPerformance.investments[0]?.currency || 'CAD')}</span>
              </div>
              <div className="summary-item performance-summary">
                <span className="label">Performance:</span>
                <span className={`value performance-value ${accountPerformance.totalGainLoss >= 0 ? 'positive' : 'negative'}`}>
                  {formatPerformance(accountPerformance.totalGainLoss, accountPerformance.totalGainLossPercentage, accountPerformance.investments[0]?.currency || 'CAD').amount}
                  <span className="performance-percentage">
                    {' '}({formatPerformance(accountPerformance.totalGainLoss, accountPerformance.totalGainLossPercentage, accountPerformance.investments[0]?.currency || 'CAD').percentage})
                  </span>
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Investment Breakdown Chart */}
      {investmentBreakdown.length > 0 && (
        <section className="investment-breakdown-section">
          <h3>Investment Breakdown</h3>
          <div className="breakdown-content">
            <div className="breakdown-chart">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={investmentBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => {
                      const total = totalBRL + totalCAD;
                      if (!value || total === 0) return '';
                      const percentage = ((value / total) * 100).toFixed(1);
                      return `${name}: ${percentage}%`;
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {investmentBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, _name, props) => [
                      formatCurrency(value, props.payload.currency),
                      `${props.payload.name} (${props.payload.category})`
                    ]}
                  />
                  <Legend
                    formatter={(_value, entry: any) => (
                      <span style={{ color: entry.color }}>
                        {entry.payload.name} - {formatCurrency(entry.payload.value, entry.payload.currency)}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="breakdown-summary">
              <h4>Investment Summary</h4>
              <div className="breakdown-list">
                {investmentBreakdown.map((item, index) => {
                  const percentage = ((item.value / (totalBRL + totalCAD)) * 100).toFixed(1);
                  return (
                    <div key={item.name} className="breakdown-item">
                      <div className="breakdown-item-header">
                        <div className="breakdown-color" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <span className="breakdown-name">{item.name}</span>
                        <span className="breakdown-percentage">{percentage}%</span>
                      </div>
                      <div className="breakdown-details">
                        <span className="breakdown-category">{item.category}</span>
                        <span className="breakdown-value">{formatCurrency(item.value, item.currency)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {editingInvestment && (
        <EditInvestmentForm
          investment={editingInvestment}
          onSuccess={handleEditSuccess}
          onCancel={() => setEditingInvestment(null)}
        />
      )}

      <section className="investments-list">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th className="sortable" onClick={() => handleSort('name')}>
                  Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="sortable" onClick={() => handleSort('date')}>
                  Date {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="sortable" onClick={() => handleSort('category')}>
                  Category {sortField === 'category' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="sortable" onClick={() => handleSort('purchasePrice')}>
                  Purchase Price {sortField === 'purchasePrice' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="sortable" onClick={() => handleSort('currentPrice')}>
                  Current Price {sortField === 'currentPrice' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="sortable" onClick={() => handleSort('quantity')}>
                  Quantity {sortField === 'quantity' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="sortable" onClick={() => handleSort('currentValue')}>
                  Current Value {sortField === 'currentValue' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="sortable" onClick={() => handleSort('percentage')}>
                  % of Account {sortField === 'percentage' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="sortable" onClick={() => handleSort('gainLoss')}>
                  Gain/Loss {sortField === 'gainLoss' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getSortedInvestments().map((investment: Investment) => {
                const investmentPerformance = accountPerformance?.investments.find(
                  ip => ip.investmentId === investment.id
                );

                // Calculate the current value of this investment
                const currentInvestmentValue = investmentPerformance ? 
                  investmentPerformance.currentValue : 
                  (investment.total || (investment.value * investment.quantity));

                // Calculate total account value for percentage calculation
                const totalAccountValue = accountPerformance ? 
                  accountPerformance.currentValue : 
                  investments.reduce((sum, inv) => sum + (inv.total || (inv.value * inv.quantity)), 0);

                // Calculate percentage of account
                const percentageOfAccount = totalAccountValue > 0 ? 
                  (currentInvestmentValue / totalAccountValue) * 100 : 0;

                return (
                  <tr key={investment.id}>
                    <td>{investment.name}</td>
                    <td>{new Date(investment.date).toLocaleDateString()}</td>
                    <td>{getCategoryLabel(investment.category)}</td>
                    <td>{formatCurrency(investment.value, investment.currency)}</td>
                    <td>
                      {investmentPerformance?.currentPrice ?
                        formatCurrency(investmentPerformance.currentPrice, investment.currency) :
                        <span className="no-price">N/A</span>
                      }
                    </td>
                    <td>{Math.round(investment.quantity)}</td>
                    <td>
                      {investmentPerformance ?
                        formatCurrency(investmentPerformance.currentValue, investment.currency) :
                        formatCurrency(investment.total || (investment.value * investment.quantity), investment.currency)
                      }
                    </td>
                    <td className="percentage-column">
                      {percentageOfAccount.toFixed(1)}%
                    </td>
                    <td>
                      {investmentPerformance && investmentPerformance.gainLoss !== 0 ? (
                        <div className="investment-performance">
                          <span className={`performance-amount ${investmentPerformance.gainLoss >= 0 ? 'positive' : 'negative'}`}>
                            {formatPerformance(investmentPerformance.gainLoss, investmentPerformance.gainLossPercentage, investment.currency).amount}
                          </span>
                          <br />
                          <span className={`performance-percentage ${investmentPerformance.gainLoss >= 0 ? 'positive' : 'negative'}`}>
                            ({formatPerformance(investmentPerformance.gainLoss, investmentPerformance.gainLossPercentage, investment.currency).percentage})
                          </span>
                        </div>
                      ) : (
                        <span className="no-performance">-</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="edit-btn"
                          onClick={() => handleEdit(investment)}
                          title="Edit investment"
                        >
                          Edit
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(investment.id)}
                          title="Delete investment"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AccountInvestments;
