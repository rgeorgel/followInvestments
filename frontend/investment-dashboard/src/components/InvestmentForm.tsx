import React, { useState } from 'react';
import type { CreateInvestmentRequest } from '../types/Investment';
import { Currency, Category } from '../types/Investment';
import { investmentApi } from '../services/api';

interface InvestmentFormProps {
  onSuccess: () => void;
}

const InvestmentForm: React.FC<InvestmentFormProps> = ({ onSuccess }) => {
  const [formData, setFormData] = useState<CreateInvestmentRequest>({
    name: '',
    value: 0,
    quantity: 0,
    currency: Currency.BRL,
    date: new Date().toISOString().split('T')[0],
    description: '',
    category: Category.Stocks,
    account: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await investmentApi.create(formData);
      setFormData({
        name: '',
        value: 0,
        quantity: 0,
        currency: Currency.BRL,
        date: new Date().toISOString().split('T')[0],
        description: '',
        category: Category.Stocks,
        account: ''
      });
      onSuccess();
    } catch (err) {
      setError('Failed to create investment');
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
    // Remove number conversion for currency and category - keep as strings
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  return (
    <div className="investment-form">
      <h2>Register New Investment</h2>
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
            <option value={Currency.BRL}>BRL (Brazil)</option>
            <option value={Currency.CAD}>CAD (Canada)</option>
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
            <option value={Category.RendaFixa}>Renda Fixa</option>
            <option value={Category.Stocks}>Stocks</option>
            <option value={Category.FIIs}>FIIs</option>
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

        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Investment'}
        </button>
      </form>
    </div>
  );
};

export default InvestmentForm;