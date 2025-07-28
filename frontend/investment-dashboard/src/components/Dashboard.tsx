import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Investment, DashboardData } from '../types/Investment';
import { getCategoryLabel } from '../types/Investment';
import { investmentApi } from '../services/api';
import EditInvestmentForm from './EditInvestmentForm';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);

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

  const handleEdit = (investment: Investment) => {
    setEditingInvestment(investment);
  };

  const handleDelete = async (investmentId: number) => {
    if (window.confirm('Are you sure you want to delete this investment?')) {
      try {
        await investmentApi.delete(investmentId);
        await fetchDashboardData(); // Refresh the data
      } catch (err) {
        setError('Failed to delete investment');
        console.error(err);
      }
    }
  };

  const handleEditSuccess = () => {
    setEditingInvestment(null);
    fetchDashboardData(); // Refresh the data
  };

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!dashboardData) return <div>No data available</div>;

  return (
    <div className="dashboard">
      <h2>Investment Dashboard</h2>
      
      {editingInvestment && (
        <EditInvestmentForm
          investment={editingInvestment}
          onSuccess={handleEditSuccess}
          onCancel={() => setEditingInvestment(null)}
        />
      )}

      {/* All Investments List */}
      <section className="investments-list">
        <h3>All Investments</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Account</th>
                <th>Unit Value</th>
                <th>Quantity</th>
                <th>Total</th>
                <th>Country</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.allInvestments.map((investment: Investment) => (
                <tr key={investment.id}>
                  <td>{investment.name}</td>
                  <td>{new Date(investment.date).toLocaleDateString()}</td>
                  <td>{investment.description}</td>
                  <td>{getCategoryLabel(investment.category)}</td>
                  <td>{investment.account}</td>
                  <td>{formatCurrency(investment.value, investment.currency)}</td>
                  <td>{investment.quantity.toFixed(4)}</td>
                  <td>{formatCurrency(investment.total || (investment.value * investment.quantity), investment.currency)}</td>
                  <td>{investment.country}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Grouped Investments List */}
      {dashboardData.groupedInvestments && dashboardData.groupedInvestments.length > 0 && (
        <section className="investments-list">
          <h3>Grouped Investments (by Category, Account & Name)</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Account</th>
                  <th>Total Quantity</th>
                  <th>Average Value</th>
                  <th>Total Value</th>
                  <th>Currency</th>
                  <th>Country</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.groupedInvestments.map((group, index) => (
                  <tr key={index}>
                    <td>{group.name}</td>
                    <td>{getCategoryLabel(group.category)}</td>
                    <td>{group.account}</td>
                    <td>{group.totalQuantity.toFixed(4)}</td>
                    <td>{formatCurrency(group.averageValue, group.currency)}</td>
                    <td>{formatCurrency(group.total, group.currency)}</td>
                    <td>{group.currency}</td>
                    <td>{group.country}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

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
        </div>
      </section>
    </div>
  );
};

export default Dashboard;