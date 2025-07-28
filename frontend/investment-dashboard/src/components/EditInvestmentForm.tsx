import React, { useState } from 'react';
import type { Investment } from '../types/Investment';
import { Currency as CurrencyEnum, Category as CategoryEnum } from '../types/Investment';
import { investmentApi } from '../services/api';

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
    account: investment.account
  });
  
  console.log('EditForm initialized with:', formData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        account: formData.account
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
    }
    // Keep currency and category as strings - no conversion needed
    
    console.log(`EditForm ${name}: "${value}" -> ${processedValue} (${typeof processedValue})`);
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  return (
    <div className="modal-overlay">
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
              min="0"
              required
            />
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
              min="0"
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
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="account">Account:</label>
            <input
              type="text"
              id="account"
              name="account"
              value={formData.account}
              onChange={handleInputChange}
              maxLength={100}
              required
            />
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