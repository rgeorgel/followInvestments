import React, { useState, useEffect } from 'react';
import type { Investment } from '../types/Investment';
import { getCategoryLabel } from '../types/Investment';
import { investmentApi } from '../services/api';
import EditInvestmentForm from './EditInvestmentForm';

interface AccountInvestmentsProps {
  account: string;
  onBack: () => void;
}

const AccountInvestments: React.FC<AccountInvestmentsProps> = ({ account, onBack }) => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);

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
    } catch (err) {
      setError('Failed to fetch investments');
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
        </div>
      </div>

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
                <th>Name</th>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Unit Value</th>
                <th>Quantity</th>
                <th>Total</th>
                <th>Country</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {investments.map((investment: Investment) => (
                <tr key={investment.id}>
                  <td>{investment.name}</td>
                  <td>{new Date(investment.date).toLocaleDateString()}</td>
                  <td>{investment.description}</td>
                  <td>{getCategoryLabel(investment.category)}</td>
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
    </div>
  );
};

export default AccountInvestments;