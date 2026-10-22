/**
 * @fileoverview Comprehensive unit tests for StateManager.
 * Tests transaction CRUD, persistence fallbacks, validation, filter mutations,
 * pub/sub reactive dispatch, and JSON import/export mechanics.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { StateManager, DEFAULT_SEED_TRANSACTIONS } from '../js/state.js';

describe('State Engine: StateManager Initial State', () => {
  it('should initialize with default seed transactions when storage is absent', () => {
    const manager = new StateManager();
    const state = manager.getState();

    assert.equal(state.transactions.length, DEFAULT_SEED_TRANSACTIONS.length);
    assert.equal(state.transactions[0].id, DEFAULT_SEED_TRANSACTIONS[0].id);
    assert.deepEqual(state.filters, {
      type: 'all',
      category: 'all',
      searchQuery: '',
      fromDate: null,
      toDate: null
    });
  });

  it('should return a defensive clone from getState to prevent outside mutation', () => {
    const manager = new StateManager();
    const state1 = manager.getState();
    state1.transactions.length = 0;

    const state2 = manager.getState();
    assert.equal(state2.transactions.length, DEFAULT_SEED_TRANSACTIONS.length);
  });
});

describe('State Engine: addTransaction & deleteTransaction', () => {
  let manager;

  beforeEach(() => {
    manager = new StateManager();
  });

  it('should add a valid expense transaction and prepend to state', () => {
    const initialCount = manager.getState().transactions.length;
    const newTx = manager.addTransaction({
      description: 'Coffee Beans',
      amount: 18.50,
      type: 'expense',
      category: 'Groceries',
      date: '2026-03-22'
    });

    const state = manager.getState();
    assert.equal(state.transactions.length, initialCount + 1);
    assert.equal(state.transactions[0].id, newTx.id);
    assert.equal(state.transactions[0].description, 'Coffee Beans');
    assert.equal(state.transactions[0].amount, 18.50);
    assert.equal(state.transactions[0].type, 'expense');
  });

  it('should reject transactions with zero, negative, or invalid amounts', () => {
    assert.throws(() => {
      manager.addTransaction({ description: 'Free Item', amount: 0 });
    }, /Transaction amount must be a positive number/);

    assert.throws(() => {
      manager.addTransaction({ description: 'Invalid', amount: -50 });
    }, /Transaction amount must be a positive number/);

    assert.throws(() => {
      manager.addTransaction({ description: 'NaN amount', amount: 'abc' });
    }, /Transaction amount must be a positive number/);

    assert.throws(() => {
      manager.addTransaction(null);
    }, /Transaction data must be a valid object/);
  });

  it('should delete transaction by ID and return boolean status', () => {
    const stateBefore = manager.getState();
    const targetId = stateBefore.transactions[0].id;

    const deleted = manager.deleteTransaction(targetId);
    assert.equal(deleted, true);

    const stateAfter = manager.getState();
    assert.equal(stateAfter.transactions.length, stateBefore.transactions.length - 1);
    assert.ok(!stateAfter.transactions.some((tx) => tx.id === targetId));

    // Deleting nonexistent id returns false
    const deletedNonexistent = manager.deleteTransaction('fake_id_999');
    assert.equal(deletedNonexistent, false);
  });

  it('should clear all transactions via clearAll and restore with restoreDemoData', () => {
    manager.clearAll();
    assert.equal(manager.getState().transactions.length, 0);

    manager.restoreDemoData();
    assert.equal(manager.getState().transactions.length, DEFAULT_SEED_TRANSACTIONS.length);
  });
});

describe('State Engine: Filters', () => {
  it('should update partial filters and reset to defaults', () => {
    const manager = new StateManager();

    manager.setFilters({
      type: 'income',
      searchQuery: 'salary',
      fromDate: '2026-03-01',
      toDate: '2026-03-31'
    });

    const currentFilters = manager.getState().filters;
    assert.equal(currentFilters.type, 'income');
    assert.equal(currentFilters.searchQuery, 'salary');
    assert.equal(currentFilters.fromDate, '2026-03-01');
    assert.equal(currentFilters.toDate, '2026-03-31');

    manager.resetFilters();
    const resetFilters = manager.getState().filters;
    assert.equal(resetFilters.type, 'all');
    assert.equal(resetFilters.searchQuery, '');
    assert.equal(resetFilters.fromDate, null);
    assert.equal(resetFilters.toDate, null);
  });
});

describe('State Engine: Pub/Sub Listener Subscriptions', () => {
  it('should notify subscribers when state mutates and allow unsubscription', () => {
    const manager = new StateManager();
    let notificationCount = 0;
    let lastReceivedState = null;

    const unsubscribe = manager.subscribe((state) => {
      notificationCount++;
      lastReceivedState = state;
    });

    manager.addTransaction({
      description: 'Book purchase',
      amount: 25.00,
      type: 'expense',
      category: 'Education'
    });

    assert.equal(notificationCount, 1);
    assert.equal(lastReceivedState.transactions[0].description, 'Book purchase');

    // Unsubscribe and verify no further notifications trigger
    unsubscribe();
    manager.deleteTransaction(lastReceivedState.transactions[0].id);
    assert.equal(notificationCount, 1);
  });
});

describe('State Engine: JSON Export and Import', () => {
  let manager;

  beforeEach(() => {
    manager = new StateManager();
  });

  it('should export state to valid JSON string', () => {
    const jsonStr = manager.exportJSON();
    assert.ok(typeof jsonStr === 'string');

    const parsed = JSON.parse(jsonStr);
    assert.ok(Array.isArray(parsed));
    assert.equal(parsed.length, manager.getState().transactions.length);
  });

  it('should import a valid JSON transactions payload', () => {
    const mockData = [
      { id: 'import_1', description: 'Consulting Fee', amount: 800, type: 'income', category: 'Freelance', date: '2026-04-01' },
      { id: 'import_2', description: 'Server Hosting', amount: 45.5, type: 'expense', category: 'Utilities', date: '2026-04-02' }
    ];

    const count = manager.importJSON(JSON.stringify(mockData));
    assert.equal(count, 2);

    const state = manager.getState();
    assert.equal(state.transactions.length, 2);
    assert.equal(state.transactions[0].description, 'Consulting Fee');
    assert.equal(state.transactions[1].amount, 45.5);
  });

  it('should reject invalid or malformed import payloads', () => {
    assert.throws(() => {
      manager.importJSON('not valid json');
    });

    assert.throws(() => {
      manager.importJSON(JSON.stringify({ notAnArray: true }));
    }, /must be a JSON array/);

    assert.throws(() => {
      manager.importJSON(JSON.stringify([null]));
    }, /not a valid transaction object/);

    assert.throws(() => {
      manager.importJSON(JSON.stringify([{ description: 'Invalid', amount: 'abc' }]));
    }, /contains invalid amount/);
  });
});
