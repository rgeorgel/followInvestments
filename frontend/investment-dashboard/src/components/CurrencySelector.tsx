import React from 'react';

interface CurrencySelectorProps {
  selectedCurrency: string;
  onCurrencyChange: (currency: string) => void;
  availableCurrencies?: string[];
}

const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  selectedCurrency,
  onCurrencyChange,
  availableCurrencies = ['Original', 'USD', 'CAD', 'BRL']
}) => {
  return (
    <div className="currency-selector">
      <label htmlFor="currency-select">Display Currency:</label>
      <select
        id="currency-select"
        value={selectedCurrency}
        onChange={(e) => onCurrencyChange(e.target.value)}
        className="currency-select"
      >
        {availableCurrencies.map(currency => (
          <option key={currency} value={currency}>
            {currency}
          </option>
        ))}
      </select>
    </div>
  );
};

export default CurrencySelector;