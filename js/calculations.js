/**
 * @fileoverview Pure calculation engine for the Personal Finance Tracker.
 * Implements all aggregate calculations, running ledger totals, and category breakdowns
 * strictly using Array.prototype.reduce() and Array.prototype.filter() in compliance
 * with functional programming principles and avoiding floating point inaccuracies.
 */

/**
 * Rounds a floating point numeric value to two decimal places (cents)
 * using Number.EPSILON to guard against standard IEEE-754 precision drift.
 *
 * @param {number} value - The raw numerical amount to round.
 * @returns {number} The rounded amount strictly to two decimal places.
 */
export const roundToCents = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return 0;
  }
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

/**
 * Calculates the aggregate sum of all income transactions.
 * Strictly chains Array.prototype.filter to isolate income entries
 * and Array.prototype.reduce to compute the accumulation.
 *
 * @param {Array<Object>} transactions - The collection of transaction records.
 * @returns {number} Total income rounded to two decimal places.
 */
export const calculateTotalIncome = (transactions = []) => {
  if (!Array.isArray(transactions)) return 0;

  return roundToCents(
    transactions
      .filter((tx) => tx && tx.type === 'income')
      .reduce((accumulator, tx) => accumulator + Number(tx.amount || 0), 0)
  );
};

/**
 * Calculates the aggregate sum of all expense transactions.
 * Strictly chains Array.prototype.filter to isolate expense entries
 * and Array.prototype.reduce to accumulate total expenditures.
 *
 * @param {Array<Object>} transactions - The collection of transaction records.
 * @returns {number} Total expenses rounded to two decimal places.
 */
export const calculateTotalExpenses = (transactions = []) => {
  if (!Array.isArray(transactions)) return 0;

  return roundToCents(
    transactions
      .filter((tx) => tx && tx.type === 'expense')
      .reduce((accumulator, tx) => accumulator + Number(tx.amount || 0), 0)
  );
};

/**
 * Calculates the overall net balance across all recorded transactions.
 * Employs Array.prototype.reduce directly with ternary directional summation
 * to ensure single-pass functional evaluation without mutable external variables.
 *
 * @param {Array<Object>} transactions - The collection of transaction records.
 * @returns {number} Net balance (Income minus Expenses) rounded to two decimal places.
 */
export const calculateNetBalance = (transactions = []) => {
  if (!Array.isArray(transactions)) return 0;

  return roundToCents(
    transactions.reduce((balance, tx) => {
      if (!tx) return balance;
      const amount = Number(tx.amount || 0);
      return tx.type === 'income' ? balance + amount : balance - amount;
    }, 0)
  );
};

/**
 * Computes a running cumulative balance for each transaction in chronological order.
 * Strictly utilizes Array.prototype.reduce to assemble the projected ledger,
 * referencing the previous cumulative total from the accumulator array.
 *
 * @param {Array<Object>} chronologicalTransactions - Transactions ordered from oldest to newest.
 * @returns {Array<Object>} New array of transactions augmented with `runningBalance` property.
 */
export const calculateRunningBalances = (chronologicalTransactions = []) => {
  if (!Array.isArray(chronologicalTransactions)) return [];

  return chronologicalTransactions.reduce((accumulatedLedger, tx) => {
    if (!tx) return accumulatedLedger;

    const previousBalance = accumulatedLedger.length > 0
      ? accumulatedLedger[accumulatedLedger.length - 1].runningBalance
      : 0;

    const delta = tx.type === 'income'
      ? Number(tx.amount || 0)
      : -Number(tx.amount || 0);

    const currentRunningBalance = roundToCents(previousBalance + delta);

    accumulatedLedger.push({
      ...tx,
      runningBalance: currentRunningBalance
    });

    return accumulatedLedger;
  }, []);
};

/**
 * Aggregates expenditures or earnings grouped by their respective categories.
 * Strictly uses Array.prototype.filter to isolate the target transaction type,
 * Array.prototype.reduce to accumulate category-level sums, and a secondary
 * reduce pipeline to format the output objects with exact percentages.
 *
 * @param {Array<Object>} transactions - The collection of transaction records.
 * @param {'expense' | 'income'} [targetType='expense'] - The category group type to evaluate.
 * @returns {Array<{category: string, amount: number, percentage: number}>} Grouped category breakdown.
 */
export const calculateCategoryTotals = (transactions = [], targetType = 'expense') => {
  if (!Array.isArray(transactions)) return [];

  // Filter transactions matching the specified type
  const typedTransactions = transactions.filter(
    (tx) => tx && tx.type === targetType
  );

  // Compute the total sum for the type using reduce
  const totalAmount = typedTransactions.reduce(
    (sum, tx) => sum + Number(tx.amount || 0),
    0
  );

  // Accumulate totals per category dictionary using reduce
  const categoryDictionary = typedTransactions.reduce((acc, tx) => {
    const categoryKey = (tx.category && String(tx.category).trim()) || 'uncategorized';
    const amount = Number(tx.amount || 0);
    acc[categoryKey] = roundToCents((acc[categoryKey] || 0) + amount);
    return acc;
  }, {});

  // Transform dictionary into an enriched array using reduce
  return Object.keys(categoryDictionary).reduce((breakdown, categoryKey) => {
    const amount = categoryDictionary[categoryKey];
    const percentage = totalAmount > 0
      ? roundToCents((amount / totalAmount) * 100)
      : 0;

    breakdown.push({
      category: categoryKey,
      amount,
      percentage
    });
    return breakdown;
  }, []).sort((a, b) => b.amount - a.amount);
};

/**
 * Calculates the personal savings rate percentage: ((Income - Expenses) / Income) * 100.
 * Utilizes calculateTotalIncome and calculateTotalExpenses which strictly execute
 * filter and reduce operations under the hood.
 *
 * @param {Array<Object>} transactions - The collection of transaction records.
 * @returns {number} Savings rate percentage (0 to 100+), bounded at 0 when expenses exceed income.
 */
export const calculateSavingsRate = (transactions = []) => {
  const totalIncome = calculateTotalIncome(transactions);
  const totalExpenses = calculateTotalExpenses(transactions);

  if (totalIncome <= 0) {
    return 0;
  }

  const rawRate = ((totalIncome - totalExpenses) / totalIncome) * 100;
  return roundToCents(Math.max(0, rawRate));
};

/**
 * Filters transaction records based on active query, type, category, and date criteria.
 * Exclusively leverages Array.prototype.filter with pure predicate evaluation.
 *
 * @param {Array<Object>} transactions - Source transaction collection.
 * @param {Object} criteria - Filter configuration object.
 * @param {'all' | 'income' | 'expense'} [criteria.type='all'] - Type filter.
 * @param {string} [criteria.category='all'] - Category ID filter.
 * @param {string} [criteria.searchQuery=''] - Case-insensitive text query.
 * @param {string|null} [criteria.fromDate=null] - Minimum transaction date (YYYY-MM-DD).
 * @param {string|null} [criteria.toDate=null] - Maximum transaction date (YYYY-MM-DD).
 * @returns {Array<Object>} Filtered subset of transactions.
 */
export const filterTransactions = (transactions = [], criteria = {}) => {
  if (!Array.isArray(transactions)) return [];

  const {
    type = 'all',
    category = 'all',
    searchQuery = '',
    fromDate = null,
    toDate = null
  } = criteria;

  const normalizedQuery = (searchQuery || '').trim().toLowerCase();

  return transactions.filter((tx) => {
    if (!tx) return false;

    // Filter by type
    if (type !== 'all' && tx.type !== type) {
      return false;
    }

    // Filter by category
    if (category !== 'all' && tx.category !== category) {
      return false;
    }

    // Filter by date range
    if (fromDate && tx.date < fromDate) {
      return false;
    }
    if (toDate && tx.date > toDate) {
      return false;
    }

    // Filter by text search query (memo or category or amount)
    if (normalizedQuery) {
      const matchDesc = tx.description && tx.description.toLowerCase().includes(normalizedQuery);
      const matchCat = tx.category && tx.category.toLowerCase().includes(normalizedQuery);
      const matchAmt = String(tx.amount).includes(normalizedQuery);
      if (!matchDesc && !matchCat && !matchAmt) {
        return false;
      }
    }

    return true;
  });
};
