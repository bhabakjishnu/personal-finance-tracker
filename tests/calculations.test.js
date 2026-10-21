/**
 * @fileoverview Comprehensive unit test suite for the calculations engine.
 * Validates aggregate arithmetic, running ledger balance calculation,
 * category breakdowns, savings rate, and edge cases (IEEE 754 floats, empty arrays, null values).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  roundToCents,
  calculateTotalIncome,
  calculateTotalExpenses,
  calculateNetBalance,
  calculateRunningBalances,
  calculateCategoryTotals,
  calculateSavingsRate,
  filterTransactions
} from '../js/calculations.js';

describe('Calculations Engine: roundToCents', () => {
  it('should round numbers to 2 decimal places with precision protection', () => {
    assert.equal(roundToCents(10.555), 10.56);
    assert.equal(roundToCents(0.1 + 0.2), 0.3);
    assert.equal(roundToCents(1234.5), 1234.5);
    assert.equal(roundToCents(0), 0);
  });

  it('should handle non-finite or invalid numbers safely', () => {
    assert.equal(roundToCents(NaN), 0);
    assert.equal(roundToCents(Infinity), 0);
    assert.equal(roundToCents(null), 0);
    assert.equal(roundToCents('123'), 0);
  });
});

describe('Calculations Engine: calculateTotalIncome', () => {
  it('should return 0 for an empty array or non-array', () => {
    assert.equal(calculateTotalIncome([]), 0);
    assert.equal(calculateTotalIncome(null), 0);
    assert.equal(calculateTotalIncome(undefined), 0);
  });

  it('should aggregate only income transactions using filter and reduce', () => {
    const transactions = [
      { id: '1', type: 'income', amount: 5000 },
      { id: '2', type: 'expense', amount: 1200 },
      { id: '3', type: 'income', amount: 750.25 },
      { id: '4', type: 'expense', amount: 300.5 }
    ];
    assert.equal(calculateTotalIncome(transactions), 5750.25);
  });

  it('should handle decimal precision correctly without floating point drift', () => {
    const transactions = [
      { id: '1', type: 'income', amount: 0.1 },
      { id: '2', type: 'income', amount: 0.2 }
    ];
    assert.equal(calculateTotalIncome(transactions), 0.3);
  });
});

describe('Calculations Engine: calculateTotalExpenses', () => {
  it('should return 0 for an empty array', () => {
    assert.equal(calculateTotalExpenses([]), 0);
  });

  it('should aggregate only expense transactions', () => {
    const transactions = [
      { id: '1', type: 'income', amount: 5000 },
      { id: '2', type: 'expense', amount: 1200.5 },
      { id: '3', type: 'expense', amount: 300.25 }
    ];
    assert.equal(calculateTotalExpenses(transactions), 1500.75);
  });
});

describe('Calculations Engine: calculateNetBalance', () => {
  it('should compute positive net balance accurately', () => {
    const transactions = [
      { id: '1', type: 'income', amount: 3000 },
      { id: '2', type: 'expense', amount: 1000 },
      { id: '3', type: 'expense', amount: 450.75 }
    ];
    assert.equal(calculateNetBalance(transactions), 1549.25);
  });

  it('should compute negative net balance when expenses exceed income', () => {
    const transactions = [
      { id: '1', type: 'income', amount: 500 },
      { id: '2', type: 'expense', amount: 1500 }
    ];
    assert.equal(calculateNetBalance(transactions), -1000);
  });

  it('should return 0 when income equals expenses', () => {
    const transactions = [
      { id: '1', type: 'income', amount: 250 },
      { id: '2', type: 'expense', amount: 250 }
    ];
    assert.equal(calculateNetBalance(transactions), 0);
  });
});

describe('Calculations Engine: calculateRunningBalances', () => {
  it('should calculate sequential cumulative balances using reduce', () => {
    const transactions = [
      { id: '1', type: 'income', amount: 1000, date: '2026-01-01' },
      { id: '2', type: 'expense', amount: 250, date: '2026-01-02' },
      { id: '3', type: 'expense', amount: 150.5, date: '2026-01-03' },
      { id: '4', type: 'income', amount: 500, date: '2026-01-04' }
    ];

    const result = calculateRunningBalances(transactions);
    assert.equal(result.length, 4);
    assert.equal(result[0].runningBalance, 1000);
    assert.equal(result[1].runningBalance, 750);
    assert.equal(result[2].runningBalance, 599.5);
    assert.equal(result[3].runningBalance, 1099.5);
  });

  it('should return an empty array for empty inputs', () => {
    assert.deepEqual(calculateRunningBalances([]), []);
  });
});

describe('Calculations Engine: calculateCategoryTotals', () => {
  it('should group expenses by category and compute accurate percentages', () => {
    const transactions = [
      { id: '1', type: 'expense', category: 'Housing', amount: 1000 },
      { id: '2', type: 'expense', category: 'Groceries', amount: 500 },
      { id: '3', type: 'expense', category: 'Housing', amount: 500 },
      { id: '4', type: 'income', category: 'Salary', amount: 5000 }
    ];

    const breakdown = calculateCategoryTotals(transactions, 'expense');
    assert.equal(breakdown.length, 2);

    // Total expense is 2000. Housing is 1500 (75%), Groceries is 500 (25%)
    assert.equal(breakdown[0].category, 'Housing');
    assert.equal(breakdown[0].amount, 1500);
    assert.equal(breakdown[0].percentage, 75);

    assert.equal(breakdown[1].category, 'Groceries');
    assert.equal(breakdown[1].amount, 500);
    assert.equal(breakdown[1].percentage, 25);
  });

  it('should return empty list when no transactions match the type', () => {
    const transactions = [{ id: '1', type: 'income', category: 'Salary', amount: 3000 }];
    const breakdown = calculateCategoryTotals(transactions, 'expense');
    assert.deepEqual(breakdown, []);
  });
});

describe('Calculations Engine: calculateSavingsRate', () => {
  it('should calculate savings rate correctly', () => {
    const transactions = [
      { id: '1', type: 'income', amount: 10000 },
      { id: '2', type: 'expense', amount: 3000 }
    ];
    // (10000 - 3000) / 10000 * 100 = 70%
    assert.equal(calculateSavingsRate(transactions), 70);
  });

  it('should return 0 when income is 0', () => {
    const transactions = [{ id: '1', type: 'expense', amount: 500 }];
    assert.equal(calculateSavingsRate(transactions), 0);
  });

  it('should return 0 when expenses exceed income', () => {
    const transactions = [
      { id: '1', type: 'income', amount: 1000 },
      { id: '2', type: 'expense', amount: 1500 }
    ];
    assert.equal(calculateSavingsRate(transactions), 0);
  });
});

describe('Calculations Engine: filterTransactions', () => {
  const transactions = [
    { id: '1', type: 'income', category: 'Salary', amount: 4000, description: 'Monthly paycheck', date: '2026-03-01' },
    { id: '2', type: 'expense', category: 'Groceries', amount: 150, description: 'Supermarket weekly run', date: '2026-03-05' },
    { id: '3', type: 'expense', category: 'Dining Out', amount: 65, description: 'Sushi dinner', date: '2026-03-12' },
    { id: '4', type: 'income', category: 'Freelance', amount: 800, description: 'Website redesign', date: '2026-03-20' }
  ];

  it('should filter by type', () => {
    const expenses = filterTransactions(transactions, { type: 'expense' });
    assert.equal(expenses.length, 2);
    assert.ok(expenses.every((tx) => tx.type === 'expense'));
  });

  it('should filter by category', () => {
    const results = filterTransactions(transactions, { category: 'Groceries' });
    assert.equal(results.length, 1);
    assert.equal(results[0].category, 'Groceries');
  });

  it('should filter by text query in description', () => {
    const results = filterTransactions(transactions, { searchQuery: 'sushi' });
    assert.equal(results.length, 1);
    assert.equal(results[0].id, '3');
  });

  it('should filter by date range', () => {
    const results = filterTransactions(transactions, {
      fromDate: '2026-03-02',
      toDate: '2026-03-15'
    });
    assert.equal(results.length, 2);
    assert.deepEqual(results.map((r) => r.id), ['2', '3']);
  });
});
