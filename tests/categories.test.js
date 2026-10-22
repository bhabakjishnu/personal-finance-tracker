/**
 * @fileoverview Unit test suite for category metadata resolution and definitions.
 * Validates category lookup, case-insensitivity, type prioritization, and defensive fallbacks.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, getCategoryMeta } from '../js/categories.js';

describe('Categories: CATEGORIES definition', () => {
  it('should define income and expense category arrays with required fields', () => {
    assert.ok(Array.isArray(CATEGORIES.income));
    assert.ok(Array.isArray(CATEGORIES.expense));
    assert.ok(CATEGORIES.income.length > 0);
    assert.ok(CATEGORIES.expense.length > 0);

    for (const cat of [...CATEGORIES.income, ...CATEGORIES.expense]) {
      assert.ok(typeof cat.id === 'string' && cat.id.length > 0);
      assert.ok(typeof cat.label === 'string' && cat.label.length > 0);
      assert.ok(typeof cat.icon === 'string' && cat.icon.length > 0);
      assert.ok(typeof cat.color === 'string' && cat.color.startsWith('#'));
    }
  });
});

describe('Categories: getCategoryMeta', () => {
  it('should resolve known income categories by id', () => {
    const meta = getCategoryMeta('Salary', 'income');
    assert.equal(meta.id, 'Salary');
    assert.equal(meta.icon, '💼');
    assert.equal(meta.color, '#10b981');
  });

  it('should resolve known expense categories by id', () => {
    const meta = getCategoryMeta('Housing', 'expense');
    assert.equal(meta.id, 'Housing');
    assert.equal(meta.icon, '🏠');
    assert.equal(meta.color, '#6366f1');
  });

  it('should resolve categories case-insensitively', () => {
    const meta = getCategoryMeta('groceries');
    assert.equal(meta.id, 'Groceries');
    assert.equal(meta.icon, '🛒');
  });

  it('should prioritize specified type when searching', () => {
    const meta = getCategoryMeta('Investments', 'income');
    assert.equal(meta.id, 'Investments');
    assert.equal(meta.icon, '📈');
  });

  it('should return safe fallback metadata for unknown category', () => {
    const fallbackExpense = getCategoryMeta('Cryptocurrency', 'expense');
    assert.equal(fallbackExpense.id, 'Cryptocurrency');
    assert.equal(fallbackExpense.label, 'Cryptocurrency');
    assert.equal(fallbackExpense.icon, '🏷️');
    assert.equal(fallbackExpense.color, '#94a3b8');

    const fallbackIncome = getCategoryMeta('Royalties', 'income');
    assert.equal(fallbackIncome.id, 'Royalties');
    assert.equal(fallbackIncome.icon, '💰');
  });

  it('should handle null, undefined, or empty inputs gracefully without throwing', () => {
    const nullMeta = getCategoryMeta(null);
    assert.equal(nullMeta.id, 'Uncategorized');
    assert.equal(nullMeta.label, 'Uncategorized');

    const undefinedMeta = getCategoryMeta(undefined);
    assert.equal(undefinedMeta.id, 'Uncategorized');

    const emptyMeta = getCategoryMeta('');
    assert.equal(emptyMeta.id, 'Uncategorized');
  });
});
