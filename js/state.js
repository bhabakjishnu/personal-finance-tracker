/**
 * @fileoverview State management and LocalStorage synchronization module.
 * Provides central reactive state container, persistent storage bindings,
 * seed data for initial launch, and pub/sub event subscription for UI synchronization.
 */

import { roundToCents } from './calculations.js';

export const STORAGE_KEY = 'pft_transactions_v1';

/**
 * Default starter dataset to provide immediate visual context and demonstrate
 * running totals and ledger breakdowns on initial user visit.
 */
export const DEFAULT_SEED_TRANSACTIONS = [
  {
    id: 'tx_seed_1',
    description: 'Tech Lead Monthly Salary',
    amount: 6500.00,
    type: 'income',
    category: 'Salary',
    date: '2026-03-01',
    createdAt: 1772323200000
  },
  {
    id: 'tx_seed_2',
    description: 'Downtown Apartment Rent',
    amount: 1850.00,
    type: 'expense',
    category: 'Housing',
    date: '2026-03-02',
    createdAt: 1772409600000
  },
  {
    id: 'tx_seed_3',
    description: 'Organic Market & Weekly Groceries',
    amount: 220.45,
    type: 'expense',
    category: 'Groceries',
    date: '2026-03-05',
    createdAt: 1772668800000
  },
  {
    id: 'tx_seed_4',
    description: 'Freelance Design Consulting',
    amount: 1250.00,
    type: 'income',
    category: 'Freelance',
    date: '2026-03-10',
    createdAt: 1773100800000
  },
  {
    id: 'tx_seed_5',
    description: 'High-speed Fiber Internet & Electric Bill',
    amount: 145.30,
    type: 'expense',
    category: 'Utilities',
    date: '2026-03-12',
    createdAt: 1773273600000
  },
  {
    id: 'tx_seed_6',
    description: 'Team Dinner & Craft Cocktails',
    amount: 88.50,
    type: 'expense',
    category: 'Dining Out',
    date: '2026-03-15',
    createdAt: 1773532800000
  },
  {
    id: 'tx_seed_7',
    description: 'SaaS Cloud Subscriptions',
    amount: 49.99,
    type: 'expense',
    category: 'Education',
    date: '2026-03-18',
    createdAt: 1773792000000
  }
];

class StateManager {
  /**
   * Initializes the state manager instance and loads transactions from localStorage.
   */
  constructor() {
    /** @type {Array<Object>} */
    this.transactions = this.loadFromStorage();

    /** @type {Object} */
    this.filters = {
      type: 'all',
      category: 'all',
      searchQuery: '',
      fromDate: null,
      toDate: null
    };

    /** @type {{field: string, order: 'asc'|'desc'}} */
    this.sort = {
      field: 'date',
      order: 'desc'
    };

    /** @type {Set<Function>} */
    this.listeners = new Set();
  }

  /**
   * Loads transactions securely from browser localStorage.
   * Gracefully falls back to seed data if key is missing or corrupted.
   *
   * @returns {Array<Object>} Parsed and sanitized transactions list.
   */
  loadFromStorage() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return [...DEFAULT_SEED_TRANSACTIONS];
      }

      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // First-time visit: seed with realistic demo data
        this.saveToStorage(DEFAULT_SEED_TRANSACTIONS);
        return [...DEFAULT_SEED_TRANSACTIONS];
      }

      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.map((item) => ({
        id: String(item.id || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
        description: String(item.description || 'Untitled Transaction'),
        amount: roundToCents(Math.abs(Number(item.amount) || 0)),
        type: item.type === 'income' ? 'income' : 'expense',
        category: String(item.category || 'Other'),
        date: String(item.date || new Date().toISOString().split('T')[0]),
        createdAt: Number(item.createdAt) || Date.now()
      }));
    } catch (err) {
      console.warn('Failed to parse transactions from localStorage; utilizing fallback:', err);
      return [...DEFAULT_SEED_TRANSACTIONS];
    }
  }

  /**
   * Writes the transactions array to localStorage.
   *
   * @param {Array<Object>} data - Transactions array to persist.
   */
  saveToStorage(data) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch (err) {
      console.error('LocalStorage persistence failure:', err);
    }
  }

  /**
   * Subscribes a listener callback to state changes.
   *
   * @param {Function} callback - Function triggered on state mutation.
   * @returns {Function} Unsubscribe teardown function.
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Dispatches current state to all subscribed listeners.
   */
  notify() {
    this.listeners.forEach((callback) => {
      try {
        callback(this.getState());
      } catch (err) {
        console.error('State listener error:', err);
      }
    });
  }

  /**
   * Retrieves an immutable copy of the current state snapshot.
   *
   * @returns {{transactions: Array<Object>, filters: Object, sort: Object}}
   */
  getState() {
    return {
      transactions: [...this.transactions],
      filters: { ...this.filters },
      sort: { ...this.sort }
    };
  }

  /**
   * Adds a new validated transaction to the state and persists to storage.
   *
   * @param {Object} txData - Raw transaction input data.
   * @returns {Object} Newly created transaction object.
   */
  addTransaction(txData) {
    const amount = roundToCents(Math.abs(Number(txData.amount)));
    if (!amount || amount <= 0) {
      throw new Error('Transaction amount must be a positive number greater than 0.');
    }

    const newTx = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      description: String(txData.description || '').trim() || 'Untitled',
      amount,
      type: txData.type === 'income' ? 'income' : 'expense',
      category: String(txData.category || 'Other').trim(),
      date: txData.date || new Date().toISOString().split('T')[0],
      createdAt: Date.now()
    };

    this.transactions = [newTx, ...this.transactions];
    this.saveToStorage(this.transactions);
    this.notify();
    return newTx;
  }

  /**
   * Deletes a transaction by its unique ID.
   *
   * @param {string} id - Transaction identifier.
   * @returns {boolean} True if found and removed, false otherwise.
   */
  deleteTransaction(id) {
    const initialLength = this.transactions.length;
    this.transactions = this.transactions.filter((tx) => tx.id !== id);

    if (this.transactions.length !== initialLength) {
      this.saveToStorage(this.transactions);
      this.notify();
      return true;
    }
    return false;
  }

  /**
   * Clears all transactions and empties localStorage.
   */
  clearAll() {
    this.transactions = [];
    this.saveToStorage(this.transactions);
    this.notify();
  }

  /**
   * Restores default demonstration transactions.
   */
  restoreDemoData() {
    this.transactions = [...DEFAULT_SEED_TRANSACTIONS];
    this.saveToStorage(this.transactions);
    this.notify();
  }

  /**
   * Updates filter parameters and alerts listeners.
   *
   * @param {Object} partialFilters - Filter attributes to update.
   */
  setFilters(partialFilters) {
    this.filters = {
      ...this.filters,
      ...partialFilters
    };
    this.notify();
  }

  /**
   * Resets active filters to default settings.
   */
  resetFilters() {
    this.filters = {
      type: 'all',
      category: 'all',
      searchQuery: '',
      fromDate: null,
      toDate: null
    };
    this.notify();
  }

  /**
   * Exports the current transaction dataset as formatted JSON string.
   *
   * @returns {string} Formatted JSON representation.
   */
  exportJSON() {
    return JSON.stringify(this.transactions, null, 2);
  }

  /**
   * Validates and imports a JSON array of transactions.
   *
   * @param {string} jsonString - Raw JSON payload.
   * @returns {number} Number of imported transactions.
   */
  importJSON(jsonString) {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      throw new Error('Import payload must be a JSON array of transactions.');
    }

    const validated = parsed.map((item, idx) => {
      const amount = roundToCents(Math.abs(Number(item.amount)));
      if (!amount || amount <= 0) {
        throw new Error(`Record at index ${idx} contains invalid amount.`);
      }
      return {
        id: String(item.id || `tx_${Date.now()}_${idx}`),
        description: String(item.description || 'Imported Transaction'),
        amount,
        type: item.type === 'income' ? 'income' : 'expense',
        category: String(item.category || 'Other'),
        date: String(item.date || new Date().toISOString().split('T')[0]),
        createdAt: Number(item.createdAt) || Date.now()
      };
    });

    this.transactions = validated;
    this.saveToStorage(this.transactions);
    this.notify();
    return validated.length;
  }
}

export const state = new StateManager();
