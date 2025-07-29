import React, { useState } from 'react';
import type { Account } from '../types/Account';
import { accountApi } from '../services/accountApi';

interface EditAccountFormProps {
  account: Account;
  onSuccess: () => void;
  onCancel: () => void;
}

const EditAccountForm: React.FC<EditAccountFormProps> = ({ account, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState<Account>({
    ...account
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await accountApi.update(account.id, formData);
      onSuccess();
    } catch (err) {
      setError('Failed to update account');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let processedValue: any = value;
    
    if (name.startsWith('goal') && value !== '') {
      processedValue = parseFloat(value) || undefined;
    } else if (name.startsWith('goal') && value === '') {
      processedValue = undefined;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="account-form modal-content">
        <h2>Edit Account</h2>
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Account Name:</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              maxLength={100}
              required
            />
          </div>

          <div className="goals-section">
            <h3>Financial Goals (Optional)</h3>
            <div className="goals-grid-form">
              <div className="form-group">
                <label htmlFor="goal1">1 Year Goal:</label>
                <input
                  type="number"
                  id="goal1"
                  name="goal1"
                  value={formData.goal1 || ''}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="Target amount"
                />
              </div>

              <div className="form-group">
                <label htmlFor="goal2">2 Year Goal:</label>
                <input
                  type="number"
                  id="goal2"
                  name="goal2"
                  value={formData.goal2 || ''}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="Target amount"
                />
              </div>

              <div className="form-group">
                <label htmlFor="goal3">3 Year Goal:</label>
                <input
                  type="number"
                  id="goal3"
                  name="goal3"
                  value={formData.goal3 || ''}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="Target amount"
                />
              </div>

              <div className="form-group">
                <label htmlFor="goal4">4 Year Goal:</label>
                <input
                  type="number"
                  id="goal4"
                  name="goal4"
                  value={formData.goal4 || ''}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="Target amount"
                />
              </div>

              <div className="form-group">
                <label htmlFor="goal5">5 Year Goal:</label>
                <input
                  type="number"
                  id="goal5"
                  name="goal5"
                  value={formData.goal5 || ''}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="Target amount"
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="sortOrder">Sort Order:</label>
            <input
              type="number"
              id="sortOrder"
              name="sortOrder"
              value={formData.sortOrder}
              onChange={handleInputChange}
              min="0"
              placeholder="0"
            />
            <small style={{ color: '#7f8c8d', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
              Lower numbers appear first in the list
            </small>
          </div>

          <div className="form-buttons">
            <button type="submit" disabled={loading} className="update-btn">
              {loading ? 'Updating...' : 'Update Account'}
            </button>
            <button type="button" onClick={onCancel} className="cancel-btn">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAccountForm;