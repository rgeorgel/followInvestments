import React, { useState, useEffect } from 'react';
import type { Investment } from '../types/Investment';
import type { Account } from '../types/Account';
import { Currency as CurrencyEnum, Category as CategoryEnum } from '../types/Investment';
import { investmentApi } from '../services/api';
import { accountApi } from '../services/accountApi';
import { useModal } from '../hooks/useModal';

interface EditInvestmentFormProps {
  investment: Investment;
  onSuccess: () => void;
  onCancel: () => void;
}

const EditInvestmentForm: React.FC<EditInvestmentFormProps> = ({ investment, onSuccess, onCancel }) => {
  console.log('EditForm received investment:', investment);
  console.log('Investment currency:', investment.currency, 'type:', typeof investment.currency);
  console.log('Investment category:', investment.category, 'type:', typeof investment.category);
  
  // Check if we need to convert from numbers to strings (backend might still be returning numbers)
  const getCurrencyString = (currency: any): string => {
    if (typeof currency === 'string') return currency;
    if (currency === 0) return 'BRL';
    if (currency === 1) return 'CAD';
    return 'BRL'; // default
  };
  
  const getCategoryString = (category: any): string => {
    if (typeof category === 'string') return category;
    if (category === 0) return 'RendaFixa';
    if (category === 1) return 'Stocks';
    if (category === 2) return 'FIIs';
    if (category === 3) return 'ETF';
    if (category === 4) return 'Bonds';
    if (category === 5) return 'ManagedPortfolio';
    if (category === 6) return 'Cash';
    if (category === 7) return 'ManagedPortfolioBlock';
    return 'Stocks'; // default
  };
  
  const [formData, setFormData] = useState({
    name: investment.name || '',
    value: Number(investment.value),
    quantity: Number(investment.quantity),
    currency: getCurrencyString(investment.currency),
    date: investment.date.split('T')[0],
    description: investment.description,
    category: getCategoryString(investment.category),
    accountId: investment.accountId
  });
  
  console.log('EditForm initialized with:', formData);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useModal(true, onCancel);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const accountData = await accountApi.getAll();
      setAccounts(accountData);
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    console.log('EditForm submitting with formData:', formData);

    try {
      // Keep currency and category as strings
      const updatedInvestment: Investment = {
        ...investment,
        name: formData.name,
        value: Number(formData.value),
        quantity: Number(formData.quantity),
        currency: formData.currency,
        date: formData.date,
        description: formData.description,
        category: formData.category,
        accountId: formData.accountId
      };
      console.log('EditForm final investment object:', updatedInvestment);
      await investmentApi.update(investment.id, updatedInvestment);
      onSuccess();
    } catch (err) {
      setError('Failed to update investment');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let processedValue: any = value;
    
    if (name === 'value' || name === 'quantity') {
      processedValue = parseFloat(value) || 0;
    } else if (name === 'accountId') {
      processedValue = parseInt(value) || 0;
    }
    // Keep currency and category as strings - no conversion needed
    
    console.log(`EditForm ${name}: "${value}" -> ${processedValue} (${typeof processedValue})`);
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  return (
    <div className="modal-overlay" ref={modalRef}>
      <div className="investment-form modal-content">
        <h2>Edit Investment</h2>
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Investment Name:</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              maxLength={200}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="value">Unit Value:</label>
            <input
              type="number"
              id="value"
              name="value"
              value={formData.value || ''}
              onChange={handleInputChange}
              step="0.01"
              required
            />
            <small className="form-help">Use positive values for investments, negative for withdrawals</small>
          </div>

          <div className="form-group">
            <label htmlFor="quantity">Quantity:</label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              value={formData.quantity || ''}
              onChange={handleInputChange}
              step="0.0001"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="currency">Currency:</label>
            <select
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={handleInputChange}
              required
            >
              <option value={CurrencyEnum.BRL}>BRL (Brazil)</option>
              <option value={CurrencyEnum.CAD}>CAD (Canada)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="date">Date:</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description:</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              maxLength={500}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="category">Category:</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              required
            >
              <option value={CategoryEnum.RendaFixa}>Renda Fixa</option>
              <option value={CategoryEnum.Stocks}>Stocks</option>
              <option value={CategoryEnum.FIIs}>FIIs</option>
              <option value={CategoryEnum.ETF}>ETF</option>
              <option value={CategoryEnum.Bonds}>Bonds</option>
              <option value={CategoryEnum.ManagedPortfolio}>Managed Portfolio</option>
              <option value={CategoryEnum.Cash}>Cash</option>
              <option value={CategoryEnum.ManagedPortfolioBlock}>Managed Portfolio - block</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="accountId">Account:</label>
            <select
              id="accountId"
              name="accountId"
              value={formData.accountId}
              onChange={handleInputChange}
              required
            >
              <option value={0} disabled>Select an account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            {accounts.length === 0 && (
              <p className="form-help-text">
                No accounts available. Please create an account first.
              </p>
            )}
          </div>

          <div className="form-buttons">
            <button type="submit" disabled={loading} className="update-btn">
              {loading ? 'Updating...' : 'Update Investment'}
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

export default EditInvestmentForm;