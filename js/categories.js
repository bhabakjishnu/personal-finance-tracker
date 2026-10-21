/**
 * @fileoverview Category definitions and visual metadata for personal-finance-tracker.
 * Provides curated icons, badge colors, and category lists for both income and expense types.
 */

export const CATEGORIES = {
  income: [
    { id: 'Salary', label: 'Salary & Wages', icon: '💼', color: '#10b981' },
    { id: 'Freelance', label: 'Freelance & Consulting', icon: '💻', color: '#06b6d4' },
    { id: 'Investments', label: 'Investments & Dividends', icon: '📈', color: '#8b5cf6' },
    { id: 'Gifts', label: 'Gifts & Grants', icon: '🎁', color: '#ec4899' },
    { id: 'Rental', label: 'Rental Income', icon: '🏠', color: '#3b82f6' },
    { id: 'Other Income', label: 'Other Income', icon: '💵', color: '#14b8a6' }
  ],
  expense: [
    { id: 'Housing', label: 'Housing & Rent', icon: '🏠', color: '#6366f1' },
    { id: 'Groceries', label: 'Groceries & Supplies', icon: '🛒', color: '#f59e0b' },
    { id: 'Dining Out', label: 'Dining Out & Cafes', icon: '🍔', color: '#f97316' },
    { id: 'Transportation', label: 'Transit & Fuel', icon: '🚗', color: '#0ea5e9' },
    { id: 'Utilities', label: 'Bills & Utilities', icon: '⚡', color: '#eab308' },
    { id: 'Entertainment', label: 'Entertainment & Fun', icon: '🎬', color: '#a855f7' },
    { id: 'Healthcare', label: 'Health & Medical', icon: '🩺', color: '#ef4444' },
    { id: 'Shopping', label: 'Shopping & Gear', icon: '🛍️', color: '#ec4899' },
    { id: 'Education', label: 'Education & Courses', icon: '📚', color: '#14b8a6' },
    { id: 'Other Expense', label: 'Other Expense', icon: '📦', color: '#64748b' }
  ]
};

/**
 * Retrieves the category metadata object by category ID.
 *
 * @param {string} categoryId - The category ID or label.
 * @param {'income' | 'expense'} [type] - Optional type hint.
 * @returns {{id: string, label: string, icon: string, color: string}} Category metadata or fallback.
 */
export const getCategoryMeta = (categoryId, type) => {
  const allCategories = [...CATEGORIES.income, ...CATEGORIES.expense];
  const found = allCategories.find(
    (cat) => cat.id.toLowerCase() === String(categoryId).toLowerCase()
  );

  if (found) return found;

  return {
    id: categoryId || 'Uncategorized',
    label: categoryId || 'Uncategorized',
    icon: type === 'income' ? '💰' : '🏷️',
    color: '#94a3b8'
  };
};
