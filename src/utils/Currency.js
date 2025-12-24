// Currency utility for managing currency across the app

export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
  { code: 'AFN', symbol: '؋', name: 'Afghan Afghani' },
];

export const DEFAULT_CURRENCY = 'USD';

export const getCurrencySymbol = (currencyCode) => {
  const currency = CURRENCIES.find(c => c.code === currencyCode);
  return currency ? currency.symbol : '$';
};

export const formatCurrency = (amount, currencyCode = DEFAULT_CURRENCY) => {
  const symbol = getCurrencySymbol(currencyCode);
  const num = parseFloat(amount) || 0;
  return `${symbol}${Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatCurrencyWithSign = (amount, currencyCode = DEFAULT_CURRENCY) => {
  const symbol = getCurrencySymbol(currencyCode);
  const num = parseFloat(amount) || 0;
  const sign = num < 0 ? '-' : '';
  return `${sign}${symbol}${Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

