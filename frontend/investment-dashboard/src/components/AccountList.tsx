import React, { useState, useEffect } from 'react';
import type { Account } from '../types/Account';
import { accountApi } from '../services/accountApi';
import AccountForm from './AccountForm';
import EditAccountForm from './EditAccountForm';

const AccountList: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const data = await accountApi.getAll();
      setAccounts(data);
    } catch (err) {
      setError('Failed to fetch accounts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    fetchAccounts();
  };

  const handleEditSuccess = () => {
    setEditingAccount(null);
    fetchAccounts();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
      try {
        await accountApi.delete(id);
        fetchAccounts();
      } catch (err: any) {
        alert(err.message || 'Failed to delete account');
      }
    }
  };

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return 'Not set';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  if (loading) return <div>Loading accounts...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="account-list">
      <div className="account-list-header">
        <h2>Account Management</h2>
        <button 
          className="create-btn"
          onClick={() => setShowCreateForm(true)}
        >
          Create New Account
        </button>
      </div>

      {accounts.length === 0 ? (
        <div className="empty-state">
          <p>No accounts found. Create your first account to get started.</p>
        </div>
      ) : (
        <div className="accounts-table">
          <table>
            <thead>
              <tr>
                <th>Account Name</th>
                <th className="goal-col">Goal Year 1</th>
                <th className="goal-col">Goal Year 3</th>
                <th className="goal-col goal-col-hidden-mobile">Goal Year 5</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td className="account-name">{account.name}</td>
                  <td className="goal-col">{formatCurrency(account.goal1)}</td>
                  <td className="goal-col">{formatCurrency(account.goal3)}</td>
                  <td className="goal-col goal-col-hidden-mobile">{formatCurrency(account.goal5)}</td>
                  <td className="account-actions">
                    <button 
                      className="edit-btn"
                      onClick={() => setEditingAccount(account)}
                    >
                      Edit
                    </button>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDelete(account.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateForm && (
        <AccountForm 
          onSuccess={handleCreateSuccess}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {editingAccount && (
        <EditAccountForm 
          account={editingAccount}
          onSuccess={handleEditSuccess}
          onCancel={() => setEditingAccount(null)}
        />
      )}
    </div>
  );
};

export default AccountList;