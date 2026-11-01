import { useAuth } from '../contexts/AuthContext';
import { formatCurrency as formatAmount, getCurrencySymbol } from '../utils/currency';

export const useCurrency = () => {
  const { hotel } = useAuth();
  const currency = hotel?.currency || 'USD';

  return {
    currency,
    currencySymbol: getCurrencySymbol(currency),
    formatCurrency: (amount) => formatAmount(amount, currency)
  };
};
